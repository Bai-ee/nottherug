/**
 * API-level coverage for app/api/track/route.ts. Firestore is mocked —
 * nothing here reaches a network. Mirrors the mocking style established in
 * tests/unit/lead-intake.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EVENTS_COLLECTION, MAX_BATCH_EVENTS } from '@/lib/analytics/events';

let createdPaths: Set<string>;
let docsByPath: Map<string, Record<string, unknown>>;
let rateLimitCounts: Map<string, number>;

const fsCreateDoc = vi.fn(async (path: string, data: Record<string, unknown> = {}) => {
  if (createdPaths.has(path)) return { created: false };
  createdPaths.add(path);
  docsByPath.set(path, data);
  return { created: true };
});

const fsIncrementField = vi.fn(async (path: string, _field: string, amount: number, _seed?: Record<string, unknown>) => {
  const next = (rateLimitCounts.get(path) ?? 0) + amount;
  rateLimitCounts.set(path, next);
  return next;
});

vi.mock('@/lib/server/firestoreRest', () => ({
  fsCreateDoc: (path: string, data?: Record<string, unknown>) => fsCreateDoc(path, data),
  fsIncrementField: (path: string, field: string, amount: number, seed?: Record<string, unknown>) =>
    fsIncrementField(path, field, amount, seed),
}));

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  origin: 'http://localhost',
  host: 'localhost',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Test',
};

let idCounter = 0;
function makeEvent(overrides: Record<string, unknown> = {}) {
  idCounter += 1;
  return {
    event: 'page_view',
    id: `evt-${idCounter}`,
    sid: 'sess-abc123',
    ts: Date.now(),
    route: '/services',
    ...overrides,
  };
}

function rawRequest(body: string, headers: Record<string, string>) {
  return new Request('http://localhost/api/track', { method: 'POST', headers, body });
}

async function post(events: unknown, headers: Record<string, string> = DEFAULT_HEADERS) {
  const { POST } = await import('@/app/api/track/route');
  return POST(rawRequest(JSON.stringify(events), headers));
}

async function postRaw(text: string, headers: Record<string, string> = DEFAULT_HEADERS) {
  const { POST } = await import('@/app/api/track/route');
  return POST(rawRequest(text, headers));
}

beforeEach(() => {
  vi.clearAllMocks();
  createdPaths = new Set();
  docsByPath = new Map();
  rateLimitCounts = new Map();
  idCounter = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validation', () => {
  it('stores a single valid event and reports it as stored', async () => {
    const res = await post([makeEvent()]);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json).toMatchObject({ ok: true, stored: 1, duplicate: 0, rejected: 0 });
    expect(fsCreateDoc).toHaveBeenCalledTimes(1);
  });

  it('drops a malformed event but keeps the valid ones in the same batch', async () => {
    const res = await post([makeEvent(), { event: 'not-a-real-event' }]);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.stored).toBe(1);
    expect(json.rejected).toBe(1);
    expect(fsCreateDoc).toHaveBeenCalledTimes(1);
  });

  it('never stores an unrecognized field a crafted payload attaches to the wrong event', async () => {
    const res = await post([makeEvent({ event: 'page_view', cta: 'closing_trust_book' })]);
    expect(res.status).toBe(202);

    const stored = Array.from(docsByPath.values())[0];
    expect(stored.cta).toBeUndefined();
  });

  it('rejects a batch larger than MAX_BATCH_EVENTS', async () => {
    const events = Array.from({ length: MAX_BATCH_EVENTS + 1 }, () => makeEvent());
    const res = await post(events);
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('rejects an empty batch', async () => {
    const res = await post([]);
    expect(res.status).toBe(400);
  });

  it('rejects a non-array body', async () => {
    const res = await post(makeEvent());
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('rejects syntactically invalid JSON', async () => {
    const res = await postRaw('{not valid json');
    expect(res.status).toBe(400);
  });

  it('rejects a request body over the byte cap without parsing it', async () => {
    const res = await postRaw('x'.repeat(20_000));
    expect(res.status).toBe(413);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });
});

describe('dedup by event id', () => {
  it('treats a retried event id as a duplicate, not an error, and does not double-store it', async () => {
    const event = makeEvent({ id: 'dup-1' });
    const first = await post([event]);
    const second = await post([event]);

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    const secondJson = await second.json();
    expect(secondJson.duplicate).toBe(1);
    expect(secondJson.stored).toBe(0);
    expect(docsByPath.size).toBe(1);
  });
});

describe('rate limiting', () => {
  it('returns 429 once the durable per-IP counter exceeds the window limit', async () => {
    fsIncrementField.mockResolvedValueOnce(99999);
    const res = await post([makeEvent()]);
    expect(res.status).toBe(429);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('fails open (still processes the request) if the rate-limit check itself errors', async () => {
    fsIncrementField.mockRejectedValueOnce(new Error('firestore unavailable'));
    const res = await post([makeEvent()]);
    expect(res.status).toBe(202);
    expect(fsCreateDoc).toHaveBeenCalledTimes(1);
  });
});

describe('same-origin, bot filtering, and the kill switch', () => {
  it('drops a cross-origin request without storing anything, but still responds success', async () => {
    const res = await post([makeEvent()], { ...DEFAULT_HEADERS, origin: 'https://evil.example' });
    expect(res.status).toBe(202);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('processes a request with no Origin header normally (absence is not proof of cross-origin)', async () => {
    const headers = { ...DEFAULT_HEADERS };
    delete headers.origin;
    const res = await post([makeEvent()], headers);
    expect(res.status).toBe(202);
    expect(fsCreateDoc).toHaveBeenCalledTimes(1);
  });

  it('drops a request with no User-Agent header, without storing anything', async () => {
    const headers = { ...DEFAULT_HEADERS };
    delete headers['user-agent'];
    const res = await post([makeEvent()], headers);
    expect(res.status).toBe(202);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('drops a request whose User-Agent matches an obvious bot/script pattern', async () => {
    const res = await post([makeEvent()], { ...DEFAULT_HEADERS, 'user-agent': 'curl/8.4.0' });
    expect(res.status).toBe(202);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('kill switch drops everything without touching Firestore', async () => {
    vi.stubEnv('ANALYTICS_TRACKING_DISABLED', 'true');
    const res = await post([makeEvent()]);
    expect(res.status).toBe(202);
    expect(fsCreateDoc).not.toHaveBeenCalled();
    expect(fsIncrementField).not.toHaveBeenCalled();
  });
});

describe('receivedAt is the reporting authority', () => {
  it('stores a server receivedAt ISO-8601 UTC string, keeping the client ts only as advisory clientTs', async () => {
    await post([makeEvent({ ts: 12345 })]);
    const stored = Array.from(docsByPath.values())[0];

    expect(stored.clientTs).toBe(12345);
    expect(typeof stored.receivedAt).toBe('string');
    expect(stored.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('never stores raw referrer URLs, arbitrary campaign text, or unknown fields', () => {
  it('drops a ref value that is a full URL instead of a bare hostname', async () => {
    await post([makeEvent({ src: 'referral', ref: 'https://google.com/path?x=1' })]);
    const stored = Array.from(docsByPath.values())[0];
    expect(stored.src).toBe('referral');
    expect(stored.ref).toBeUndefined();
  });

  it('drops a camp value outside the allowlisted campaign slugs', async () => {
    await post([makeEvent({ src: 'campaign', camp: 'my-custom-tracking-code' })]);
    const stored = Array.from(docsByPath.values())[0];
    expect(stored.src).toBe('campaign');
    expect(stored.camp).toBeUndefined();
  });

  it('never stores customer-shaped fields a crafted payload adds alongside a valid event', async () => {
    await post([makeEvent({ ownerName: 'Jane Doe', notes: 'secret request details' })]);
    const stored = Array.from(docsByPath.values())[0];
    expect(stored.ownerName).toBeUndefined();
    expect(stored.notes).toBeUndefined();
  });

  it('stores under the shared EVENTS_COLLECTION, keyed by the event id', async () => {
    await post([makeEvent({ id: 'evt-fixed' })]);
    expect(createdPaths.has(`${EVENTS_COLLECTION}/evt-fixed`)).toBe(true);
  });
});
