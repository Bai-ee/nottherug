/**
 * Coverage for lib/analytics/report.ts (plan A4). fsQueryRange/fsQueryRangeCount
 * are mocked with a small in-memory implementation that actually applies the
 * requested [start, end) range, limit, and direction — the same contract real
 * Firestore has — so these tests exercise the report's own New York day-
 * boundary math and dedup/aggregation logic, not just its wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type RawDoc = Record<string, unknown>;

const fsQueryRange = vi.fn();
const fsQueryRangeCount = vi.fn();

vi.mock('@/lib/server/firestoreRest', () => ({
  fsQueryRange: (...args: unknown[]) => fsQueryRange(...args),
  fsQueryRangeCount: (...args: unknown[]) => fsQueryRangeCount(...args),
  fsGetDoc: vi.fn(),
  fsSetDoc: vi.fn(),
  fsCreateDoc: vi.fn(),
  fsDeleteDoc: vi.fn(),
  fsIncrementField: vi.fn(),
  fsQueryCollection: vi.fn(),
}));

/** Builds one stored-event fixture with sane defaults; override anything. */
function ev(overrides: RawDoc): RawDoc {
  const receivedAt = overrides.receivedAt as string;
  return {
    event: 'page_view',
    id: 'id',
    sid: 'sid',
    ts: Date.parse(receivedAt),
    route: '/',
    ...overrides,
  };
}

/** Simulates Firestore's range query: filters fixtures by [start, end) on `field`, sorts, applies limit. */
function rangeQueryMock(fixtures: RawDoc[]) {
  return vi.fn(async (_collectionId: string, field: string, start: string, end: string, limit = 5000, direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING') => {
    const matches = fixtures.filter((d) => {
      const v = String(d[field]);
      return v >= start && v < end;
    });
    matches.sort((a, b) => {
      const av = String(a[field]);
      const bv = String(b[field]);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return direction === 'DESCENDING' ? -cmp : cmp;
    });
    return matches.slice(0, limit);
  });
}

function countQueryMock(total: number) {
  return vi.fn(async () => total);
}

