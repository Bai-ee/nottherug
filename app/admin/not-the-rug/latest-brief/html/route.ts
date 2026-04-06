import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { getLatestNotTheRugBriefHtml } from '@/lib/not-the-rug-brief/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Unauthorized', { status: 401 });
  }

  try {
    const { html } = await getLatestNotTheRugBriefHtml();
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Latest HTML brief not found', { status: 404 });
  }
}
