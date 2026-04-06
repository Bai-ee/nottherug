import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { runNotTheRugBrief } from '@/lib/not-the-rug-brief/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 },
    );
  }

  let fresh = false;
  try {
    const body = await req.json();
    fresh = Boolean(body?.fresh);
  } catch {
    fresh = false;
  }

  try {
    const result = await runNotTheRugBrief({ fresh });
    const status = result.status === 'success' ? 200 : 500;
    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Brief run failed' },
      { status: 500 },
    );
  }
}