describe('getAnalyticsReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes exact totals against a hand-calculated fixture set', async () => {
    const fixtures: RawDoc[] = [
      // Earliest event ever recorded — well before the reporting window.
      ev({ id: 'e0', sid: 'sess-0', event: 'page_view', receivedAt: '2026-01-01T12:00:00.000Z' }),

      // Session A: engaged, full funnel, scheduled via Calendly, campaign source.
      ev({ id: 'e1', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z', src: 'campaign', camp: 'flyer' }),
      ev({ id: 'e2', sid: 'sess-a', event: 'engagement', receivedAt: '2026-01-15T12:00:05.000Z' }),
      ev({ id: 'e3', sid: 'sess-a', event: 'cta_click', cta: 'closing_trust_book', receivedAt: '2026-01-15T12:00:10.000Z' }),
      ev({ id: 'e4', sid: 'sess-a', event: 'booking_form_start', receivedAt: '2026-01-15T12:01:00.000Z' }),
      ev({ id: 'e5', sid: 'sess-a', event: 'booking_step', step: 'details', receivedAt: '2026-01-15T12:01:05.000Z' }),
      ev({ id: 'e6', sid: 'sess-a', event: 'booking_step', step: 'dog', receivedAt: '2026-01-15T12:01:10.000Z' }),
      ev({ id: 'e7', sid: 'sess-a', event: 'booking_step', step: 'schedule', receivedAt: '2026-01-15T12:01:15.000Z' }),
      ev({ id: 'e8', sid: 'sess-a', event: 'booking_step', step: 'review', receivedAt: '2026-01-15T12:01:20.000Z' }),
      ev({ id: 'e9', sid: 'sess-a', event: 'lead_saved', receivedAt: '2026-01-15T12:01:30.000Z' }),
      ev({ id: 'e10', sid: 'sess-a', event: 'scheduling_dialog_opened', receivedAt: '2026-01-15T12:01:35.000Z' }),
      ev({ id: 'e11', sid: 'sess-a', event: 'appointment_completed', receivedAt: '2026-01-15T12:01:40.000Z' }),

      // Session B: phone-consultation path — saves a lead, never opens the dialog. Not abandonment.
      ev({ id: 'e12', sid: 'sess-b', event: 'page_view', receivedAt: '2026-01-15T13:00:00.000Z', route: '/book', src: 'referral', ref: 'google.com' }),
      ev({ id: 'e13', sid: 'sess-b', event: 'booking_form_start', receivedAt: '2026-01-15T13:00:05.000Z' }),
      ev({ id: 'e14', sid: 'sess-b', event: 'booking_step', step: 'details', receivedAt: '2026-01-15T13:00:10.000Z' }),
      ev({ id: 'e15', sid: 'sess-b', event: 'booking_step', step: 'review', receivedAt: '2026-01-15T13:00:20.000Z' }),
      ev({ id: 'e16', sid: 'sess-b', event: 'lead_saved', receivedAt: '2026-01-15T13:00:30.000Z' }),

      // Session C: plain direct visit, delivered twice under the same event id (retry).
      ev({ id: 'e17', sid: 'sess-c', event: 'page_view', receivedAt: '2026-01-15T14:00:00.000Z' }),
      ev({ id: 'e17', sid: 'sess-c', event: 'page_view', receivedAt: '2026-01-15T14:00:00.500Z' }),

      // Out of range: the calendar day before "today".
      ev({ id: 'e18', sid: 'sess-d', event: 'page_view', receivedAt: '2026-01-14T20:00:00.000Z' }),

      // Test-mode traffic within the window — excluded from the default (real) report.
      ev({ id: 'e19', sid: 'sess-e', event: 'page_view', receivedAt: '2026-01-15T15:00:00.000Z', mode: 'test' }),

      // Falls inside both "today" and the rolling 60-minute live window ending at "now" (18:00Z).
      ev({ id: 'e20', sid: 'sess-live', event: 'page_view', receivedAt: '2026-01-15T17:30:00.000Z' }),
    ];

    fsQueryRange.mockImplementation(rangeQueryMock(fixtures));
    fsQueryRangeCount.mockImplementation(countQueryMock(5));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-01-15T18:00:00.000Z'); // 13:00 NY (EST, UTC-5)
    const report = await getAnalyticsReport('today', { now });

    expect(report.meta.status).toBe('ok');
    expect(report.meta.trackingStartDate).toBe('2026-01-01T12:00:00.000Z');
    expect(report.meta.testMode).toBe(false);
    expect(report.meta.degraded).toEqual([]);

    // Authoritative inquiries from leads, not from lead_saved.
    expect(report.inquiries).toBe(5);

    // Pageviews/sessions: e1, e12, e17 (deduped), e20 — the test-mode e19 is excluded.
    expect(report.pageviews).toBe(4);
    expect(report.sessions).toBe(4);

    // Only sess-a fired an 'engagement' event.
    expect(report.engagedVisitPct).toBeCloseTo(25, 5);

    expect(report.appointmentsScheduled).toBe(1);

    expect(report.inquiryRate.trackedLeadSaved).toBe(2); // e9, e16
    expect(report.inquiryRate.trackedSessions).toBe(4);
    expect(report.inquiryRate.rate).toBeCloseTo(0.5, 5);

    expect(report.sources).toEqual(
      expect.arrayContaining([
        { source: 'direct', sessions: 2 }, // sess-c, sess-live
        { source: 'campaign:flyer', sessions: 1 },
        { source: 'referral:google.com', sessions: 1 },
      ])
    );
    expect(report.sources[0]).toEqual({ source: 'direct', sessions: 2 });

    const heroBook = report.ctaClicks.find((r) => r.cta === 'closing_trust_book');
    expect(heroBook).toEqual({ cta: 'closing_trust_book', clicks: 1 });
    expect(report.ctaClicks.every((r) => r.cta !== 'closing_trust_book' ? r.clicks === 0 : true)).toBe(true);

    expect(report.funnel.formStarts).toBe(2);
    expect(report.funnel.steps).toEqual([
      { step: 'details', sessions: 2 },
      { step: 'dog', sessions: 1 },
      { step: 'schedule', sessions: 1 },
      { step: 'review', sessions: 2 },
    ]);
    expect(report.funnel.dialogOpened).toBe(1);
    expect(report.funnel.phoneConsultPath).toBe(1); // sess-b
    expect(report.funnel.calendlyScheduled).toBe(1); // sess-a

    expect(report.dailyTrend).toEqual([{ date: '2026-01-15', pageviews: 4, sessions: 4, engagedSessions: 1 }]);

    expect(report.live).toEqual({
      windowMinutes: 60,
      startIso: '2026-01-15T17:00:00.000Z',
      endIso: '2026-01-15T18:00:00.000Z',
      pageviews: 1,
      sessions: 1,
    });
  });

  it('excludes mode:test events by default and isolates them when includeTest is set', async () => {
    const fixtures: RawDoc[] = [
      ev({ id: 'real-1', sid: 'sess-real', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z' }),
      ev({ id: 'test-1', sid: 'sess-test', event: 'page_view', receivedAt: '2026-01-15T12:05:00.000Z', mode: 'test' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures));
    fsQueryRangeCount.mockImplementation(countQueryMock(0));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-01-15T18:00:00.000Z');

    const real = await getAnalyticsReport('today', { now });
    expect(real.pageviews).toBe(1);
    expect(real.meta.testMode).toBe(false);

    const test = await getAnalyticsReport('today', { now, includeTest: true });
    expect(test.pageviews).toBe(1);
    expect(test.meta.testMode).toBe(true);
  });

  it('reports a truthful total above the 1,000-record cap that lib/leads/stats.ts imposes elsewhere', async () => {
    fsQueryRange.mockImplementation(rangeQueryMock([]));
    fsQueryRangeCount.mockImplementation(countQueryMock(1500));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('30d', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.inquiries).toBe(1500);
    expect(fsQueryRangeCount).toHaveBeenCalledWith('leads', 'submittedAt', expect.any(String), expect.any(String));
  });

  it('distinguishes no_data_yet (nothing ever recorded) from zero_activity (recorded before, nothing in this window)', async () => {
    fsQueryRangeCount.mockImplementation(countQueryMock(0));

    fsQueryRange.mockImplementation(rangeQueryMock([]));
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-01-15T18:00:00.000Z');

    const neverTracked = await getAnalyticsReport('today', { now });
    expect(neverTracked.meta.status).toBe('no_data_yet');
    expect(neverTracked.meta.trackingStartDate).toBeNull();

    fsQueryRange.mockImplementation(
      rangeQueryMock([ev({ id: 'old', sid: 'sess-old', event: 'page_view', receivedAt: '2025-01-01T00:00:00.000Z' })])
    );
    const quietToday = await getAnalyticsReport('today', { now });
    expect(quietToday.meta.status).toBe('zero_activity');
    expect(quietToday.meta.trackingStartDate).toBe('2025-01-01T00:00:00.000Z');
    expect(quietToday.pageviews).toBe(0);
  });

  it('keeps day bucketing correct across the fall-back DST transition (mirrors lib/leads/stats.ts)', async () => {
    const fixtures: RawDoc[] = [
      // 2026-11-01 01:30 EDT, before the 2am -> 1am repeat.
      ev({ id: 'pre', sid: 'sess-pre', event: 'page_view', receivedAt: '2026-11-01T05:30:00.000Z' }),
      // 2026-11-01 01:30 EST, the same wall-clock hour repeated after fall-back.
      ev({ id: 'post', sid: 'sess-post', event: 'page_view', receivedAt: '2026-11-01T06:30:00.000Z' }),
      // 2026-10-31 23:59 EDT — the day before; must be excluded from "today".
      ev({ id: 'day-before', sid: 'sess-before', event: 'page_view', receivedAt: '2026-11-01T03:59:00.000Z' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures));
    fsQueryRangeCount.mockImplementation(countQueryMock(0));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-11-01T17:00:00.000Z'); // noon NY, EST, after the transition
    const report = await getAnalyticsReport('today', { now });

    expect(report.pageviews).toBe(2);
    expect(report.sessions).toBe(2);
    expect(report.dailyTrend).toEqual([{ date: '2026-11-01', pageviews: 2, sessions: 2, engagedSessions: 0 }]);
  });

  it('degrades gracefully when only the leads query fails', async () => {
    fsQueryRange.mockImplementation(
      rangeQueryMock([ev({ id: 'e1', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z' })])
    );
    fsQueryRangeCount.mockRejectedValue(new Error('Firestore COUNT leads: 503 unavailable'));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.meta.status).toBe('partial_failure');
    expect(report.meta.degraded).toEqual(['leads']);
    expect(report.inquiries).toBeNull();
    expect(report.pageviews).toBe(1); // events leg still healthy
  });

  it('degrades gracefully when only the events query fails', async () => {
    fsQueryRange.mockRejectedValue(new Error('Firestore RANGE analytics_events: 503 unavailable'));
    fsQueryRangeCount.mockImplementation(countQueryMock(3));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.meta.status).toBe('partial_failure');
    expect(report.meta.degraded).toEqual(['events']);
    expect(report.inquiries).toBe(3); // leads leg still healthy
    expect(report.pageviews).toBe(0);
    expect(report.sessions).toBe(0);
    expect(report.live).toEqual({ windowMinutes: 60, startIso: '', endIso: '', pageviews: 0, sessions: 0 });
  });

  it('throws (surfaces as a real failure) when both leads and events queries fail', async () => {
    fsQueryRange.mockRejectedValue(new Error('events down'));
    fsQueryRangeCount.mockRejectedValue(new Error('leads down'));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const { ServiceError } = await import('@/lib/server/errors');

    await expect(getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') })).rejects.toBeInstanceOf(ServiceError);
  });

  it('flags eventsTruncated when the bounded range query hits its row ceiling', async () => {
    fsQueryRangeCount.mockImplementation(countQueryMock(0));
    fsQueryRange.mockImplementation(async (_c: string, _f: string, _s: string, _e: string, limit = 5000) =>
      Array.from({ length: limit }, (_, i) => ev({ id: `t${i}`, sid: `s${i}`, event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z' }))
    );

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.meta.eventsTruncated).toBe(true);
  });
});
