import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { runNotTheRugBrief, getLatestNotTheRugBrief } from '@/lib/not-the-rug-brief/server';
import { founderDailyBriefEmail } from '@/lib/email/founder-brief-template';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';

export const runtime = 'nodejs';
// Vercel Hobby caps function duration at 60s. The brief pipeline can exceed that,
// so the "Run brief + send" path is best-effort — on timeout, the daily cron still handles it.
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 },
    );
  }

  // Allow caller to skip the brief regeneration via ?skipRun=1
  const skipRun = req.nextUrl.searchParams.get('skipRun') === '1';

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
      to: getFounderEmail(),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (sendResult.error) {
      return NextResponse.json(
        { ok: false, runStatus, runError, sendError: sendResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      runStatus,
      runError,
      emailId: sendResult.data?.id,
      subject: mail.subject,
      sentTo: getFounderEmail(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, runStatus, runError, error: err instanceof Error ? err.message : 'Send failed' },
      { status: 500 },
    );
  }
}
