import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getAnalyticsReport = vi.fn();
const getLeadStats = vi.fn();
const listBenchPeople = vi.fn();
const checkBenchRateLimit = vi.fn(async () => true);

vi.mock('@/lib/analytics/report', async () => ({
  ...(await vi.importActual<typeof import('@/lib/analytics/report')>('@/lib/analytics/report')),
  getAnalyticsReport,
}));
vi.mock('@/lib/leads/stats', () => ({ getLeadStats }));
vi.mock('@/lib/server/bench', () => ({ listBenchPeople }));
vi.mock('@/lib/server/benchIntake', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/benchIntake')>('@/lib/server/benchIntake')),
  checkBenchRateLimit,
}));

const KEY = 'test-stats-key';
const NOW = new Date('2026-10-20T18:00:00.000Z');

function get(auth?: string, range?: string) {
  const url = new URL('https://nottherug.com/api/stats');
  if (range) url.searchParams.set('range', range);
  return new NextRequest(url, { headers: auth ? { authorization: auth } : {} });
}

function leadStats() {
  return {
    rangeDays: 30,
    timezone: 'America/New_York',
    today: { dateLabel: '2026-10-20', count: 2, leads: [{ email: 'a@b.c' }] },
    yesterday: { dateLabel: '2026-10-19', count: 1, leads: [{ email: 'd@e.f' }] },
    totals: { recentCount: 12, recentCountCap: 1000, last7Days: 5, last30Days: 12 },
    emailsCaptured: { yesterday: 0, last7Days: 1, last30Days: 3 },
    byDay: [{ date: '2026-10-20', count: 2 }],
    bySource: { website: 10, referral: 2 },
  };
}

function person(stage: string, createdAt: string, onHold = false) {
  return { stage, createdAt, onHold, email: 'x@y.z', fullName: 'Secret Name' };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ now: NOW });
  process.env.STATS_API_KEY = KEY;
  getAnalyticsReport.mockReset().mockResolvedValue({ meta: { status: 'ok' }, range: { key: '30d' } });
  getLeadStats.mockReset().mockResolvedValue(leadStats());
  listBenchPeople.mockReset().mockResolvedValue([
    person('review', '2026-10-19T00:00:00.000Z'),
    person('rejected', '2026-10-01T00:00:00.000Z', true),
    person('bench', '2026-08-01T00:00:00.000Z'),
  ]);
  checkBenchRateLimit.mockReset().mockResolvedValue(true);
});

describe('GET /api/stats', () => {
  it('401s without the key, with the wrong key, and when the key is unset', async () => {
    const { GET } = await import('@/app/api/stats/route');
    expect((await GET(get())).status).toBe(401);
    expect((await GET(get('Bearer nope'))).status).toBe(401);
    delete process.env.STATS_API_KEY;
    expect((await GET(get(`Bearer ${KEY}`))).status).toBe(401);
    expect(getAnalyticsReport).not.toHaveBeenCalled();
  });

  it('adds a definitions block for every booking/lead metric without changing existing fields', async () => {
    const { GET } = await import('@/app/api/stats/route');
    const body = await (await GET(get(`Bearer ${KEY}`))).json();
    expect(Object.keys(body).sort()).toEqual(
      ['analytics', 'applicants', 'definitions', 'degraded', 'generatedAt', 'leads', 'range', 'site'],
    );
    for (const k of [
      'note', 'bookedLeads', 'appointmentsScheduled', 'calendlyScheduled', 'funnelScheduleStep',
      'inquiries', 'outstandingCaptures', 'completedQuestionnaires', 'leadsToday',
    ]) {
      expect(typeof body.definitions[k]).toBe('string');
      expect(body.definitions[k].length).toBeGreaterThan(20);
    }
    expect(body.definitions.note).toMatch(/not expected to match/);
    expect(body.leads.today).toBe(2);
  });

  it('429s over the per-IP limit', async () => {
    checkBenchRateLimit.mockResolvedValue(false);
    const { GET } = await import('@/app/api/stats/route');
    expect((await GET(get(`Bearer ${KEY}`))).status).toBe(429);
  });

  it('returns counts only: no lead or applicant details', async () => {
    const { GET } = await import('@/app/api/stats/route');
    const res = await GET(get(`Bearer ${KEY}`, '7d'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();

    expect(getAnalyticsReport).toHaveBeenCalledWith('7d', expect.objectContaining({ now: expect.any(Date) }));
    expect(body.site).toBe('nottherug.com');
    expect(body.range).toBe('7d');
    expect(body.generatedAt).toBe(NOW.toISOString());
    expect(body.leads).toEqual({
      timezone: 'America/New_York',
      today: 2,
      yesterday: 1,
      last7Days: 5,
      last30Days: 12,
      emailsCaptured: { yesterday: 0, last7Days: 1, last30Days: 3 },
      byDay: [{ date: '2026-10-20', count: 2 }],
      bySource: { website: 10, referral: 2 },
    });
    expect(body.applicants).toEqual({
      total: 3,
      byStage: expect.objectContaining({ review: 1, rejected: 1, bench: 1, applied: 0 }),
      last7Days: 1,
      last30Days: 2,
      onHold: 1,
    });
    expect(body.degraded).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(/a@b\.c|x@y\.z|Secret Name/);
  });

  it('falls back to a bad range and marks failed dependencies as degraded', async () => {
    getLeadStats.mockRejectedValue(new Error('firestore down'));
    listBenchPeople.mockRejectedValue(new Error('firestore down'));
    const { GET } = await import('@/app/api/stats/route');
    const body = await (await GET(get(`Bearer ${KEY}`, 'bogus'))).json();
    expect(body.range).toBe('30d');
    expect(body.degraded).toEqual(['leads', 'applicants']);
    expect(body.leads.last30Days).toBe(0);
    expect(body.applicants.total).toBe(0);
    expect(body.analytics).toEqual({ meta: { status: 'ok' }, range: { key: '30d' } });
  });
});
