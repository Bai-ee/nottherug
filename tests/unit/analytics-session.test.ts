import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ENGAGEMENT_DWELL_MS, SESSION_TIMEOUT_MS } from '@/lib/analytics/events';
import { getSessionSnapshot, newOpaqueId, noteEngagementSignal, watchEngagement } from '@/lib/analytics/session';

function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
}

function throwingStorage(): Storage {
  const boom = () => {
    throw new Error('storage disabled (private mode)');
  };
  return { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 } as unknown as Storage;
}

type Listener = (...args: unknown[]) => void;

function stubBrowser(opts: {
  pathname?: string;
  search?: string;
  hostname?: string;
  referrer?: string;
  storage?: Storage;
} = {}) {
  const storage = opts.storage ?? makeMemoryStorage();
  const listeners: Record<string, Listener[]> = {};
  const win = {
    sessionStorage: storage,
    location: {
      pathname: opts.pathname ?? '/',
      search: opts.search ?? '',
      hostname: opts.hostname ?? 'nottherug.test',
    },
    scrollY: 0,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      (listeners[type] ??= []).push(handler);
    }),
    removeEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = (listeners[type] ?? []).filter((h) => h !== handler);
    }),
  };
  const doc = {
    referrer: opts.referrer ?? '',
    documentElement: { scrollHeight: 2000, clientHeight: 1000 },
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  return { storage, win, doc, listeners };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('newOpaqueId', () => {
  it('returns an isOpaqueId-shaped string', () => {
    stubBrowser();
    const id = newOpaqueId();
    expect(id.length).toBeGreaterThan(0);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('getSessionSnapshot — session lifecycle', () => {
  it('creates a session with attribution on the first call, and omits attribution afterward', () => {
    stubBrowser();
    const first = getSessionSnapshot();
    const second = getSessionSnapshot();

    expect(first).not.toBeNull();
    expect(first?.attribution).toBeDefined();
    expect(second?.id).toBe(first?.id);
    expect(second?.attribution).toBeUndefined();
  });

  it('keeps the same session id across calls within the timeout (rolling expiry)', () => {
    stubBrowser();
    const first = getSessionSnapshot();
    vi.setSystemTime(new Date(Date.now() + SESSION_TIMEOUT_MS - 1000));
    const second = getSessionSnapshot();

    expect(second?.id).toBe(first?.id);
  });

  it('starts a new session, with attribution again, after SESSION_TIMEOUT_MS of inactivity', () => {
    stubBrowser();
    const first = getSessionSnapshot();
    vi.setSystemTime(new Date(Date.now() + SESSION_TIMEOUT_MS + 1000));
    const second = getSessionSnapshot();

    expect(second?.id).not.toBe(first?.id);
    expect(second?.attribution).toBeDefined();
  });

  it('returns null (not a throw) when sessionStorage is unusable', () => {
    stubBrowser({ storage: throwingStorage() });
    expect(() => getSessionSnapshot()).not.toThrow();
    expect(getSessionSnapshot()).toBeNull();
  });
});

describe('getSessionSnapshot — attribution (decision 8)', () => {
  it('attributes an allowlisted campaign slug', () => {
    stubBrowser({ search: '?c=flyer' });
    const snapshot = getSessionSnapshot();
    expect(snapshot?.attribution).toEqual({ src: 'campaign', camp: 'flyer' });
  });

  it('falls through to direct/referral for a campaign slug not on the allowlist', () => {
    stubBrowser({ search: '?c=totally-made-up' });
    const snapshot = getSessionSnapshot();
    expect(snapshot?.attribution?.src).not.toBe('campaign');
  });

  it('attributes an external referrer by hostname only — never the full URL', () => {
    stubBrowser({ referrer: 'https://GOOGLE.com/search?q=dogs&secret=1', hostname: 'nottherug.test' });
    const snapshot = getSessionSnapshot();
    expect(snapshot?.attribution).toEqual({ src: 'referral', ref: 'google.com' });
  });

  it('treats a same-site referrer as direct, not referral', () => {
    stubBrowser({ referrer: 'https://nottherug.test/services', hostname: 'nottherug.test' });
    const snapshot = getSessionSnapshot();
    expect(snapshot?.attribution).toEqual({ src: 'direct' });
  });

  it('attributes direct when there is no campaign param and no referrer', () => {
    stubBrowser();
    const snapshot = getSessionSnapshot();
    expect(snapshot?.attribution).toEqual({ src: 'direct' });
  });
});

describe('noteEngagementSignal — fires at most once per session', () => {
  it('returns true the first time, false on every later call', () => {
    stubBrowser();
    expect(noteEngagementSignal()).toBe(true);
    expect(noteEngagementSignal()).toBe(false);
    expect(noteEngagementSignal()).toBe(false);
  });

  it('returns false (never true) when sessionStorage is unusable', () => {
    stubBrowser({ storage: throwingStorage() });
    expect(noteEngagementSignal()).toBe(false);
  });
});

describe('watchEngagement', () => {
  it('fires onEngaged once the dwell threshold passes', () => {
    stubBrowser();
    const onEngaged = vi.fn();
    watchEngagement(onEngaged);

    vi.advanceTimersByTime(ENGAGEMENT_DWELL_MS - 1);
    expect(onEngaged).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(onEngaged).toHaveBeenCalledTimes(1);
  });

  it('fires onEngaged once a scroll crosses the engagement ratio, and cancels the dwell timer', () => {
    const { win, listeners } = stubBrowser();
    const onEngaged = vi.fn();
    watchEngagement(onEngaged);

    win.scrollY = 600; // scrollable = 2000 - 1000 = 1000; ratio 0.6 >= ENGAGEMENT_SCROLL_RATIO (0.5)
    listeners.scroll?.forEach((h) => h());
    expect(onEngaged).toHaveBeenCalledTimes(1);

    // The dwell timer must have been cancelled by the scroll firing — advancing
    // past it must not produce a second call.
    vi.advanceTimersByTime(ENGAGEMENT_DWELL_MS + 1000);
    expect(onEngaged).toHaveBeenCalledTimes(1);
  });

  it('never re-arms listeners once the session already recorded engagement', () => {
    const { win } = stubBrowser();
    watchEngagement(() => {});
    vi.advanceTimersByTime(ENGAGEMENT_DWELL_MS + 1);
    const callsAfterFirstFire = (win.addEventListener as ReturnType<typeof vi.fn>).mock.calls.length;

    const onEngaged = vi.fn();
    const cleanup = watchEngagement(onEngaged);
    expect((win.addEventListener as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterFirstFire);

    vi.advanceTimersByTime(ENGAGEMENT_DWELL_MS + 1000);
    expect(onEngaged).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });

  it('never calls onEngaged when sessionStorage is unusable, and never throws', () => {
    stubBrowser({ storage: throwingStorage() });
    const onEngaged = vi.fn();
    expect(() => watchEngagement(onEngaged)).not.toThrow();
    vi.advanceTimersByTime(ENGAGEMENT_DWELL_MS + 1000);
    expect(onEngaged).not.toHaveBeenCalled();
  });
});
