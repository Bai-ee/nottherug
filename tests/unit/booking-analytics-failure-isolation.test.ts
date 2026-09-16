/**
 * T4 item 6 (plans/004-frontend-tracking-coverage.md, "MOST IMPORTANT"): a
 * booking must succeed — submitMeetGreetLead (components/booking/BookingForm.tsx)
 * must resolve { ok: true } — no matter how analytics behaves. Unlike
 * tests/unit/booking-form-analytics.test.ts, this file does NOT mock
 * '@/lib/analytics/track': it exercises the real tracker so these are true
 * integration-boundary proofs, not just "the mock wasn't called" checks.
 *
 * lib/analytics/session.ts is mocked the same way
 * tests/unit/analytics-track.test.ts mocks it, purely to isolate this from
 * sessionStorage/browser session bookkeeping, which is not the point here.
 *
 * Five cases, matching the plan's list exactly: disabled by env flag,
 * rejected by the server, rate limited (429), offline (network error), and
 * track() throwing synchronously.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getSessionSnapshot = vi.fn();
const newOpaqueId = vi.fn(() => 'evt-fixed-id');
const noteEngagementSignal = vi.fn(() => false);

vi.mock('@/lib/analytics/session', () => ({
  getSessionSnapshot: () => getSessionSnapshot(),
  newOpaqueId: () => newOpaqueId(),
  noteEngagementSignal: () => noteEngagementSignal(),
}));

function fakeWindow(pathname = '/book') {
  return { location: { pathname } };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const CUSTOMER_BODY = {
  ownerName: 'Test Owner',
  phone: '(347) 555-0100',
  email: 'owner@example.test',
  dogName: 'Biscuit',
  source: 'book-page',
};

// Routes a fetch call by URL so one mock can stand in for both the real lead
// endpoint (always succeeds here — the lead API's own behavior is covered
// elsewhere) and /api/track (varied per test to exercise each failure mode).
function routedFetch(trackHandler: (url: string) => Promise<Response> | Response) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/leads/meetgreet')) {
      return jsonResponse(200, { ok: true, id: 'lead-1', notifications: {} });
    }
    if (url.includes('/api/track')) {
      return trackHandler(url);
    }
    throw new Error(`unexpected fetch to ${url}`);
  });
}

describe('booking survives analytics failure (T4 item 6)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSessionSnapshot.mockReturnValue({ id: 'sess-1', attribution: { src: 'direct' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('1. tracking disabled by env flag: booking still succeeds', async () => {
    // NEXT_PUBLIC_ANALYTICS_ENABLED intentionally left unset — track() no-ops
    // before ever touching fetch, so /api/track must never be called.
    vi.stubGlobal('window', fakeWindow());
    vi.stubGlobal(
      'fetch',
      routedFetch(() => {
        throw new Error('must not call /api/track while analytics is disabled');
      }),
    );

    const { submitMeetGreetLead } = await import('@/components/booking/BookingForm');
    const result = await submitMeetGreetLead(CUSTOMER_BODY, 'book-page');

    expect(result.ok).toBe(true);
  });

  it('2. tracking rejected by the server (403 from /api/track): booking still succeeds', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    vi.stubGlobal('window', fakeWindow());
    vi.stubGlobal('navigator', {}); // no sendBeacon — forces track.ts's fetch fallback
    vi.stubGlobal('fetch', routedFetch(() => jsonResponse(403, { ok: false, error: 'forbidden' })));

    const { submitMeetGreetLead } = await import('@/components/booking/BookingForm');
    const result = await submitMeetGreetLead(CUSTOMER_BODY, 'book-page');

    expect(result.ok).toBe(true);
  });

  it('3. tracking rate limited (429 from /api/track): booking still succeeds', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    vi.stubGlobal('window', fakeWindow());
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', routedFetch(() => jsonResponse(429, { ok: false, error: 'rate limited' })));

    const { submitMeetGreetLead } = await import('@/components/booking/BookingForm');
    const result = await submitMeetGreetLead(CUSTOMER_BODY, 'book-page');

    expect(result.ok).toBe(true);
  });

  it('4. tracking offline (network error on /api/track): booking still succeeds', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    vi.stubGlobal('window', fakeWindow());
    vi.stubGlobal('navigator', {});
    vi.stubGlobal(
      'fetch',
      routedFetch(() => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const { submitMeetGreetLead } = await import('@/components/booking/BookingForm');
    const result = await submitMeetGreetLead(CUSTOMER_BODY, 'book-page');

    expect(result.ok).toBe(true);
    // Let track.ts's internal fetch-rejection .catch() settle before the test ends.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('5. track() throwing synchronously: booking still succeeds (regression — see safeTrack in BookingForm.tsx)', async () => {
    vi.doMock('@/lib/analytics/track', () => ({
      track: () => {
        throw new Error('simulated analytics failure');
      },
    }));
    vi.stubGlobal('window', fakeWindow());
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/leads/meetgreet')) return jsonResponse(200, { ok: true, id: 'lead-1', notifications: {} });
        throw new Error(`unexpected fetch to ${url}`);
      }),
    );

    const { submitMeetGreetLead } = await import('@/components/booking/BookingForm');
    const result = await submitMeetGreetLead(CUSTOMER_BODY, 'book-page');

    expect(result.ok).toBe(true);
  });
});
