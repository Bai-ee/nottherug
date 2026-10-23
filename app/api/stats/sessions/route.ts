import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEquals } from '@/lib/server/errors';
import { checkBenchRateLimit, clientIp } from '@/lib/server/benchIntake';
import { parseReportSpec } from '@/lib/analytics/report';
import { SESSIONS_DEFAULT_LIMIT, SESSIONS_MAX_LIMIT, getSessionPaths } from '@/lib/analytics/sessions';

/**
 * Read-only per-session paths (entry source, page/CTA/booking-step trail,
 * outcome) for the HITLOOP client MCP. Pseudonymous: sessions carry only the
 * random per-tab id the tracker already stores, no IP, user agent or person
 * link. Same auth as /api/stats: a single shared bearer key (STATS_API_KEY)
 * checked in constant time, unset key = endpoint off, per-IP rate limit.
 * Logic lives in lib/analytics/sessions.ts; this route only parses and auths.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const RATE_LIMIT_MAX = 60;
const NO_STORE = { 'Cache-Control': 'no-store' };

function isAuthorized(req: NextRequest): boolean {
  const key = process.env.STATS_API_KEY;
  if (!key) return false;
  const header = req.headers.get('authorization');
  return header !== null && timingSafeEquals(header, `Bearer ${key}`);
}

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return fail(401, 'Unauthorized');
  if (!(await checkBenchRateLimit(clientIp(req), 'stats-sessions', RATE_LIMIT_MAX))) {
    return fail(429, 'Too many requests');
  }

  const sp = req.nextUrl.searchParams;
  const parsed = parseReportSpec({ range: sp.get('range'), from: sp.get('from'), to: sp.get('to') }, '24h');
  if (!parsed.ok) return fail(400, parsed.error);
  const limitParam = Number(sp.get('limit'));
  const limit = Number.isInteger(limitParam) && limitParam >= 1
    ? Math.min(limitParam, SESSIONS_MAX_LIMIT)
    : SESSIONS_DEFAULT_LIMIT;

  try {
    return NextResponse.json(await getSessionPaths(parsed.spec, { limit }), { headers: NO_STORE });
  } catch (err) {
    console.error('[stats-sessions] failed', err instanceof Error ? err.message : 'unknown');
    return fail(500, 'Sessions unavailable');
  }
}
