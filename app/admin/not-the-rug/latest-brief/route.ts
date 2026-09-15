import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { getLatestNotTheRugBrief } from '@/lib/not-the-rug-brief/read';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return errorResponse(error);
  }

  try {
    const latest = await getLatestNotTheRugBrief();
    return NextResponse.json(latest);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Latest brief load failed' },
      { status: 500 },
    );
  }
}
