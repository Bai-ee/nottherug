import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEquals } from '@/lib/server/errors';
import { getLatestNotTheRugBrief } from '@/lib/not-the-rug-brief/read';
import { founderDailyBriefEmail } from '@/lib/email/founder-brief-template';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { claimDailySend, recordSendOutcome, todayKeyET } from '@/app/api/cron/_lib/sendGuard';

// This route only emails the brief. It does not generate one — the daily
// generation cron (/api/cron/not-the-rug-brief) is a separate, unrelated
// schedule. Do not describe this as "the daily brief system" on its own.
export const runtime = 'nodejs';
export const maxDuration = 30;

const SEND_KIND = 'founder-brief';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  return authHeader !== null && timingSafeEquals(authHeader, `Bearer ${secret}`);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const recipient = getFounderEmail();
  const day = todayKeyET();

  let claimed: boolean;
  try {
    claimed = await claimDailySend(SEND_KIND, recipient, day);
  } catch (err) {
    console.error('[cron:founder-brief] idempotency check failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Idempotency check failed' },
      { status: 500 },
    );
  }

  if (!claimed) {
    console.log(`[cron:founder-brief] already sent for ${day} to ${recipient}; skipping duplicate trigger`);
    return NextResponse.json({ ok: true, skipped: true, reason: 'Already sent today', day });
  }

  try {
    const base = process.env.PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const brief = await getLatestNotTheRugBrief();
    const mail = founderDailyBriefEmail({
      brief,
      generatedAt: new Date().toISOString(),
      dashboardUrl: `${base}/admin/dashboard`,
      briefUrl: `${base}/admin/dashboard`,
      leadsUrl: `${base}/admin/dashboard/leads`,
    });

    const resend = getResend();
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: recipient,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (result.error) {
      console.error('[cron:founder-brief] send failed', result.error);
      await recordSendOutcome(SEND_KIND, recipient, day, { status: 'failed', error: result.error.message });
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }

    console.log('[cron:founder-brief] sent', result.data?.id);
    await recordSendOutcome(SEND_KIND, recipient, day, { status: 'sent', emailId: result.data?.id });
    return NextResponse.json({ ok: true, emailId: result.data?.id, subject: mail.subject });
  } catch (err) {
    console.error('[cron:founder-brief] error', err);
    const message = err instanceof Error ? err.message : 'Founder brief send failed';
    await recordSendOutcome(SEND_KIND, recipient, day, { status: 'failed', error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return handle(req);
}
