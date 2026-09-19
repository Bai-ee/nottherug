import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { getLatestNotTheRugBriefHtml } from '@/lib/not-the-rug-brief/read';
import { briefHtmlHeaders } from '@/lib/not-the-rug-brief/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return errorResponse(error);
  }

  try {
    const { html } = await getLatestNotTheRugBriefHtml();
    return new NextResponse(html, { status: 200, headers: briefHtmlHeaders() });
  } catch (error) {
    console.error('[brief:html] read failed', error instanceof Error ? error.message : error);
    return new NextResponse('Latest HTML brief not found', { status: 404 });
  }
}
