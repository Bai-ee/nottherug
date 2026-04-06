import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { getNotTheRugBriefRunHtml } from '@/lib/not-the-rug-brief/server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Unauthorized', { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { html, path: htmlPath } = await getNotTheRugBriefRunHtml(id);
    const fileName = path.basename(htmlPath);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'HTML brief not found', { status: 404 });
  }
}
