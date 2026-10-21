import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEquals } from '@/lib/server/errors';
import { checkBenchRateLimit, clientIp } from '@/lib/server/benchIntake';
import {
  PEOPLE_DEFAULT_LIMIT,
  PEOPLE_MAX_LIMIT,
  getPerson,
  isBenchStage,
  isPeopleKind,
  isPeopleRange,
  listPeople,
} from '@/lib/server/sitePeople';

/**
 * Read-only PERSON-LEVEL records (names, emails, phones, every questionnaire
 * and application answer) for the HITLOOP client MCP. The owner approved
 * sending this PII; it is server to server only. Same auth as /api/stats: a
 * single shared bearer key (STATS_API_KEY) checked in constant time, unset key
 * = endpoint off, per-IP rate limit. Resume files are never returned.
 * Logic lives in lib/server/sitePeople.ts; this route only parses and auths.
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
  if (!(await checkBenchRateLimit(clientIp(req), 'stats-people', RATE_LIMIT_MAX))) {
    return fail(429, 'Too many requests');
  }

  const sp = req.nextUrl.searchParams;
  const kind = sp.get('kind');
  if (!isPeopleKind(kind)) return fail(400, 'Unknown kind');

  const rangeParam = sp.get('range');
  const range = isPeopleRange(rangeParam) ? rangeParam : '30d';
  const stageParam = sp.get('stage');
  const stage = kind === 'applicants' && isBenchStage(stageParam) ? stageParam : undefined;
  const limitParam = Number(sp.get('limit'));
  const limit = Number.isInteger(limitParam) && limitParam >= 1
    ? Math.min(limitParam, PEOPLE_MAX_LIMIT)
    : PEOPLE_DEFAULT_LIMIT;
  const id = sp.get('id');

  try {
    if (id) {
      const detail = await getPerson(kind, id);
      return detail ? NextResponse.json(detail, { headers: NO_STORE }) : fail(404, 'Not found');
    }
    const list = await listPeople({ kind, range, stage, limit });
    return NextResponse.json(list, { headers: NO_STORE });
  } catch (err) {
    console.error('[stats-people] failed', err instanceof Error ? err.message : 'unknown');
    return fail(500, 'People unavailable');
  }
}
