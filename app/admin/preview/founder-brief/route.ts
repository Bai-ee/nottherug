import { NextRequest, NextResponse } from 'next/server';
import { absoluteUrl, resolvePublicBaseUrl } from '@/lib/content/site';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, timingSafeEquals } from '@/lib/server/errors';
import { getLatestNotTheRugBrief } from '@/lib/not-the-rug-brief/read';
import { founderDailyBriefEmail } from '@/lib/email/founder-brief-template';
import { briefHtmlHeaders } from '@/lib/not-the-rug-brief/security';

export const runtime = 'nodejs';

function buildUrls(req: NextRequest) {
  const base = resolvePublicBaseUrl(process.env.PUBLIC_BASE_URL, req.nextUrl.origin);
  return {
    dashboardUrl: absoluteUrl('/admin/dashboard', base),
    briefUrl: absoluteUrl('/admin/dashboard', base),
    leadsUrl: absoluteUrl('/admin/dashboard/leads', base),
  };
}

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  // Allow either admin token OR cron secret (for previewing locally without sign-in via curl)
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = !!cronSecret && timingSafeEquals(authHeader, `Bearer ${cronSecret}`);

  if (!isCronAuth) {
    try {
      await verifyAdmin(req);
    } catch (error) {
    return errorResponse(error);
  }
  }

  try {
    const brief = await getLatestNotTheRugBrief();
    const urls = buildUrls(req);
    const mail = founderDailyBriefEmail({
      brief,
      generatedAt: new Date().toISOString(),
      ...urls,
    });

    const wantJson = req.nextUrl.searchParams.get('format') === 'json';
    if (wantJson) {
      return NextResponse.json({ subject: mail.subject, html: mail.html, text: mail.text });
    }

    return new Response(mail.html, { status: 200, headers: briefHtmlHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 500 },
    );
  }
}
