/**
 * Coverage for lib/analytics/report.ts (plan A4). fsQueryRange
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

/** Simulates Firestore's range query: filters fixtures by [start, end) on
 *  `field`, sorts, applies limit. Answers per collection, because leads and
 *  analytics_events are both read this way now. */
function rangeQueryMock(fixtures: RawDoc[], leadFixtures: RawDoc[] = []) {
  return vi.fn(async (collectionId: string, field: string, start: string, end: string, limit = 5000, direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING') => {
    const source = collectionId === 'leads' ? leadFixtures : fixtures;
    const matches = source.filter((d) => {
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

/** N completed questionnaires inside the window under test. */
function leadDocs(total: number, at = '2026-01-15T12:00:00.000Z'): RawDoc[] {
  return Array.from({ length: total }, (_, i) => ({ id: `lead-${i}`, type: 'meetgreet', submittedAt: at }));
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

    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(5)));

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

    // Pages: '/' from sess-a, sess-c (deduped delivery) and sess-live; '/book' from sess-b.
    expect(report.pages).toEqual([
      { route: '/', pageviews: 3, sessions: 3 },
      { route: '/book', pageviews: 1, sessions: 1 },
    ]);

    const heroBook = report.ctaClicks.find((r) => r.cta === 'closing_trust_book');
    expect(heroBook).toEqual({ cta: 'closing_trust_book', clicks: 1 });
    expect(report.ctaClicks.every((r) => r.cta !== 'closing_trust_book' ? r.clicks === 0 : true)).toBe(true);

    expect(report.funnel.formStarts).toBe(2);
    // Rows follow BOOKING_STEPS: details → dog → review → schedule, because
    // the scheduler opens only after the questionnaire is submitted.
    expect(report.funnel.steps).toEqual([
      { step: 'details', sessions: 2 },
      { step: 'dog', sessions: 1 },
      { step: 'review', sessions: 2 },
      { step: 'schedule', sessions: 1 },
    ]);
    expect(report.funnel.dialogOpened).toBe(1);
    expect(report.funnel.savedSchedulerNotOpened).toBe(1); // sess-b
    expect(report.funnel.calendlyScheduled).toBe(1); // sess-a

    expect(report.dailyTrend).toEqual([
      { date: '2026-01-15', pageviews: 4, sessions: 4, visitors: null, engagedSessions: 1, leadSaved: 2 },
    ]);

    expect(report.live).toEqual({
      windowMinutes: 60,
      startIso: '2026-01-15T17:00:00.000Z',
      endIso: '2026-01-15T18:00:00.000Z',
      pageviews: 1,
      sessions: 1,
      visitors: 0,
    });
  });

  it('excludes mode:test events by default and isolates them when includeTest is set', async () => {
    const fixtures: RawDoc[] = [
      ev({ id: 'real-1', sid: 'sess-real', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z' }),
      ev({ id: 'test-1', sid: 'sess-test', event: 'page_view', receivedAt: '2026-01-15T12:05:00.000Z', mode: 'test' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-01-15T18:00:00.000Z');

    const real = await getAnalyticsReport('today', { now });
    expect(real.pageviews).toBe(1);
    expect(real.meta.testMode).toBe(false);

    const test = await getAnalyticsReport('today', { now, includeTest: true });
    expect(test.pageviews).toBe(1);
    expect(test.meta.testMode).toBe(true);
  });

  it('never puts the real leads total in a test-mode report', async () => {
    const fixtures: RawDoc[] = [
      ev({ id: 'test-1', sid: 'sess-test', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z', mode: 'test' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(7)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-01-15T18:00:00.000Z');

    // Leads carry no mode field, so a test-mode view reports "not measured"
    // rather than the real business total under a test-data banner.
    const test = await getAnalyticsReport('today', { now, includeTest: true });
    expect(test.inquiries).toBeNull();
    expect(test.outstandingCaptures).toBeNull();
    expect(test.meta.degraded).toEqual([]); // null here means not measured, not a failure
    // Test mode must not read the leads collection at all.
    expect(fsQueryRange.mock.calls.some((c: unknown[]) => c[0] === 'leads')).toBe(false);

    // The tracked-cohort inquiry rate is event-derived, so it still applies.
    expect(test.inquiryRate.trackedSessions).toBe(1);

    const real = await getAnalyticsReport('today', { now });
    expect(real.inquiries).toBe(7);
  });

  it('finds the earliest event of the requested mode past a full page of the other mode', async () => {
    // 120 test events (more than one 100-row page) precede the first real one.
    const fixtures: RawDoc[] = [
      ...Array.from({ length: 120 }, (_, i) =>
        ev({ id: `t-${i}`, sid: `st-${i}`, receivedAt: `2025-01-01T00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000Z`, mode: 'test' })
      ),
      ev({ id: 'real-1', sid: 'sr', receivedAt: '2025-06-01T00:00:00.000Z' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const real = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });
    expect(real.meta.trackingStartDate).toBe('2025-06-01T00:00:00.000Z');
    const test = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z'), includeTest: true });
    expect(test.meta.trackingStartDate).toBe('2025-01-01T00:00:00.000Z');
  });

  it('never reports no_data_yet while the range actually has events', async () => {
    // The earliest-events sample is read across both modes and filtered after
    // the fact, so 25+ older real events hide every test event from it and
    // trackingStartDate comes back null in test mode. The status must still
    // follow the data in range.
    const fixtures: RawDoc[] = [
      ...Array.from({ length: 30 }, (_, i) =>
        ev({ id: `old-${i}`, sid: `sess-old-${i}`, event: 'page_view', receivedAt: `2025-01-01T00:00:${String(i).padStart(2, '0')}.000Z` })
      ),
      ev({ id: 'test-1', sid: 'sess-test', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z', mode: 'test' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z'), includeTest: true });

    expect(report.pageviews).toBe(1);
    // Paged read walks past the older real events and finds the test event.
    expect(report.meta.trackingStartDate).toBe('2026-01-15T12:00:00.000Z');
    expect(report.meta.status).toBe('ok'); // never 'no_data_yet' above a non-zero tile
  });

  it('builds the page table from page_view events only, counting distinct sessions per route', async () => {
    const fixtures: RawDoc[] = [
      // '/' : three views from two sessions.
      ev({ id: 'p1', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z', route: '/' }),
      ev({ id: 'p2', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:01:00.000Z', route: '/' }),
      ev({ id: 'p3', sid: 'sess-b', event: 'page_view', receivedAt: '2026-01-15T12:02:00.000Z', route: '/' }),

      // '/book' : one view, plus a duplicate delivery of the same event id.
      ev({ id: 'p4', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:03:00.000Z', route: '/book' }),
      ev({ id: 'p4', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:03:01.000Z', route: '/book' }),

      // '/contact' : one view — ties with '/book' on pageviews, so route order decides.
      ev({ id: 'p5', sid: 'sess-b', event: 'page_view', receivedAt: '2026-01-15T12:04:00.000Z', route: '/contact' }),

      // Untracked path: stored with route null, so it has no row rather than an invented one.
      ev({ id: 'p6', sid: 'sess-c', event: 'page_view', receivedAt: '2026-01-15T12:05:00.000Z', route: null }),

      // Non-page_view events never add to the page table, even carrying a route.
      ev({ id: 'p7', sid: 'sess-d', event: 'engagement', receivedAt: '2026-01-15T12:06:00.000Z', route: '/safety' }),
      ev({ id: 'p8', sid: 'sess-d', event: 'cta_click', cta: 'nav_book', receivedAt: '2026-01-15T12:07:00.000Z', route: '/safety' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.pages).toEqual([
      { route: '/', pageviews: 3, sessions: 2 },
      { route: '/book', pageviews: 1, sessions: 1 },
      { route: '/contact', pageviews: 1, sessions: 1 },
    ]);

    // Page views with a null route still count toward the range total — only the per-route breakdown drops them.
    expect(report.pageviews).toBe(6); // p1, p2, p3, p4 (deduped), p5, and the null-route p6
  });

  it('keeps the page table on the same side of the real/test split as every other number', async () => {
    const fixtures: RawDoc[] = [
      ev({ id: 'real-1', sid: 'sess-real', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z', route: '/' }),
      ev({ id: 'test-1', sid: 'sess-test', event: 'page_view', receivedAt: '2026-01-15T12:05:00.000Z', route: '/book', mode: 'test' }),
      ev({ id: 'test-2', sid: 'sess-test', event: 'page_view', receivedAt: '2026-01-15T12:06:00.000Z', route: '/book', mode: 'test' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-01-15T18:00:00.000Z');

    const real = await getAnalyticsReport('today', { now });
    expect(real.pages).toEqual([{ route: '/', pageviews: 1, sessions: 1 }]);

    const test = await getAnalyticsReport('today', { now, includeTest: true });
    expect(test.pages).toEqual([{ route: '/book', pageviews: 2, sessions: 1 }]);
  });

  it('returns an empty page table (not a fabricated row) when the events query fails', async () => {
    // Only the events read fails; the leads read still answers.
    fsQueryRange.mockImplementation(async (collectionId: string, ...rest: unknown[]) => {
      if (collectionId === 'leads') {
        return rangeQueryMock([], leadDocs(3))(collectionId, ...(rest as [string, string, string]));
      }
      throw new Error('Firestore RANGE analytics_events: 503 unavailable');
    });

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.pages).toEqual([]);
  });

  it('reports a truthful total above the 1,000-record cap that lib/leads/stats.ts imposes elsewhere', async () => {
    fsQueryRange.mockImplementation(rangeQueryMock([], leadDocs(1500)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('30d', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.inquiries).toBe(1500);
    // Read as a plain range on one field: an equality filter alongside the
    // range would be a compound query, which Firestore will not serve without
    // a composite index that does not exist.
    const leadsCall = fsQueryRange.mock.calls.find((c: unknown[]) => c[0] === 'leads');
    expect(leadsCall?.[1]).toBe('submittedAt');
    expect(leadsCall?.[5]).toBeUndefined();
  });

  it('counts a booking even when nobody answered a question, and counts full questionnaires apart', async () => {
    const leadFixtures: RawDoc[] = [
      // Booked from the modal, never answered anything: an appointment, not
      // an inquiry, and certainly not a completed questionnaire.
      {
        id: 'capture-booked',
        type: 'capture',
        status: 'partial',
        bookedSelfReported: true,
        email: 'a@b.com',
        submittedAt: '2026-01-15T12:00:00.000Z',
      },
      // A full questionnaire with every counted field answered.
      {
        id: 'lead-complete',
        type: 'meetgreet',
        submittedAt: '2026-01-15T13:00:00.000Z',
        email: 'c@d.com',
        ownerName: 'Ada',
        phone: '3475550100',
        neighborhood: 'North Williamsburg',
        dogName: 'Biscuit',
        breedAge: 'Terrier, 4',
        serviceInterest: 'Daily Group Walks',
        vaccinations: 'Yes',
        walkFrequency: '3x weekly',
        reactivity: 'None',
        allergies: 'None',
        phoneConsult: false,
        notes: 'Back gate',
      },
      // A questionnaire that stopped early: an inquiry, but not complete.
      { id: 'lead-partial', type: 'meetgreet', submittedAt: '2026-01-15T14:00:00.000Z', ownerName: 'Bo' },
    ];
    fsQueryRange.mockImplementation(rangeQueryMock([], leadFixtures));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.bookedLeads).toBe(1); // the capture, despite zero answers
    expect(report.completedQuestionnaires).toBe(1); // lead-complete only
    expect(report.inquiries).toBe(2); // both meetgreet documents
    expect(report.outstandingCaptures).toBe(1);
  });

  it('excludes capture documents from inquiries at the query level and counts outstanding ones separately', async () => {
    const leadFixtures: RawDoc[] = [
      // Two genuine completed questionnaires — these are the only documents
      // that should ever count as an inquiry.
      { id: 'lead-1', type: 'meetgreet', submittedAt: '2026-01-15T12:00:00.000Z' },
      { id: 'lead-2', type: 'meetgreet', submittedAt: '2026-01-15T13:00:00.000Z' },

      // A partial capture still waiting on the questionnaire — counts toward
      // outstandingCaptures, never toward inquiries.
      { id: 'capture-1', type: 'capture', status: 'partial', submittedAt: '2026-01-15T14:00:00.000Z' },

      // A capture that has since converted (the person came back and
      // completed the questionnaire, creating a separate meetgreet document
      // elsewhere). This row itself is neither an inquiry nor still
      // outstanding — it must not inflate either count.
      { id: 'capture-2', type: 'capture', status: 'converted', submittedAt: '2026-01-15T15:00:00.000Z' },

      // A legacy document written before the `type` field existed (schema
      // v1). Counting the window in memory rather than with an equality
      // filter is what keeps it visible: it is a real submitted lead and is
      // counted as an inquiry.
      { id: 'legacy-1', submittedAt: '2026-01-15T16:00:00.000Z' },

      // Out of range — must not appear in either count.
      { id: 'lead-3', type: 'meetgreet', submittedAt: '2026-01-14T20:00:00.000Z' },
    ];
    fsQueryRange.mockImplementation(rangeQueryMock([], leadFixtures));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.inquiries).toBe(3); // lead-1, lead-2 and the legacy document
    expect(report.outstandingCaptures).toBe(1); // capture-1 only
  });

  it('distinguishes no_data_yet (nothing ever recorded) from zero_activity (recorded before, nothing in this window)', async () => {


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
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const now = new Date('2026-11-01T17:00:00.000Z'); // noon NY, EST, after the transition
    const report = await getAnalyticsReport('today', { now });

    expect(report.pageviews).toBe(2);
    expect(report.sessions).toBe(2);
    expect(report.dailyTrend).toEqual([
      { date: '2026-11-01', pageviews: 2, sessions: 2, visitors: null, engagedSessions: 0, leadSaved: 0 },
    ]);
  });

  it('degrades gracefully when only the leads query fails', async () => {
    const events = rangeQueryMock([ev({ id: 'e1', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z' })]);
    fsQueryRange.mockImplementation(async (collectionId: string, ...rest: unknown[]) => {
      if (collectionId === 'leads') throw new Error('Firestore RANGE leads: 503 unavailable');
      return events(collectionId, ...(rest as [string, string, string]));
    });


    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.meta.status).toBe('partial_failure');
    expect(report.meta.degraded).toEqual(['leads']);
    expect(report.inquiries).toBeNull();
    expect(report.outstandingCaptures).toBeNull();
    expect(report.pageviews).toBe(1); // events leg still healthy
  });

  it('degrades gracefully when only the events query fails', async () => {
    // Only the events read fails; the leads read still answers.
    fsQueryRange.mockImplementation(async (collectionId: string, ...rest: unknown[]) => {
      if (collectionId === 'leads') {
        return rangeQueryMock([], leadDocs(3))(collectionId, ...(rest as [string, string, string]));
      }
      throw new Error('Firestore RANGE analytics_events: 503 unavailable');
    });

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.meta.status).toBe('partial_failure');
    expect(report.meta.degraded).toEqual(['events']);
    expect(report.inquiries).toBe(3); // leads leg still healthy
    expect(report.outstandingCaptures).toBe(0); // three completed leads, no captures
    expect(report.pageviews).toBe(0);
    expect(report.sessions).toBe(0);
    expect(report.live).toEqual({ windowMinutes: 60, startIso: '', endIso: '', pageviews: 0, sessions: 0, visitors: 0 });
  });

  it('throws (surfaces as a real failure) when both leads and events queries fail', async () => {
    fsQueryRange.mockRejectedValue(new Error('events down'));
    fsQueryRangeCount.mockRejectedValue(new Error('leads down'));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const { ServiceError } = await import('@/lib/server/errors');

    await expect(getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') })).rejects.toBeInstanceOf(ServiceError);
  });

  it('flags eventsTruncated when the bounded range query hits its row ceiling', async () => {

    fsQueryRange.mockImplementation(async (_c: string, _f: string, _s: string, _e: string, limit = 5000) =>
      Array.from({ length: limit }, (_, i) => ev({ id: `t${i}`, sid: `s${i}`, event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z' }))
    );

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: new Date('2026-01-15T18:00:00.000Z') });

    expect(report.meta.eventsTruncated).toBe(true);
  });

  describe('independent dependency availability', () => {
    const NOW = new Date('2026-01-15T18:00:00.000Z');
    const fixtures: RawDoc[] = [
      ev({ id: 'e0', sid: 'sess-0', event: 'page_view', receivedAt: '2026-01-01T12:00:00.000Z' }),
      ev({ id: 'e1', sid: 'sess-a', event: 'page_view', receivedAt: '2026-01-15T12:00:00.000Z' }),
      ev({ id: 'e2', sid: 'sess-live', event: 'page_view', receivedAt: '2026-01-15T17:30:00.000Z' }),
    ];
    type Leg = 'leads' | 'range' | 'live' | 'earliest';
    // Classifies each fsQueryRange call by its (collection, start, limit) shape.
    function failing(leg: Leg | null, empty = false) {
      const base = rangeQueryMock(empty ? [] : fixtures, leadDocs(2));
      return async (collectionId: string, field: string, start: string, end: string, limit = 5000, direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING') => {
        const which: Leg =
          collectionId === 'leads' ? 'leads' : start.startsWith('1970') ? 'earliest' : limit === 1000 ? 'live' : 'range';
        if (which === leg) throw new Error(`Firestore RANGE ${which}: 503 unavailable`);
        return base(collectionId, field, start, end, limit, direction);
      };
    }

    it('healthy report has no unavailable sections', async () => {
      fsQueryRange.mockImplementation(failing(null));
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.status).toBe('ok');
      expect(report.meta.unavailable).toEqual([]);
      expect(report.meta.degraded).toEqual([]);
    });

    it('live failure marks only live unavailable and keeps everything else', async () => {
      fsQueryRange.mockImplementation(failing('live'));
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.unavailable).toEqual(['live']);
      expect(report.meta.degraded).toEqual([]);
      expect(report.meta.status).toBe('partial_failure');
      expect(report.meta.trackingStartDate).toBe('2026-01-01T12:00:00.000Z');
      expect(report.pageviews).toBe(2);
      expect(report.inquiries).toBe(2);
    });

    it('first-event failure marks only trackingStart unavailable, not "no history"', async () => {
      fsQueryRange.mockImplementation(failing('earliest'));
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.unavailable).toEqual(['trackingStart']);
      expect(report.meta.trackingStartDate).toBeNull();
      expect(report.meta.status).toBe('partial_failure');
      expect(report.live.pageviews).toBe(1);
      expect(report.pageviews).toBe(2);
    });

    it('first-event failure with an empty range is partial_failure, never no_data_yet', async () => {
      fsQueryRange.mockImplementation(failing('earliest', true));
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.status).toBe('partial_failure');
    });

    it('events failure keeps live and trackingStart available', async () => {
      fsQueryRange.mockImplementation(failing('range'));
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.degraded).toEqual(['events']);
      expect(report.meta.unavailable).toEqual([]);
      expect(report.live.pageviews).toBe(1);
      expect(report.meta.trackingStartDate).toBe('2026-01-01T12:00:00.000Z');
    });

    it('leads failure keeps live and trackingStart available', async () => {
      fsQueryRange.mockImplementation(failing('leads'));
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.degraded).toEqual(['leads']);
      expect(report.meta.unavailable).toEqual([]);
      expect(report.inquiries).toBeNull();
    });

    it('true zero traffic is zero / no history, not unavailable', async () => {
      fsQueryRange.mockImplementation(failing(null, true));
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.status).toBe('no_data_yet');
      expect(report.meta.unavailable).toEqual([]);
      expect(report.meta.degraded).toEqual([]);
      expect(report.meta.trackingStartDate).toBeNull();
      expect(report.live.pageviews).toBe(0);
    });

    it('test mode: a live failure is still unavailable, and a healthy test report is not', async () => {
      const testFixtures = [ev({ id: 't1', sid: 'st', event: 'page_view', mode: 'test', receivedAt: '2026-01-15T17:30:00.000Z' })];
      const base = rangeQueryMock(testFixtures);
      fsQueryRange.mockImplementation(async (c: string, f: string, s: string, e: string, limit = 5000, d: 'ASCENDING' | 'DESCENDING' = 'ASCENDING') => {
        if (limit === 1000) throw new Error('live down');
        return base(c, f, s, e, limit, d);
      });
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const down = await getAnalyticsReport('today', { now: NOW, includeTest: true });
      expect(down.meta.testMode).toBe(true);
      expect(down.meta.unavailable).toEqual(['live']);
      expect(down.inquiries).toBeNull();

      fsQueryRange.mockImplementation(base);
      const ok = await getAnalyticsReport('today', { now: NOW, includeTest: true });
      expect(ok.meta.unavailable).toEqual([]);
      expect(ok.meta.status).toBe('ok');
    });

    it('truncation flag is unaffected by a live failure', async () => {
      fsQueryRange.mockImplementation(async (_c: string, _f: string, s: string, _e: string, limit = 5000) => {
        if (limit === 1000) throw new Error('live down');
        if (s.startsWith('1970')) return [];
        return Array.from({ length: limit }, (_, i) => ev({ id: `t${i}`, sid: `s${i}`, receivedAt: '2026-01-15T12:00:00.000Z' }));
      });
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      const report = await getAnalyticsReport('today', { now: NOW });
      expect(report.meta.eventsTruncated).toBe(true);
      expect(report.meta.unavailable).toEqual(['live']);
    });

    it('recovers on the next call once the dependency answers again', async () => {
      const { getAnalyticsReport } = await import('@/lib/analytics/report');
      fsQueryRange.mockImplementation(failing('live'));
      expect((await getAnalyticsReport('today', { now: NOW })).meta.unavailable).toEqual(['live']);
      fsQueryRange.mockImplementation(failing(null));
      const recovered = await getAnalyticsReport('today', { now: NOW });
      expect(recovered.meta.unavailable).toEqual([]);
      expect(recovered.meta.status).toBe('ok');
      expect(recovered.live.pageviews).toBe(1);
    });
  });
});

describe('rolling, custom ranges and session-quality metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const NOW = new Date('2026-01-15T18:00:00.000Z'); // 13:00 NY (EST)

  it('computes bounce, pages per session, duration floor and abandonment by furthest step', async () => {
    const fixtures: RawDoc[] = [
      // s1: one page, nothing else -> bounce.
      ev({ id: 'a1', sid: 's1', receivedAt: '2026-01-15T12:00:00.000Z', src: 'direct' }),
      // s2: two pages a minute apart -> not a bounce, 60s.
      ev({ id: 'b1', sid: 's2', receivedAt: '2026-01-15T12:00:00.000Z', src: 'direct' }),
      ev({ id: 'b2', sid: 's2', receivedAt: '2026-01-15T12:01:00.000Z', route: '/book' }),
      // s3: form opened, reached details, never saved -> abandoned at details, 30s.
      ev({ id: 'c1', sid: 's3', receivedAt: '2026-01-15T13:00:00.000Z', src: 'direct' }),
      ev({ id: 'c2', sid: 's3', event: 'booking_form_start', receivedAt: '2026-01-15T13:00:05.000Z' }),
      ev({ id: 'c3', sid: 's3', event: 'booking_step', step: 'details', receivedAt: '2026-01-15T13:00:30.000Z' }),
      // s4: form opened only -> abandoned at 'started', 10s.
      ev({ id: 'd1', sid: 's4', receivedAt: '2026-01-15T14:00:00.000Z', src: 'direct' }),
      ev({ id: 'd2', sid: 's4', event: 'booking_form_start', receivedAt: '2026-01-15T14:00:10.000Z' }),
      // s5: one page but engaged -> not a bounce, 20s.
      ev({ id: 'e1', sid: 's5', receivedAt: '2026-01-15T15:00:00.000Z', src: 'direct' }),
      ev({ id: 'e2', sid: 's5', event: 'engagement', receivedAt: '2026-01-15T15:00:20.000Z' }),
      // s6: completed booking -> never abandonment.
      ev({ id: 'f1', sid: 's6', event: 'booking_form_start', receivedAt: '2026-01-15T16:00:00.000Z', src: 'direct' }),
      ev({ id: 'f2', sid: 's6', event: 'booking_step', step: 'review', receivedAt: '2026-01-15T16:00:10.000Z' }),
      ev({ id: 'f3', sid: 's6', event: 'lead_saved', receivedAt: '2026-01-15T16:00:20.000Z' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: NOW });

    expect(report.sessions).toBe(6);
    expect(report.bouncedSessions).toBe(1);
    expect(report.bounceRatePct).toBeCloseTo(100 / 6, 5);
    expect(report.pagesPerSession).toBeCloseTo(6 / 6, 5);
    // Spans: s2 60, s3 30, s4 10, s5 20, s6 20 (s1 has one event and is left out).
    expect(report.sessionDuration).toMatchObject({ measuredSessions: 5, medianSeconds: 20, meanSeconds: 28 });
    expect(report.funnel.abandonment).toEqual([
      { lastStep: 'started', sessions: 1 },
      { lastStep: 'details', sessions: 1 },
      { lastStep: 'dog', sessions: 0 },
      { lastStep: 'review', sessions: 0 },
      { lastStep: 'schedule', sessions: 0 },
    ]);
  });

  it('counts unique, new and returning visitors from visitor ids, leaving id-less sessions out', async () => {
    const fixtures: RawDoc[] = [
      // v1: first-ever visit, then a second tab later -> one new visitor, two sessions.
      ev({ id: 'a1', sid: 's1', vid: 'v1', vr: 'new', receivedAt: '2026-01-15T12:00:00.000Z', src: 'direct' }),
      ev({ id: 'a2', sid: 's2', vid: 'v1', vr: 'returning', receivedAt: '2026-01-15T14:00:00.000Z', src: 'direct' }),
      // v2: visited before this range -> returning.
      ev({ id: 'b1', sid: 's3', vid: 'v2', vr: 'returning', receivedAt: '2026-01-15T13:00:00.000Z', src: 'direct' }),
      ev({ id: 'b2', sid: 's3', vid: 'v2', receivedAt: '2026-01-15T13:01:00.000Z', route: '/book' }),
      // s4: from before visitor tracking -> a session, but no visitor.
      ev({ id: 'c1', sid: 's4', receivedAt: '2026-01-15T15:00:00.000Z', src: 'direct' }),
      // vr on a non-attribution event is ignored, and a malformed vid is dropped.
      ev({ id: 'd1', sid: 's5', vid: 'bad id!', receivedAt: '2026-01-15T16:00:00.000Z', src: 'direct' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));

    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: NOW });

    expect(report.sessions).toBe(5);
    expect(report.visitors).toBe(2);
    expect(report.visitorBreakdown).toMatchObject({
      newVisitors: 1,
      returningVisitors: 1,
      sessionsWithVisitorId: 3,
      sessionsPerVisitor: 1.5,
    });
    expect(report.dailyTrend[0].visitors).toBe(2);
  });

  it('reports visitors as null (not zero) for a range with sessions but no visitor ids', async () => {
    fsQueryRange.mockImplementation(rangeQueryMock([ev({ id: 'a1', sid: 's1', receivedAt: '2026-01-15T12:00:00.000Z', src: 'direct' })], leadDocs(0)));
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('today', { now: NOW });
    expect(report.sessions).toBe(1);
    expect(report.visitors).toBeNull();
    expect(report.visitorBreakdown).toMatchObject({ newVisitors: null, returningVisitors: null, sessionsWithVisitorId: 0, sessionsPerVisitor: null });
    expect(report.dailyTrend[0].visitors).toBeNull();
  });

  it('reports null rates (not zero) when there are no sessions', async () => {
    fsQueryRange.mockImplementation(rangeQueryMock([], leadDocs(0)));
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('7d', { now: NOW });
    expect(report.bounceRatePct).toBeNull();
    expect(report.pagesPerSession).toBeNull();
    expect(report.sessionDuration).toMatchObject({ measuredSessions: 0, medianSeconds: null, meanSeconds: null });
  });

  it("'24h' is the rolling 24 hours ending now, bucketed into the NY dates it touches", async () => {
    const fixtures: RawDoc[] = [
      ev({ id: 'out', sid: 'old', receivedAt: '2026-01-14T17:59:59.000Z' }),
      ev({ id: 'in1', sid: 'y', receivedAt: '2026-01-14T19:00:00.000Z' }),
      ev({ id: 'in2', sid: 't', receivedAt: '2026-01-15T17:00:00.000Z' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport('24h', { now: NOW });

    expect(report.range).toMatchObject({ key: '24h', startIso: '2026-01-14T18:00:00.000Z', endIso: '2026-01-15T18:00:00.000Z', days: 2 });
    expect(report.pageviews).toBe(2);
    expect(report.dailyTrend.map((d) => [d.date, d.pageviews])).toEqual([['2026-01-14', 1], ['2026-01-15', 1]]);
  });

  it('a custom span covers whole NY calendar dates, inclusive', async () => {
    const fixtures: RawDoc[] = [
      ev({ id: 'before', sid: 'a', receivedAt: '2026-01-10T04:59:59.000Z' }), // 23:59 NY on the 9th
      ev({ id: 'first', sid: 'b', receivedAt: '2026-01-10T05:00:00.000Z' }),
      ev({ id: 'last', sid: 'c', receivedAt: '2026-01-13T04:59:59.000Z' }), // 23:59 NY on the 12th
      ev({ id: 'after', sid: 'd', receivedAt: '2026-01-13T05:00:00.000Z' }),
    ];
    fsQueryRange.mockImplementation(rangeQueryMock(fixtures, leadDocs(0)));
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const report = await getAnalyticsReport({ from: '2026-01-10', to: '2026-01-12' }, { now: NOW });

    expect(report.range).toMatchObject({ key: 'custom', startIso: '2026-01-10T05:00:00.000Z', endIso: '2026-01-13T05:00:00.000Z', days: 3 });
    expect(report.pageviews).toBe(2);
    expect(report.dailyTrend.map((d) => d.date)).toEqual(['2026-01-10', '2026-01-11', '2026-01-12']);
  });

  it('parseReportSpec accepts presets, 24h and valid custom spans, and rejects bad custom input', async () => {
    const { parseReportSpec } = await import('@/lib/analytics/report');
    const p = (q: Record<string, string>) => parseReportSpec(q, '30d', NOW);

    expect(p({ range: '7d' })).toEqual({ ok: true, spec: '7d' });
    expect(p({ range: '24h' })).toEqual({ ok: true, spec: '24h' });
    expect(p({ range: 'bogus' })).toEqual({ ok: true, spec: '30d' });
    expect(p({ from: '2026-01-01', to: '2026-01-15', range: '7d' })).toEqual({ ok: true, spec: { from: '2026-01-01', to: '2026-01-15' } });

    expect(p({ from: '2026-01-01' }).ok).toBe(false);
    expect(p({ from: '2026-02-30', to: '2026-03-01' }).ok).toBe(false);
    expect(p({ from: '2026-01-10', to: '2026-01-09' }).ok).toBe(false);
    expect(p({ from: '2026-01-10', to: '2026-01-16' }).ok).toBe(false); // future
    expect(p({ from: '2025-10-01', to: '2026-01-15' }).ok).toBe(false); // > 90 days
    expect(p({ from: '2024-11-01', to: '2024-11-02' }).ok).toBe(false); // past retention
  });
});
