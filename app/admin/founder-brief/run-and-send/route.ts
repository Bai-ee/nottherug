import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { runNotTheRugBrief } from '@/lib/not-the-rug-brief/run';
import { getLatestNotTheRugBrief } from '@/lib/not-the-rug-brief/read';
import { founderDailyBriefEmail } from '@/lib/email/founder-brief-template';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { claimDailySend, recordSendOutcome, todayKeyET } from '@/app/api/cron/_lib/sendGuard';

export const runtime = 'nodejs';
// Measured duration is not yet proven to fit under this ceiling for a real
// (non-fixture) run — see the P3B report. This route is an admin-triggered,
// best-effort action, not the scheduled path.
export const maxDuration = 60;

const SEND_KIND = 'founder-brief';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return errorResponse(error);
  }

  // Allow caller to skip the brief regeneration via ?skipRun=1
  const skipRun = req.nextUrl.searchParams.get('skipRun') === '1';
  // Explicit admin override to resend even if today's automated send already claimed the slot.
  const force = req.nextUrl.searchParams.get('force') === '1';

  let runStatus: 'success' | 'error' | 'skipped' = 'skipped';
  let runError: string | undefined;
  if (!skipRun) {
    try {
      const result = await runNotTheRugBrief({ fresh: false });
      runStatus = result.status;
      runError = result.error;
    } catch (err) {
      runStatus = 'error';
      runError = err instanceof Error ? err.message : 'Brief run failed';
    }
  }

  const recipient = getFounderEmail();
  const day = todayKeyET();

  if (!force) {
    const claimed = await claimDailySend(SEND_KIND, recipient, day).catch((err) => {
      console.error('[founder-brief:run-and-send] idempotency check failed', err);
      return true; // don't block a manual admin action on a claim-check failure
    });
    if (!claimed) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Founder brief already sent today. Pass ?force=1 to resend.',
        runStatus,
        runError,
        day,
      });
    }
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
    const sendResult = await resend.emails.send({
      from: getFromAddress(),
      to: recipient,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (sendResult.error) {
      await recordSendOutcome(SEND_KIND, recipient, day, { status: 'failed', error: sendResult.error.message });
      return NextResponse.json(
        { ok: false, runStatus, runError, sendError: sendResult.error.message },
        { status: 500 },
      );
    }

    await recordSendOutcome(SEND_KIND, recipient, day, { status: 'sent', emailId: sendResult.data?.id });
    return NextResponse.json({
      ok: true,
      runStatus,
      runError,
      emailId: sendResult.data?.id,
      subject: mail.subject,
      sentTo: recipient,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    await recordSendOutcome(SEND_KIND, recipient, day, { status: 'failed', error: message });
    return NextResponse.json({ ok: false, runStatus, runError, error: message }, { status: 500 });
  }
}
