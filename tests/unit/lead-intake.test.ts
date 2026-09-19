/**
 * API-level coverage for app/api/leads/meetgreet/route.ts. Firebase and Resend
 * are mocked — nothing here reaches a network. Supersedes
 * tests/unit/lead-intake-baseline.test.ts, which documented the pre-fix bugs
 * (R01/R04): the current-form payload used to 400, and a JSON null body threw
 * instead of returning 400. Both are asserted fixed below.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HONEYPOT_FIELD_NAME, LEAD_FIELD_LIMITS } from '@/lib/leads/contract';

type CreateDocResult = { created: boolean };

let createdPaths: Set<string>;
// Backs fsGetDoc/fsSetDoc so the previous-bucket lookback in route.ts can see
// what fsCreateDoc actually stored, instead of the old always-empty stub.
let docsByPath: Map<string, Record<string, unknown>>;

const fsCreateDoc = vi.fn(async (path: string, data: Record<string, unknown> = {}): Promise<CreateDocResult> => {
  if (createdPaths.has(path)) return { created: false };
  createdPaths.add(path);
  docsByPath.set(path, data);
  return { created: true };
});
const fsGetDoc = vi.fn(async (path: string) => {
  const data = docsByPath.get(path);
  return data ? { exists: true, data } : { exists: false };
});
const fsSetDoc = vi.fn(async (path: string, data: Record<string, unknown> = {}) => {
  docsByPath.set(path, data);
});
const fsDeleteDoc = vi.fn(async () => {});
const fsQueryCollection = vi.fn(async () => [] as unknown[]);
const fsIncrementField = vi.fn(async () => 1);

vi.mock('@/lib/server/firestoreRest', () => ({
  fsCreateDoc,
  fsGetDoc,
  fsSetDoc,
  fsDeleteDoc,
  fsQueryCollection,
  fsIncrementField,
}));

type EmailResult = { data: { id: string } | null; error: { message: string } | null };

const sendEmail = vi.fn(async (): Promise<EmailResult> => ({ data: { id: 'mock-email-id' }, error: null }));
// Ends with '@resend.dev' — the route's sandbox check (matching a real Resend
// sandbox sender) is a plain suffix match, so a bracket-wrapped display name
// like "Test <test@resend.dev>" would NOT match. Keep this bare.
const getFromAddress = vi.fn(() => 'onboarding@resend.dev');
const getFounderEmail = vi.fn(() => 'founder@example.test');

vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress,
  getFounderEmail,
}));

function currentFormPayload(overrides: Record<string, unknown> = {}) {
  return {
    ownerName: 'Test Owner',
    phone: '(347) 555-0100',
    email: 'owner@example.test',
    neighborhood: 'North Williamsburg',
    dogName: 'Biscuit',
    breedAge: 'Golden, 3 years',
    serviceInterest: 'Daily Group Walks',
    vaccinations: 'Yes — fully vaccinated',
    walkFrequency: 'Daily (Mon–Fri)',
    notes: 'Pulls on the leash.',
    source: 'book-page',
    reactivity: 'Scooters',
    allergies: 'Chicken',
    phoneConsult: true,
    ...overrides,
  };
}

function postJson(body: unknown) {
  return new Request('http://localhost/api/leads/meetgreet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function postRaw(text: string) {
  return new Request('http://localhost/api/leads/meetgreet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: text,
  });
}

async function post(body: unknown) {
  const { POST } = await import('@/app/api/leads/meetgreet/route');
  return POST(postJson(body));
}

async function postText(text: string) {
  const { POST } = await import('@/app/api/leads/meetgreet/route');
  return POST(postRaw(text));
}

beforeEach(() => {
  vi.clearAllMocks();
  createdPaths = new Set();
  docsByPath = new Map();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('R01 — the live form payload is accepted', () => {
  it("saves today's real form payload and returns 200", async () => {
    const res = await post(currentFormPayload());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(fsCreateDoc).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1); // sandbox from-address: founder only
    expect(json.notifications.founder).toBe('sent');
    expect(json.notifications.customer).toBe('skipped');
  });
});

describe('R04 — malformed public input is rejected predictably', () => {
  it('returns 400 (not a thrown error) for a JSON null body', async () => {
    const res = await post(null);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('returns 400 for an array body', async () => {
    const res = await post([1, 2, 3]);
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('returns 400 for syntactically invalid JSON', async () => {
    const res = await postText('{not valid json');
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-string notes field instead of coercing it', async () => {
    const res = await post(currentFormPayload({ notes: 42 }));
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('returns 400 for notes over the field length limit', async () => {
    const res = await post(currentFormPayload({ notes: 'x'.repeat(LEAD_FIELD_LIMITS.notes + 1) }));
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid email address', async () => {
    const res = await post(currentFormPayload({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('returns 400 for a service interest outside the allowed list', async () => {
    const res = await post(currentFormPayload({ serviceInterest: 'Grooming' }));
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('returns 400 when the honeypot field is filled', async () => {
    const res = await post(currentFormPayload({ [HONEYPOT_FIELD_NAME]: 'http://spam.example' }));
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns 413 for a request body over the app-level byte cap', async () => {
    const res = await postText(JSON.stringify(currentFormPayload({ notes: 'x'.repeat(25_000) })));
    expect(res.status).toBe(413);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });
});

describe('rate limiting', () => {
  it('returns 429 once the durable per-IP counter exceeds the window limit', async () => {
    fsIncrementField.mockResolvedValueOnce(999);
    const res = await post(currentFormPayload());
    expect(res.status).toBe(429);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('fails open (allows the request) if the rate-limit check itself errors', async () => {
    fsIncrementField.mockRejectedValueOnce(new Error('firestore unavailable'));
    const res = await post(currentFormPayload());
    expect(res.status).toBe(200);
  });
});

describe('R05 — idempotency and notification status', () => {
  it('concurrent identical submissions create exactly one lead', async () => {
    const payload = currentFormPayload();
    const [a, b] = await Promise.all([post(payload), post(payload)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(createdPaths.size).toBe(1);
    expect(fsCreateDoc).toHaveBeenCalledTimes(2);
  });

  it('a duplicate submission returns the same success shape, not an error', async () => {
    const payload = currentFormPayload();
    await post(payload);
    const dup = await post(payload);
    const json = await dup.json();
    expect(dup.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('a genuine Firestore failure returns 500 and never a false success', async () => {
    fsCreateDoc.mockImplementationOnce(async () => { throw new Error('firestore down'); });
    const res = await post(currentFormPayload());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('saves the lead and records status even when the founder email fails', async () => {
    sendEmail.mockResolvedValueOnce({ data: null, error: { message: 'send failed' } });
    const res = await post(currentFormPayload());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.notifications.founder).toBe('failed');
    expect(fsCreateDoc).toHaveBeenCalledTimes(1);
  });

  it('saves the lead and records status even when the customer email fails', async () => {
    getFromAddress.mockReturnValueOnce('Not The Rug <hello@nottherug.com>'); // non-sandbox: customer email is attempted
    sendEmail
      .mockResolvedValueOnce({ data: { id: 'founder-ok' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'customer bounce' } });
    const res = await post(currentFormPayload());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.notifications.founder).toBe('sent');
    expect(json.notifications.customer).toBe('failed');
  });

  it('a client retry after a failed send does not duplicate the lead or resend', async () => {
    sendEmail.mockResolvedValueOnce({ data: null, error: { message: 'send failed' } });
    const payload = currentFormPayload();
    await post(payload);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const retry = await post(payload);
    const json = await retry.json();
    expect(retry.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(createdPaths.size).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1); // no second attempt
  });
});

describe('idempotency dedupe window', () => {
  it('collapses a same-bucket retry and a retry one bucket later, but treats a submission genuinely two buckets on as a new inquiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const payload = currentFormPayload();

    await post(payload);
    vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z')); // 1s later, same hour bucket
    await post(payload);

    expect(fsCreateDoc).toHaveBeenCalledTimes(2);
    expect(fsCreateDoc.mock.calls[0][0]).toBe(fsCreateDoc.mock.calls[1][0]);
    expect(createdPaths.size).toBe(1);

    // One bucket later: a current-bucket-only hash would treat this as a
    // different id and create a second lead. The previous-bucket lookback is
    // exactly what closes that gap, so this is still the same submission.
    vi.setSystemTime(new Date('2026-01-01T01:00:00.001Z'));
    const stillDuplicate = await post(payload);
    const stillDuplicateJson = await stillDuplicate.json();
    expect(stillDuplicateJson.duplicate).toBe(true);
    expect(fsCreateDoc).toHaveBeenCalledTimes(2); // no third create
    expect(createdPaths.size).toBe(1);

    // Two buckets on from the original — outside even the lookback — is a
    // genuinely new inquiry.
    vi.setSystemTime(new Date('2026-01-01T02:00:00.001Z'));
    await post(payload);

    expect(fsCreateDoc).toHaveBeenCalledTimes(3);
    expect(fsCreateDoc.mock.calls[2][0]).not.toBe(fsCreateDoc.mock.calls[0][0]);
    expect(createdPaths.size).toBe(2);
  });

  it('closes the exact boundary a fixed-bucket hash misses: a retry a few seconds after :00 is one lead and one round of notifications', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:59:58.000Z')); // just before the 13:00 bucket boundary
    const payload = currentFormPayload();

    const first = await post(payload);
    const firstJson = await first.json();
    expect(firstJson.ok).toBe(true);
    expect(firstJson.duplicate).toBeUndefined();

    vi.setSystemTime(new Date('2026-01-01T13:00:02.000Z')); // 4s later, across the boundary — the ordinary "tap submit again" gap
    const retry = await post(payload);
    const retryJson = await retry.json();

    expect(retry.status).toBe(200);
    expect(retryJson.ok).toBe(true);
    expect(retryJson.duplicate).toBe(true);
    expect(retryJson.id).toBe(firstJson.id);
    expect(createdPaths.size).toBe(1);
    expect(fsCreateDoc).toHaveBeenCalledTimes(1); // the retry never attempts a second create
    expect(sendEmail).toHaveBeenCalledTimes(1); // exactly one round of notifications
  });
});
