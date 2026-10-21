import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEquals } from '@/lib/server/errors';
import { checkBenchRateLimit, clientIp } from '@/lib/server/benchIntake';
import { isReportRange, type ReportRange } from '@/lib/analytics/report';
import { getSiteStats } from '@/lib/server/siteStats';

/**
 * Read-only business stats for a server-to-server reader (the HITLOOP client
 * MCP). Not the admin API: no Firebase session, a single shared bearer key
 * (STATS_API_KEY) checked in constant time, and a per-IP rate limit. Returns
 * counts and trends only (lib/server/siteStats.ts), never applicant or lead
 * details (person-level records live at /api/stats/people, same key). Unset
 * key = endpoint off.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_RANGE: ReportRange = '30d';
const RATE_LIMIT_MAX = 60;

function isAuthorized(req: NextRequest): boolean {
  const key = process.env.STATS_API_KEY;
  if (!key) return false;
  const header = req.headers.get('authorization');
  return header !== null && timingSafeEquals(header, `Bearer ${key}`);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await checkBenchRateLimit(clientIp(req), 'stats', RATE_LIMIT_MAX))) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  const rangeParam = req.nextUrl.searchParams.get('range');
  const range = isReportRange(rangeParam) ? rangeParam : DEFAULT_RANGE;
  try {
    const stats = await getSiteStats(range);
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[stats] failed', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ ok: false, error: 'Stats unavailable' }, { status: 500 });
  }
}
