/**
 * Plan 013 P1 (F01, F02, F04, F11 budgets): regression tests for the lead
 * intake routes. These invert the audit reproductions in
 * docs/audits/2026-10-01-evidence/intake-repro.test.ts.txt, which asserted the
 * defects; each test here asserts the correct behavior. Firestore is an
 * in-memory fake with update-time preconditions (tests/unit/lead-firestore-fake.ts);
 * the real-Firestore proof is lead-intake-emulator.test.ts. Email is mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fsFake } from './lead-firestore-fake';
import { captureIdForEmail } from '@/lib/server/leadTransitions';
import { UpstreamTimeoutError } from '@/lib/server/errors';

vi.mock('@/lib/server/firestoreRest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/firestoreRest')>('@/lib/server/firestoreRest');
  const { fsFake } = await import('./lead-firestore-fake');
  fsFake.PreconditionError = actual.FirestorePreconditionError;
  return { ...actual, ...fsFake.api };
});

const sendEmail = vi.fn(async () => ({ data: { id: 'mock-email-id' }, error: null }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'onboarding@resend.dev',
  getFounderEmail: () => 'founder@example.test',
}));

const NOW = Date.parse('2026-10-01T01:00:00Z');
const OWNER = 'owner@example.test';

function req(path: string, body: unknown, ip = '192.0.2.1') {
  return new Request(`https://example.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const capture = async (body: unknown, ip?: string) =>
  (await import('@/app/api/leads/capture/route')).POST(req('/api/leads/capture', body, ip));
const meetgreet = async (body: unknown, ip?: string) =>
  (await import('@/app/api/leads/meetgreet/route')).POST(req('/api/leads/meetgreet', body, ip));

const captureBody = (extra: Record<string, unknown> = {}) => ({ email: OWNER, source: 'home', ...extra });
const finalBody = (extra: Record<string, unknown> = {}) => ({
  ownerName: 'Test Owner',
  phone: '(347) 555-0100',
  email: OWNER,
  neighborhood: 'North Williamsburg',
  dogName: 'Biscuit',
  breedAge: 'Golden, 3 years',
  serviceInterest: 'Daily Group Walks',
  vaccinations: 'Yes — fully vaccinated',
  walkFrequency: 'Daily (Mon–Fri)',
  notes: '',
  source: 'book-page',
  reactivity: 'None',
  allergies: 'None',
  phoneConsult: true,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  fsFake.reset();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => vi.restoreAllMocks());

describe('F01 — rate-limit counters are namespaced by purpose', () => {
  it('five captures do not exhaust the final submission', async () => {
    for (let i = 0; i < 5; i++) expect((await capture(captureBody())).status).toBe(200);
    const res = await meetgreet(finalBody());
    expect(res.status).toBe(200);
    const keys = [...fsFake.counters.keys()];
    expect(keys).toHaveLength(2);
    expect(keys.some((k) => k.startsWith('leadRateLimits/capture_'))).toBe(true);
    expect(keys.some((k) => k.startsWith('leadRateLimits/meetgreet_'))).toBe(true);
  });

  it('capture still enforces its own limit of 8 per window, with Retry-After', async () => {
    for (let i = 0; i < 8; i++) expect((await capture(captureBody(), '198.51.100.8')).status).toBe(200);
    const blocked = await capture(captureBody(), '198.51.100.8');
    expect(blocked.status).toBe(429);
    const retryAfter = Number(blocked.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(900);
    // The exhausted capture allowance does not touch the final submission.
    expect((await meetgreet(finalBody(), '198.51.100.8')).status).toBe(200);
  });

  it('meetgreet still enforces its own limit of 5 per window, with Retry-After', async () => {
    for (let i = 0; i < 5; i++) expect((await meetgreet(finalBody(), '198.51.100.5')).status).toBe(200);
    const blocked = await meetgreet(finalBody(), '198.51.100.5');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1);
    expect((await capture(captureBody(), '198.51.100.5')).status).toBe(200);
  });

  it('keeps the TTL timestamp seed on both counters', async () => {
    await capture(captureBody());
    await meetgreet(finalBody());
    for (const seed of fsFake.counterSeeds.values()) {
      expect(seed.expiresAt).toBeInstanceOf(Date);
      expect((seed.expiresAt as Date).getTime()).toBeGreaterThan(NOW + 47 * 3600 * 1000);
      expect(typeof seed.windowStart).toBe('number');
    }
  });

  it('fails open when the limiter errors or stalls (documented policy)', async () => {
    fsFake.api.fsIncrementField.mockRejectedValueOnce(new Error('firestore unavailable'));
    expect((await capture(captureBody())).status).toBe(200);
    fsFake.api.fsIncrementField.mockRejectedValueOnce(new UpstreamTimeoutError('firestore', 'increment', 1500));
    expect((await meetgreet(finalBody())).status).toBe(200);
  });
});

describe('F02 — capture cannot undo conversion or a booking hint', () => {
  it('a conversion landing between read and write survives the capture', async () => {
    const id = captureIdForEmail(OWNER);
    fsFake.write(`leads/${id}`, { status: 'partial', submittedAt: '2026-10-01T00:00:00Z', bookedSelfReported: false });
    fsFake.interleave = {
      match: (p) => p === `leads/${id}`,
      run: () => fsFake.write(`leads/${id}`, { status: 'converted', convertedLeadId: 'full-lead', convertedAt: '2026-10-01T00:30:00Z' }),
    };
    expect((await capture(captureBody())).status).toBe(200);
    expect(fsFake.data(`leads/${id}`)).toMatchObject({
      status: 'converted',
      convertedLeadId: 'full-lead',
      convertedAt: '2026-10-01T00:30:00Z',
      submittedAt: '2026-10-01T00:00:00Z',
    });
    expect(fsFake.callsTo('fsMergeDoc').length).toBeGreaterThanOrEqual(2); // first attempt conflicted, second landed
  });

  it('a stale false hint never overwrites a concurrent true one', async () => {
    const id = captureIdForEmail(OWNER);
    fsFake.write(`leads/${id}`, { status: 'partial', submittedAt: '2026-10-01T00:00:00Z' });
    fsFake.interleave = { match: (p) => p === `leads/${id}`, run: () => fsFake.write(`leads/${id}`, { bookedSelfReported: true }) };
    await capture(captureBody()); // no booked signal
    expect(fsFake.data(`leads/${id}`)?.bookedSelfReported).toBe(true);
  });

  it('a later non-booked capture leaves an earlier true hint in place', async () => {
    await capture(captureBody({ booked: true }));
    await capture(captureBody());
    expect(fsFake.data(`leads/${captureIdForEmail(OWNER)}`)?.bookedSelfReported).toBe(true);
  });

  it('keeps the original first-seen time on re-capture', async () => {
    const id = captureIdForEmail(OWNER);
    fsFake.write(`leads/${id}`, { status: 'partial', submittedAt: '2020-01-01T00:00:00.000Z' });
    await capture(captureBody());
    expect(fsFake.data(`leads/${id}`)?.submittedAt).toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('F04 — capture enforces a real 4,000-byte cap', () => {
  it('rejects a Unicode body over 4,000 UTF-8 bytes with no content-length', async () => {
    const body = JSON.stringify({ ...captureBody(), unused: '€'.repeat(2000) });
    expect(Buffer.byteLength(body, 'utf8')).toBeGreaterThan(6000);
    expect(body.length).toBeLessThan(4000 + 200); // character count alone would pass a naive check
    const res = await capture(body);
    expect(res.status).toBe(413);
    expect(fsFake.callsTo('fsGetDoc')).toHaveLength(0);
    expect(fsFake.callsTo('fsMergeDoc')).toHaveLength(0);
  });

  it('answers 400, not a crash, when the body stream dies mid-read', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"email":'));
        controller.error(new Error('client went away'));
      },
    });
    const { POST } = await import('@/app/api/leads/capture/route');
    const res = await POST(
      new Request('https://example.test/api/leads/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: stream,
        duplex: 'half',
      } as RequestInit),
    );
    expect(res.status).toBe(400);
  });
});

describe('F11 — dependency budgets and timeouts', () => {
  it('passes a bounded per-call timeout on every capture dependency call', async () => {
    await capture(captureBody());
    expect(fsFake.calls.length).toBeGreaterThan(0);
    for (const c of fsFake.calls) {
      expect(typeof c.opts?.timeoutMs).toBe('number');
      expect(c.opts!.timeoutMs!).toBeGreaterThan(0);
      expect(c.opts!.timeoutMs!).toBeLessThanOrEqual(2_500);
    }
  });

  it('passes bounded per-call timeouts on every meetgreet dependency call and finishes within budget', async () => {
    await meetgreet(finalBody());
    expect(fsFake.callsTo('fsCreateDoc')).toHaveLength(1);
    for (const c of fsFake.calls) {
      expect(typeof c.opts?.timeoutMs).toBe('number');
      expect(c.opts!.timeoutMs!).toBeLessThanOrEqual(3_000);
    }
  });

  it('a stalled Firestore read in capture is a clean 500, not a hang or leak', async () => {
    const timeout = new UpstreamTimeoutError('firestore', 'get', 2500);
    fsFake.api.fsGetDoc.mockRejectedValueOnce(timeout);
    const res = await capture(captureBody());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/timed out|firestore/i);
  });

  it('a stalled Firestore create in meetgreet is a clean 500 and sends no email', async () => {
    fsFake.api.fsCreateDoc.mockRejectedValueOnce(new UpstreamTimeoutError('firestore', 'create', 3000));
    const res = await meetgreet(finalBody());
    expect(res.status).toBe(500);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('notifications never undo or duplicate a saved lead', () => {
  it('keeps the lead when the email provider fails, and does not retry the send', async () => {
    sendEmail.mockResolvedValueOnce({ data: null, error: { message: 'send failed' } } as never);
    const res = await meetgreet(finalBody());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.notifications.founder).toBe('failed');
    expect(fsFake.callsTo('fsCreateDoc')).toHaveLength(1);
    expect(fsFake.data(`leads/${json.id}`)).toBeDefined();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('keeps the lead when the email provider throws', async () => {
    sendEmail.mockRejectedValueOnce(new Error('provider down'));
    const res = await meetgreet(finalBody());
    expect(res.status).toBe(200);
    expect(fsFake.data(`leads/${(await res.json()).id}`)).toBeDefined();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('a duplicate final submission creates one lead and sends one email', async () => {
    const a = await meetgreet(finalBody());
    const b = await meetgreet(finalBody());
    expect((await b.json()).duplicate).toBe(true);
    expect((await a.json()).id).toBeDefined();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
