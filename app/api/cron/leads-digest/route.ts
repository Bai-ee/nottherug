import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEquals } from '@/lib/server/errors';
import { getLeadStats } from '@/lib/leads/stats';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { dailyLeadsDigestEmail } from '@/lib/email/digest-template';
import { claimDailySend, recordSendOutcome, todayKeyET } from '@/app/api/cron/_lib/sendGuard';

// Not scheduled in vercel.json today — see the P3B report. The working
// default is one founder digest (founder-brief) after a successful
// generation; enabling this one too would be a second, separate email for
// the same audience, which the plan calls out to avoid without an explicit
// decision to run both.
export const runtime = 'nodejs';
export const maxDuration = 30;

const SEND_KIND = 'leads-digest';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  return authHeader !== null && timingSafeEquals(authHeader, `Bearer ${secret}`);
}

async function handle(): Promise<NextResponse> {
  const recipient = getFounderEmail();
  const day = todayKeyET();

  let claimed: boolean;
  try {
    claimed = await claimDailySend(SEND_KIND, recipient, day);
  } catch (err) {
    console.error('[cron:leads-digest] idempotency check failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Idempotency check failed' },
      { status: 500 },
    );
  }

  if (!claimed) {
    console.log(`[cron:leads-digest] already sent for ${day} to ${recipient}; skipping duplicate trigger`);
    return NextResponse.json({ ok: true, skipped: true, reason: 'Already sent today', day });
  }

  try {
    const stats = await getLeadStats(30);
    const mail = dailyLeadsDigestEmail(stats);

    const resend = getResend();
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: recipient,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (result.error) {
      console.error('[cron:leads-digest] send failed', result.error);
      await recordSendOutcome(SEND_KIND, recipient, day, { status: 'failed', error: result.error.message });
      return NextResponse.json({ ok: false, error: result.error.message, stats }, { status: 500 });
    }

    console.log('[cron:leads-digest] sent', result.data?.id, 'yesterday=', stats.yesterday.count);
    await recordSendOutcome(SEND_KIND, recipient, day, { status: 'sent', emailId: result.data?.id });
    return NextResponse.json({ ok: true, emailId: result.data?.id, stats });
  } catch (err) {
    console.error('[cron:leads-digest] error', err);
    const message = err instanceof Error ? err.message : 'Digest run failed';
    await recordSendOutcome(SEND_KIND, recipient, day, { status: 'failed', error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return handle();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return handle();
}
