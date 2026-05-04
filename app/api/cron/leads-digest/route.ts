import { NextRequest, NextResponse } from 'next/server';
import { getLeadStats } from '@/lib/leads/stats';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { dailyLeadsDigestEmail } from '@/lib/email/digest-template';

export const runtime = 'nodejs';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

async function handle(): Promise<NextResponse> {
  try {
    const stats = await getLeadStats(30);
    const mail = dailyLeadsDigestEmail(stats);

    const resend = getResend();
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: getFounderEmail(),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (result.error) {
      console.error('[cron:leads-digest] send failed', result.error);
      return NextResponse.json({ ok: false, error: result.error.message, stats }, { status: 500 });
    }

    console.log('[cron:leads-digest] sent', result.data?.id, 'yesterday=', stats.yesterday.count);
    return NextResponse.json({ ok: true, emailId: result.data?.id, stats });
  } catch (err) {
    console.error('[cron:leads-digest] error', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Digest run failed' },
      { status: 500 },
    );
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
