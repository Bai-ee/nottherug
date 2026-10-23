import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

type RawDoc = Record<string, unknown>;
const fsQueryRange = vi.fn();
const checkBenchRateLimit = vi.fn(async () => true);

vi.mock('@/lib/server/firestoreRest', () => ({
  fsQueryRange: (...args: unknown[]) => fsQueryRange(...args),
  fsQueryRangeCount: vi.fn(),
  fsGetDoc: vi.fn(),
  fsSetDoc: vi.fn(),
  fsCreateDoc: vi.fn(),
  fsDeleteDoc: vi.fn(),
  fsIncrementField: vi.fn(),
  fsQueryCollection: vi.fn(),
}));
vi.mock('@/lib/server/benchIntake', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/benchIntake')>('@/lib/server/benchIntake')),
  checkBenchRateLimit,
}));

const KEY = 'test-stats-key';
const NOW = new Date('2026-01-15T18:00:00.000Z');

function ev(o: RawDoc): RawDoc {
  return { event: 'page_view', route: '/', ...o };
}

const FIXTURES: RawDoc[] = [
  // Started before the 24h window: its attribution event is outside it.
  ev({ id: 'x0', sid: 'early', receivedAt: '2026-01-14T17:00:00.000Z', src: 'direct' }),
  ev({ id: 'x1', sid: 'early', receivedAt: '2026-01-14T18:10:00.000Z', route: '/book' }),
  // Campaign visit that books.
  ev({ id: 'a1', sid: 'flyer', vid: 'v1', vr: 'new', receivedAt: '2026-01-15T12:00:00.000Z', src: 'campaign', camp: 'flyer' }),
  ev({ id: 'a2', sid: 'flyer', event: 'cta_click', cta: 'hero_book', receivedAt: '2026-01-15T12:00:20.000Z' }),
  ev({ id: 'a3', sid: 'flyer', event: 'booking_form_start', receivedAt: '2026-01-15T12:00:25.000Z' }),
  ev({ id: 'a4', sid: 'flyer', event: 'booking_step', step: 'review', receivedAt: '2026-01-15T12:01:00.000Z' }),
  ev({ id: 'a5', sid: 'flyer', event: 'lead_saved', receivedAt: '2026-01-15T12:01:10.000Z' }),
  // Referral bounce: the same browser coming back later.
  ev({ id: 'b1', sid: 'google', vid: 'v1', vr: 'returning', receivedAt: '2026-01-15T15:00:00.000Z', src: 'referral', ref: 'google.com' }),
  // Test traffic never shows.
  ev({ id: 't1', sid: 'test', receivedAt: '2026-01-15T16:00:00.000Z', src: 'direct', mode: 'test' }),
];

function rangeQuery(collectionId: string, field: string, start: string, end: string, limit = 5000) {
  return FIXTURES.filter((d) => String(d[field]) >= start && String(d[field]) < end)
    .sort((a, b) => String(a[field]).localeCompare(String(b[field])))
    .slice(0, limit);
}

function get(auth?: string, params: Record<string, string> = {}) {
  const url = new URL('https://nottherug.com/api/stats/sessions');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, { headers: auth ? { authorization: auth } : {} });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ now: NOW });
  process.env.STATS_API_KEY = KEY;
  fsQueryRange.mockReset().mockImplementation(async (...a: unknown[]) => rangeQuery(...(a as [string, string, string, string, number])));
  checkBenchRateLimit.mockReset().mockResolvedValue(true);
});

describe('GET /api/stats/sessions', () => {
  it('401s without the right key and 429s over the limit', async () => {
    const { GET } = await import('@/app/api/stats/sessions/route');
    expect((await GET(get())).status).toBe(401);
    expect((await GET(get('Bearer nope'))).status).toBe(401);
    checkBenchRateLimit.mockResolvedValue(false);
    expect((await GET(get(`Bearer ${KEY}`))).status).toBe(429);
    expect(fsQueryRange).not.toHaveBeenCalled();
  });

  it('400s on a bad custom range', async () => {
    const { GET } = await import('@/app/api/stats/sessions/route');
    const res = await GET(get(`Bearer ${KEY}`, { from: '2026-01-10' }));
    expect(res.status).toBe(400);
  });

  it('defaults to the rolling 24h and returns each session path newest first, real traffic only', async () => {
    const { GET } = await import('@/app/api/stats/sessions/route');
    const res = await GET(get(`Bearer ${KEY}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();

    expect(body.range.key).toBe('24h');
    expect(body.totalSessions).toBe(3);
    expect(body.sessions.map((s: { sid: string }) => s.sid)).toEqual(['google', 'flyer', 'early']);

    const [google, flyer, early] = body.sessions;
    expect(google).toMatchObject({ source: 'referral:google.com', bounced: true, pageviews: 1, durationSeconds: 0, startedBeforeWindow: false });
    expect(flyer).toMatchObject({
      source: 'campaign:flyer',
      entryRoute: '/',
      exitRoute: '/',
      bounced: false,
      durationSeconds: 70,
      outcome: { furthestBookingStep: 'review', leadSaved: true, schedulerOpened: false, appointmentCompleted: false },
      trailTruncated: false,
    });
    expect(flyer.trail.map((t: { event: string }) => t.event)).toEqual(['page_view', 'cta_click', 'booking_form_start', 'booking_step', 'lead_saved']);
    expect(flyer.trail[1].cta).toBe('hero_book');
    expect(early).toMatchObject({ source: null, startedBeforeWindow: true, entryRoute: '/book' });
    expect(body.uniqueVisitors).toBe(1);
    expect(flyer).toMatchObject({ visitorId: 'v1', visitorType: 'new', visitorSessionsInRange: 2 });
    expect(google).toMatchObject({ visitorId: 'v1', visitorType: 'returning', visitorSessionsInRange: 2 });
    expect(early).toMatchObject({ visitorId: null, visitorType: null, visitorSessionsInRange: null });
    expect(JSON.stringify(body)).not.toMatch(/"test"/);
  });

  it('honours limit and a custom range', async () => {
    const { GET } = await import('@/app/api/stats/sessions/route');
    const body = await (await GET(get(`Bearer ${KEY}`, { from: '2026-01-15', to: '2026-01-15', limit: '1' }))).json();
    expect(body.range).toMatchObject({ key: 'custom', days: 1 });
    expect(body.totalSessions).toBe(2);
    expect(body.returned).toBe(1);
    expect(body.sessions[0].sid).toBe('google');
  });
});
