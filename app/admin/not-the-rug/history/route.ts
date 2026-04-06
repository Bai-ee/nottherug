import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { getNotTheRugBriefHistory } from '@/lib/not-the-rug-brief/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 },
    );
  }

  const { searchParams } = req.nextUrl;
  const limitParam = Number(searchParams.get('limit') ?? '20');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 20;

  const history = await getNotTheRugBriefHistory(limit);
  return NextResponse.json({ runs: history });
}
