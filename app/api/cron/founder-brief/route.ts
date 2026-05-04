import { NextRequest, NextResponse } from 'next/server';
import { getLatestNotTheRugBrief } from '@/lib/not-the-rug-brief/server';
import { founderDailyBriefEmail } from '@/lib/email/founder-brief-template';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

async function handle(req: NextRequest): Promise<NextResponse> {
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
      to: getFounderEmail(),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (result.error) {
      console.error('[cron:founder-brief] send failed', result.error);
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }

    console.log('[cron:founder-brief] sent', result.data?.id);
    return NextResponse.json({ ok: true, emailId: result.data?.id, subject: mail.subject });
  } catch (err) {
    console.error('[cron:founder-brief] error', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Founder brief send failed' },
      { status: 500 },
    );
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
