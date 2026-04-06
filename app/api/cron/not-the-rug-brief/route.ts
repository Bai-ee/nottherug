import { NextRequest, NextResponse } from 'next/server';
import { runNotTheRugBrief } from '@/lib/not-the-rug-brief/server';

export const runtime = 'nodejs';

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  const result = await runNotTheRugBrief({ fresh: false });
  const status = result.status === 'success' ? 200 : 500;
  return NextResponse.json(result, { status });
}
