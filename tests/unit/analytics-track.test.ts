import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// track.ts delegates session/attribution/engagement bookkeeping to
// lib/analytics/session.ts (covered on its own in analytics-session.test.ts).
// Mocked here so these tests exercise only track.ts's own responsibilities:
// gating, event/field shaping, and transport.
const getSessionSnapshot = vi.fn();
const newOpaqueId = vi.fn(() => 'evt-fixed-id');
const noteEngagementSignal = vi.fn(() => false);

vi.mock('@/lib/analytics/session', () => ({
  getSessionSnapshot: () => getSessionSnapshot(),
  newOpaqueId: () => newOpaqueId(),
  noteEngagementSignal: () => noteEngagementSignal(),
}));

import { sanitize, track } from '@/lib/analytics/track';

// Regression coverage for the review finding on lib/analytics/track.ts: the
// sanitizer used to check only key names, so an email/phone value sitting
// under an *allowed* key (or a nested/array structure) shipped unfiltered.
// Every vector the reviewer used to defeat the old version is reproduced
// here as its own case.

describe('sanitize', () => {
  it('drops a value that is itself an email, even under an allowed key', () => {
    const result = sanitize({ cta: 'visitor@example.com' });
    expect(result).not.toHaveProperty('cta');
  });

  it('drops a value that is itself a phone number, even under an allowed key', () => {
    const result = sanitize({ source: '(347) 610-9676' });
    expect(result).not.toHaveProperty('source');
  });

  it('drops a key whose name only aliases a blocked term', () => {
    const result = sanitize({ emailAddress: 'visitor@example.com', customerEmail: 'x@y.com', dogName: 'Biscuit' });
    expect(result).toEqual({});
  });

  it('sanitizes each array element instead of comma-joining unfiltered', () => {
    const singleSensitive = sanitize({ page: ['visitor@example.com'] });
    expect(singleSensitive).not.toHaveProperty('page');

    const mixed = sanitize({ page: ['home', 'visitor@example.com'] });
    expect(mixed.page).toBe('home');
    expect(mixed.page).not.toContain('@');
  });

  it('drops a nested object outright rather than serializing it', () => {
    const result = sanitize({ cta: { secret: 'visitor@example.com', nested: { deeper: 'x@y.com' } } });
    expect(result).not.toHaveProperty('cta');
  });

  it('drops null/undefined values without error', () => {
    const result = sanitize({ page: undefined, source: null as unknown as undefined });
    expect(result).toEqual({});
  });

  it('still allows ordinary, non-sensitive values through unchanged', () => {
    const result = sanitize({ page: 'home', cta: 'closing_trust_book', source: 'services', step: '2' });
    expect(result).toEqual({ page: 'home', cta: 'closing_trust_book', source: 'services', step: '2' });
  });
});

describe('track', () => {
  it('is a no-op (does not throw, does not require a DOM) with no endpoint configured', () => {
    expect(() => track('cta_click', { cta: 'closing_trust_book', page: 'home' })).not.toThrow();
  });

  it('is a no-op even when called with an email-shaped value', () => {
    expect(() => track('lead_saved', { source: 'visitor@example.com' })).not.toThrow();
  });
});

function fakeWindow(pathname = '/services') {
  return { location: { pathname } };
}

async function beaconBody(sendBeacon: ReturnType<typeof vi.fn>, callIndex = 0): Promise<Record<string, unknown>> {
  const blob = sendBeacon.mock.calls[callIndex][1] as Blob;
  const [event] = JSON.parse(await blob.text());
  return event;
}

describe('track — gating (decision 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionSnapshot.mockReturnValue({ id: 'sess-1', attribution: { src: 'direct' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends nothing when NEXT_PUBLIC_ANALYTICS_ENABLED is unset (default off)', () => {
    vi.stubGlobal('window', fakeWindow());
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('page_view', {});

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(getSessionSnapshot).not.toHaveBeenCalled();
  });

  it('sends an event once explicitly enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    vi.stubGlobal('window', fakeWindow());
    // Typed via the generic, not a named-but-unused parameter, so
    // `.mock.calls[0][0]` below still knows it's the beacon URL.
    const sendBeacon = vi.fn<(url: string, data?: BodyInit) => boolean>(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('page_view', {});

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/track');
  });

  it('stamps mode: "test" on every event when test mode is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_TEST_MODE', 'true');
    vi.stubGlobal('window', fakeWindow());
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('page_view', {});

    const event = await beaconBody(sendBeacon);
    expect(event.mode).toBe('test');
  });

  it('never tracks admin routes, even when enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    vi.stubGlobal('window', fakeWindow('/admin/dashboard'));
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('page_view', {});

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('degrades to a silent no-op when the session is unavailable (private mode, etc.)', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    getSessionSnapshot.mockReturnValue(null);
    vi.stubGlobal('window', fakeWindow());
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    expect(() => track('page_view', {})).not.toThrow();
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});

describe('track — delivery transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    getSessionSnapshot.mockReturnValue({ id: 'sess-1', attribution: { src: 'direct' } });
    vi.stubGlobal('window', fakeWindow());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('falls back to fetch when sendBeacon returns false (not just when it throws)', () => {
    const sendBeacon = vi.fn(() => false);
    // Typed via the generic (see the sendBeacon mock above) so
    // `.mock.calls[0][0]` below still knows it's the fetch URL.
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response(null, { status: 202 })),
    );
    vi.stubGlobal('navigator', { sendBeacon });
    vi.stubGlobal('fetch', fetchMock);

    track('page_view', {});

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/track');
  });

  it('uses fetch directly when sendBeacon is unavailable', () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 202 })));
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', fetchMock);

    track('page_view', {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not throw, and does not produce an unhandled rejection, when the fetch fallback rejects', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', fetchMock);

    expect(() => track('page_view', {})).not.toThrow();
    // Let the rejected promise's internal .catch() run before the test ends.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('track — cta_click / booking_step field handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'true');
    getSessionSnapshot.mockReturnValue({ id: 'sess-1', attribution: { src: 'direct' } });
    vi.stubGlobal('window', fakeWindow());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends nothing for a cta_click with no allowlisted cta id', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('cta_click', {});

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('sends nothing for a booking_step with an unrecognized step name', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('booking_step', { step: 'not-a-real-step' });

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('sends a valid cta_click and, on the first qualifying click, also fires engagement', async () => {
    noteEngagementSignal.mockReturnValueOnce(true);
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('cta_click', { cta: 'closing_trust_book', page: 'home' });

    expect(sendBeacon).toHaveBeenCalledTimes(2); // cta_click + engagement
    const first = await beaconBody(sendBeacon, 0);
    const second = await beaconBody(sendBeacon, 1);
    expect(first.event).toBe('cta_click');
    expect(first.cta).toBe('closing_trust_book');
    expect(second.event).toBe('engagement');
  });

  it('does not fire a second engagement event once the session already sent one', () => {
    noteEngagementSignal.mockReturnValue(false);
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    track('cta_click', { cta: 'closing_trust_book', page: 'home' });

    expect(sendBeacon).toHaveBeenCalledTimes(1); // cta_click only
  });
});
