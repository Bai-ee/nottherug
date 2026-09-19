import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { getNotTheRugBriefRunHtml } from '@/lib/not-the-rug-brief/read';
import { briefHtmlHeaders } from '@/lib/not-the-rug-brief/security';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return errorResponse(error);
  }

  try {
    const { id } = await context.params;
    const { html, path: htmlPath } = await getNotTheRugBriefRunHtml(id);
    const fileName = path.basename(htmlPath);

    return new NextResponse(html, {
      status: 200,
      headers: briefHtmlHeaders({ 'Content-Disposition': `attachment; filename="${fileName}"` }),
    });
  } catch (error) {
    console.error('[brief:html] read failed', error instanceof Error ? error.message : error);
    return new NextResponse('HTML brief not found', { status: 404 });
  }
}
