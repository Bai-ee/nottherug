/**
 * Plan 017 reporting: confirmed-test exclusion, distinct bookings vs booking
 * events, "saved without scheduler" linkage to an earlier booking, review
 * flags, and the availability-change comparison setting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = Record<string, unknown>;
let events: Row[] = [];
let leads: Row[] = [];
let requests: Row[] = [];
let testDevices: Row[] = [];
let testSessions: Row[] = [];

function range(rows: Row[], field: string, start: string, end: string, limit = 5000) {
  return rows
    .filter((d) => String(d[field]) >= start && String(d[field]) < end)
    .sort((a, b) => String(a[field]).localeCompare(String(b[field])))
    .slice(0, limit);
}

vi.mock('@/lib/server/firestoreRest', () => ({
  fsQueryRange: vi.fn(async (collection: string, field: string, start: string, end: string, limit?: number) => {
    if (collection === 'leads') return range(leads, field, start, end, limit);
    if (collection === 'alternateTimeRequests') return range(requests, field, start, end, limit);
    return range(events, field, start, end, limit);
  }),
  fsQueryCollection: vi.fn(async (collection: string) => {
    if (collection === 'testDevices') return testDevices;
    if (collection === 'analyticsTestSessions') return testSessions;
    return [];
  }),
}));

const now = new Date('2026-01-15T20:00:00.000Z');
const at = (min: number) => new Date(Date.parse('2026-01-15T15:00:00.000Z') + min * 60_000).toISOString();
let n = 0;
const ev = (o: Row): Row => ({ event: 'page_view', id: `e${++n}`, sid: 's', route: '/', ...o });

beforeEach(() => {
  events = [];
  leads = [];
  requests = [];
  testDevices = [];
  testSessions = [];
});

describe('confirmed test activity', () => {
  it('excludes a marked test device by default and includes it on request', async () => {
    testDevices = [{ id: 'dev-1', createdAt: at(0) }];
    events = [
      ev({ sid: 'real', receivedAt: at(1) }),
      ev({ sid: 'tester', td: 'dev-1', receivedAt: at(2) }),
      ev({ sid: 'tester', td: 'dev-1', event: 'appointment_completed', bookingRef: 'a'.repeat(32), receivedAt: at(3) }),
    ];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const real = await getAnalyticsReport('today', { now });
    expect(real.sessions).toBe(1);
    expect(real.appointmentsScheduled).toBe(0);
    expect(real.bookingAvailability?.excludedTest.sessions).toBe(1);
    const all = await getAnalyticsReport('today', { now, includeTestActivity: true });
    expect(all.sessions).toBe(2);
    expect(all.meta.testView).toBe('with_test');
  });

  it('a forged test-device id that was never issued classifies nothing', async () => {
    events = [ev({ sid: 'x', td: 'made-up', receivedAt: at(1) })];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    expect((await getAnalyticsReport('today', { now })).sessions).toBe(1);
  });

  it('a lead marked test drops out with its session; names like "test" never classify', async () => {
    leads = [
      { id: 'l1', type: 'meetgreet', email: 'a@x.test', dogName: 'test', submittedAt: at(5), sid: 's1' },
      { id: 'l2', type: 'meetgreet', email: 'a@x.test', dogName: 'Rex', submittedAt: at(6), sid: 's2', testOverride: true },
    ];
    events = [
      ev({ sid: 's1', event: 'lead_saved', receivedAt: at(5) }),
      ev({ sid: 's2', event: 'lead_saved', receivedAt: at(6) }),
    ];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const r = await getAnalyticsReport('today', { now });
    expect(r.inquiries).toBe(1); // the "test" dog name still counts
    expect(r.sessions).toBe(1);
    expect(r.bookingAvailability?.excludedTest.leads).toBe(1);
    expect(r.distinctContacts).toBe(1);
  });

  it('a hand-marked session is excluded', async () => {
    testSessions = [{ sid: 'bad', markedAt: at(0) }];
    events = [ev({ sid: 'bad', receivedAt: at(1) }), ev({ sid: 'ok', receivedAt: at(1) })];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    expect((await getAnalyticsReport('today', { now })).sessions).toBe(1);
  });
});

describe('booking counts', () => {
  it('separates booking events, distinct bookings and unreferenced events', async () => {
    const ref1 = '1'.repeat(32);
    const ref2 = '2'.repeat(32);
    events = [
      ev({ sid: 'a', event: 'appointment_completed', bookingRef: ref1, receivedAt: at(1) }),
      ev({ sid: 'a', event: 'appointment_completed', bookingRef: ref2, receivedAt: at(2) }),
      ev({ sid: 'b', event: 'appointment_completed', receivedAt: at(3) }),
    ];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const b = (await getAnalyticsReport('today', { now })).bookingAvailability!;
    expect(b.bookingEvents).toBe(3);
    expect(b.distinctBookings).toBe(2);
    expect(b.bookingEventsWithoutId).toBe(1);
    expect(b.confirmedAppointments).toBeNull();
  });
});

describe('saved without scheduler', () => {
  it('recognizes an earlier booking from the same browser in a previous session', async () => {
    events = [
      ev({ sid: 'first', vid: 'b1', event: 'scheduling_dialog_opened', receivedAt: at(1) }),
      ev({ sid: 'first', vid: 'b1', event: 'appointment_completed', receivedAt: at(2) }),
      ev({ sid: 'later', vid: 'b1', event: 'lead_saved', receivedAt: at(90) }),
      ev({ sid: 'stranger', vid: 'b2', event: 'lead_saved', receivedAt: at(91) }),
    ];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const r = await getAnalyticsReport('today', { now });
    expect(r.funnel.savedSchedulerNotOpened).toBe(2);
    expect(r.funnel.savedLinkage).toEqual({ withSchedulerSameSession: 0, afterEarlierBooking: 1, unknown: 1 });
  });

  it('finds the earlier booking in the lookback window before the range', async () => {
    events = [
      ev({ sid: 'yesterday', vid: 'b1', event: 'appointment_completed', receivedAt: '2026-01-14T15:00:00.000Z' }),
      ev({ sid: 'today', vid: 'b1', event: 'lead_saved', receivedAt: at(10) }),
    ];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    expect((await getAnalyticsReport('today', { now })).funnel.savedLinkage?.afterEarlierBooking).toBe(1);
  });

  it('uses the lead record when it says the booking came first', async () => {
    leads = [{ id: 'l1', type: 'meetgreet', email: 'a@x.test', submittedAt: at(10), sid: 's9', bookedSelfReported: true }];
    events = [ev({ sid: 's9', event: 'lead_saved', receivedAt: at(10) })];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    expect((await getAnalyticsReport('today', { now })).funnel.savedLinkage?.afterEarlierBooking).toBe(1);
  });
});

describe('review flags', () => {
  it('flags three completions in minutes and a burst of email taps, without classifying them', async () => {
    events = [
      ...[0, 1, 2].map((i) => ev({ sid: 'burst', event: 'appointment_completed', receivedAt: at(i) })),
      ...[0, 1, 2, 3, 4, 5].map((i) => ev({ sid: 'mail', event: 'cta_click', cta: 'contact_email', receivedAt: at(30 + i / 10) })),
    ];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const r = await getAnalyticsReport('today', { now });
    const kinds = r.reviewFlags!.map((f) => `${f.kind}:${f.sid}:${f.count}`).sort();
    expect(kinds).toEqual(['rapid_email_clicks:mail:6', 'repeat_bookings:burst:3']);
    expect(r.sessions).toBe(2); // still counted: a flag is not a test mark
    expect(r.bookingAvailability?.emailLinkClicks).toBe(6);
    expect(r.bookingAvailability?.emailClickSessions).toBe(1);
  });
});

describe('availability change comparison', () => {
  it('reports missing configuration instead of inventing a date', async () => {
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const r = await getAnalyticsReport('7d', { now, env: {} });
    expect(r.availabilityChange).toEqual({ configured: false, envVar: 'BOOKING_AVAILABILITY_CHANGED_AT', reason: 'missing' });
  });

  it('rejects an ambiguous value without an offset', async () => {
    const { readAvailabilityChange } = await import('@/lib/analytics/bookingReport');
    expect(readAvailabilityChange({ BOOKING_AVAILABILITY_CHANGED_AT: '2026-01-10 09:00' })).toEqual({ ok: false, reason: 'invalid' });
  });

  it('compares equal windows either side of the recorded instant', async () => {
    events = [
      ev({ sid: 'before', event: 'scheduling_dialog_opened', receivedAt: '2026-01-09T15:00:00.000Z' }),
      ev({ sid: 'after', event: 'alt_time_request_opened', receivedAt: '2026-01-11T15:00:00.000Z' }),
    ];
    requests = [{ id: 'altreq_1', createdAt: '2026-01-11T16:00:00.000Z', status: 'new' }];
    const { getAnalyticsReport } = await import('@/lib/analytics/report');
    const r = await getAnalyticsReport('7d', { now, env: { BOOKING_AVAILABILITY_CHANGED_AT: '2026-01-10T14:00:00.000Z' } });
    const c = r.availabilityChange!;
    expect(c.configured).toBe(true);
    if (c.configured && c.before && c.after) {
      expect(c.before.schedulerOpenedSessions).toBe(1);
      expect(c.after.altRequestOpenedSessions).toBe(1);
      expect(c.after.altRequestsSaved).toBe(1);
      expect(c.before.altRequestsSaved).toBe(0);
    } else {
      throw new Error('expected a comparison');
    }
  });
});

describe('analytics privacy', () => {
  it('drops contact details and free text from new event payloads', async () => {
    const { sanitize } = await import('@/lib/analytics/track');
    expect(sanitize({ reason: 'validation', email: 'sam@example.test', note: 'call me', name: 'Sam' })).toEqual({ reason: 'validation' });
    const { validateEvent } = await import('@/lib/analytics/events');
    const v = validateEvent({ event: 'alt_time_request_failed', id: 'e1', sid: 's1', ts: 1, route: '/', reason: 'sam@example.test' });
    expect(v?.reason).toBeUndefined();
    const ok = validateEvent({ event: 'email_copied', id: 'e2', sid: 's1', ts: 1, route: '/contact', note: 'hello' });
    expect(ok).toEqual({ event: 'email_copied', id: 'e2', sid: 's1', ts: 1, route: '/contact' });
  });
});
