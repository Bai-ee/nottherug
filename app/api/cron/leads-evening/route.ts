import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEquals } from '@/lib/server/errors';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { withBookingNotifyCopy } from '@/lib/email/bookingRecipients';
import { loadEveningReport } from '@/lib/leads/eveningReport';
import { eveningReportEmail } from '@/lib/email/evening-report-template';
import { notifyHitloopReport } from '@/lib/server/hitloopNotify';
import { claimDailySend, recordSendOutcome, todayKeyET } from '@/app/api/cron/_lib/sendGuard';

/**
 * Evening lead report, 6:58 PM New York time: every lead of the last 24 hours
 * plus the running list of email-only signups, so no lead is only on the
 * dashboard. Each send also posts "NTR - Lead report emailed" to HITLOOP's
 * Telegram.
 *
 * - GET (Vercel cron, Bearer CRON_SECRET): the daily send to the founder and
 *   admin inbox. Off until LEADS_EVENING_ENABLED=1. Scheduled at both 22:58 and
 *   23:58 UTC so one of them is 6:58 PM whatever the daylight-saving offset;
 *   only the one that lands in the 6 PM hour sends, once per day.
 * - POST ?test=1 (Bearer CRON_SECRET or HITLOOP_LEAD_ALERT_SECRET, the secret
 *   already shared with HITLOOP): a test send to the founder only, any time,
 *   marked [TEST]. It can never reach the admin inbox or anyone else.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const SEND_KIND = 'leads-evening';

function bearerMatches(req: NextRequest, ...envNames: string[]): boolean {
  const header = req.headers.get('authorization');
  if (!header) return false;
  return envNames.some((name) => {
    const secret = process.env[name]?.trim();
    return Boolean(secret) && timingSafeEquals(header, `Bearer ${secret}`);
  });
}

function hourInNewYork(date: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(date));
}

async function send(to: string | string[], test: boolean) {
  const report = await loadEveningReport();
  const mail = eveningReportEmail(report, { test });
  const result = await getResend().emails.send({ from: getFromAddress(), to, subject: mail.subject, html: mail.html, text: mail.text });
  if (result.error) return { ok: false as const, error: result.error.message };
  const telegram = await notifyHitloopReport({ todayCount: report.recent.length, emailOnlyCount: report.emailOnly.length, test });
  return { ok: true as const, emailId: result.data?.id, recent: report.recent.length, emailOnly: report.emailOnly.length, telegram };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!bearerMatches(req, 'CRON_SECRET')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (process.env.LEADS_EVENING_ENABLED !== '1') return NextResponse.json({ ok: true, skipped: true, reason: 'Not enabled' });
  if (hourInNewYork(new Date()) !== 18) return NextResponse.json({ ok: true, skipped: true, reason: 'Outside the 6 PM hour' });

  const to = withBookingNotifyCopy(getFounderEmail());
  const key = Array.isArray(to) ? to.join(',') : to;
  const day = todayKeyET();
  try {
    if (!(await claimDailySend(SEND_KIND, key, day))) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Already sent today', day });
    }
  } catch (err) {
    console.error('[cron:leads-evening] idempotency check failed', err);
    return NextResponse.json({ ok: false, error: 'Idempotency check failed' }, { status: 500 });
  }

  try {
    const r = await send(to, false);
    await recordSendOutcome(SEND_KIND, key, day, r.ok ? { status: 'sent', emailId: r.emailId } : { status: 'failed', error: r.error });
    if (!r.ok) console.error('[cron:leads-evening] send failed', r.error);
    return NextResponse.json(r, { status: r.ok ? 200 : 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Report failed';
    console.error('[cron:leads-evening] error', message);
    await recordSendOutcome(SEND_KIND, key, day, { status: 'failed', error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!bearerMatches(req, 'CRON_SECRET', 'HITLOOP_LEAD_ALERT_SECRET')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (req.nextUrl.searchParams.get('test') !== '1') return NextResponse.json({ error: 'Only ?test=1 is accepted' }, { status: 400 });
  try {
    const r = await send(getFounderEmail(), true);
    return NextResponse.json(r, { status: r.ok ? 200 : 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Report failed';
    console.error('[cron:leads-evening] test error', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
