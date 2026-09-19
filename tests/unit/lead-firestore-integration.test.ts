/**
 * The booking route against a REAL Firestore (the emulator), not mocked helpers.
 *
 * Every other lead test mocks `@/lib/server/firestoreRest`, so it proves the
 * route's control flow but never that the primitives underneath it behave as
 * assumed. The two riskiest assumptions in this codebase live exactly there:
 *
 *   - `fsCreateDoc` treats HTTP 409 as "already exists", which is what makes
 *     submission idempotency work at all.
 *   - `fsIncrementField` relies on an `updateTransforms` increment upserting a
 *     document that does not exist yet, which is what makes the rate limit
 *     durable across serverless instances.
 *
 * Neither had ever run against a real Firestore. Only Resend is mocked here —
 * nothing else should reach the network.
 *
 * Skips with a reason when the emulator is absent. A skip is not a pass:
 * `npm run emulators`, then `npm test`.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Start it with \`npm run emulators\` ` +
  `(needs a Java runtime). This suite is unverified until it runs — a skip is not a pass.`;

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = 'demo-lead-integration';

const sendEmail = vi.fn(async () => ({ data: { id: 'mock-email-id' }, error: null }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'Test <test@resend.dev>',
  getFounderEmail: () => 'founder@example.test',
}));

let reachable = false;

async function emulatorUp() {
  try {
    await fetch(`http://${EMULATOR}/`, { signal: AbortSignal.timeout(750) });
    return true;
  } catch {
    return false;
  }
}

/** Wipe the emulator project between tests so ids from one case cannot leak into another. */
async function clearFirestore() {
  await fetch(
    `http://${EMULATOR}/emulator/v1/projects/demo-lead-integration/databases/(default)/documents`,
    { method: 'DELETE' }
  );
}

function submission(overrides: Record<string, unknown> = {}) {
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
    source: 'integration-test',
    reactivity: 'Scooters',
    allergies: 'Chicken',
    phoneConsult: false,
    ...overrides,
  };
}

async function post(body: unknown) {
  const { POST } = await import('@/app/api/leads/meetgreet/route');
  return POST(
    new Request('http://localhost/api/leads/meetgreet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250) + 1}` },
      body: JSON.stringify(body),
    })
  );
}

async function readLead(id: string) {
  const { fsGetDoc } = await import('@/lib/server/firestoreRest');
  return fsGetDoc(`leads/${id}`);
}

beforeAll(async () => {
  reachable = await emulatorUp();
});

beforeEach(async () => {
  vi.clearAllMocks();
  if (reachable) await clearFirestore();
});

describe('a booking inquiry against real Firestore', () => {
  it('persists every field of the current form contract and can be read back', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const res = await post(submission());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const stored = await readLead(json.id);
    expect(stored.exists).toBe(true);

    const lead = stored.data!;
    expect(lead.ownerName).toBe('Test Owner');
    expect(lead.email).toBe('owner@example.test');
    // The three fields the old API demanded and the form stopped collecting must
    // be absent, not invented.
    expect(lead.spayNeuter).toBeUndefined();
    expect(lead.dogSocial).toBeUndefined();
    expect(lead.strangerSocial).toBeUndefined();
    // The three the form added must survive the round trip.
    expect(lead.reactivity).toBe('Scooters');
    expect(lead.allergies).toBe('Chicken');
    expect(lead.phoneConsult).toBe(false);
    expect(lead.schemaVersion).toBe(2);
  });

  it('records what actually happened to each notification', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const res = await post(submission({ email: 'notify@example.test' }));
    const { id } = await res.json();

    const lead = (await readLead(id)).data!;
    const notifications = lead.notifications as Record<string, string>;
    expect(notifications).toBeDefined();
    expect(['sent', 'failed', 'skipped']).toContain(notifications.founder);
    expect(['sent', 'failed', 'skipped']).toContain(notifications.customer);
  });

  it('still saves the lead, and says so, when the founder notification fails', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    sendEmail.mockResolvedValueOnce({ data: null, error: { message: 'provider down', name: 'api_error' } } as never);

    const res = await post(submission({ dogName: 'Failmail' }));
    const json = await res.json();
    expect(res.status).toBe(200);

    const lead = (await readLead(json.id)).data!;
    expect((lead.notifications as Record<string, string>).founder).toBe('failed');
    // A saved lead is a success; the body must not imply delivery happened.
    expect(json.ok).toBe(true);
  });
});

describe('idempotency against real Firestore 409 semantics', () => {
  it('creates exactly one lead for an identical resubmission', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const body = submission({ dogName: 'Duplicate' });
    const first = await post(body);
    const second = await post(body);

    const a = await first.json();
    const b = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(a.id).toBe(b.id);

    const { fsQueryCollection } = await import('@/lib/server/firestoreRest');
    const all = await fsQueryCollection('leads', 'submittedAt', 'DESCENDING', 50);
    expect(all.filter((l) => l.dogName === 'Duplicate')).toHaveLength(1);
  });

  it('creates exactly one lead when two identical requests race', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const body = submission({ dogName: 'Racer' });
    const [r1, r2] = await Promise.all([post(body), post(body)]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect((await r1.json()).id).toBe((await r2.json()).id);

    const { fsQueryCollection } = await import('@/lib/server/firestoreRest');
    const all = await fsQueryCollection('leads', 'submittedAt', 'DESCENDING', 50);
    expect(all.filter((l) => l.dogName === 'Racer')).toHaveLength(1);
  });

  it('treats a genuinely different inquiry as a new lead', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const a = await post(submission({ dogName: 'Alpha' }));
    const b = await post(submission({ dogName: 'Beta' }));
    expect((await a.json()).id).not.toBe((await b.json()).id);

    const { fsQueryCollection } = await import('@/lib/server/firestoreRest');
    const all = await fsQueryCollection('leads', 'submittedAt', 'DESCENDING', 50);
    expect(all.filter((l) => l.dogName === 'Alpha' || l.dogName === 'Beta')).toHaveLength(2);
  });
});

describe('the durable rate limiter against real Firestore transforms', () => {
  it('upserts a counter that did not exist and increments it atomically', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const { fsIncrementField } = await import('@/lib/server/firestoreRest');
    const path = `leadRateLimits/fresh_${Date.now()}`;

    expect(await fsIncrementField(path, 'count', 1, { windowStart: 1 })).toBe(1);
    expect(await fsIncrementField(path, 'count', 1, { windowStart: 1 })).toBe(2);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => fsIncrementField(path, 'count', 1, { windowStart: 1 }))
    );
    // Concurrent increments must not lose writes: the final value is 12 and every
    // returned value is distinct.
    expect(Math.max(...results)).toBe(12);
    expect(new Set(results).size).toBe(10);
  });

  it('refuses a burst from one client with 429', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const ip = '203.0.113.42';
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const { POST } = await import('@/app/api/leads/meetgreet/route');
      const res = await POST(
        new Request('http://localhost/api/leads/meetgreet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
          body: JSON.stringify(submission({ dogName: `Burst${i}` })),
        })
      );
      statuses.push(res.status);
    }

    expect(statuses.filter((s) => s === 200).length).toBeGreaterThan(0);
    expect(statuses).toContain(429);
  });
});

describe('a historical lead still reads through the display contract and CSV', () => {
  it('renders old survey fields and omits the ones it never had', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const { fsSetDoc } = await import('@/lib/server/firestoreRest');
    const { LEAD_DISPLAY_FIELDS, formatLeadFieldValue } = await import('@/lib/leads/contract');
    const { leadsToCsv } = await import('@/lib/leads/csv');

    // A record as the pre-cleanup API would have written it: random uuid id, no
    // schemaVersion, the three retired survey answers, none of the new fields.
    const legacy = {
      id: 'legacy-0001',
      type: 'meetgreet',
      submittedAt: '2025-03-04T12:00:00.000Z',
      ownerName: 'Old Customer',
      phone: '+1 347 555 0000',
      email: 'old@example.test',
      neighborhood: 'Greenpoint',
      dogName: 'Rex',
      breedAge: 'Lab, 5',
      serviceInterest: 'Daily Group Walks',
      spayNeuter: 'Yes',
      vaccinations: 'Yes — fully vaccinated',
      dogSocial: 'Friendly',
      strangerSocial: 'Shy',
      walkFrequency: 'Daily (Mon–Fri)',
      notes: 'Legacy record',
      source: 'old-site',
    };
    await fsSetDoc(`leads/${legacy.id}`, legacy);

    const stored = (await readLead(legacy.id)).data!;
    // Every display field resolves without throwing on the missing new fields.
    for (const field of LEAD_DISPLAY_FIELDS) {
      expect(() => formatLeadFieldValue(stored as never, field)).not.toThrow();
    }
    expect(formatLeadFieldValue(stored as never, LEAD_DISPLAY_FIELDS.find((f) => f.key === 'spayNeuter')!)).toBe('Yes');
    expect(formatLeadFieldValue(stored as never, LEAD_DISPLAY_FIELDS.find((f) => f.key === 'reactivity')!)).toBe('—');

    const csv = leadsToCsv([stored as never], LEAD_DISPLAY_FIELDS);
    expect(csv).toContain('Old Customer');
    // A leading-+ phone number stays readable rather than being mangled.
    expect(csv).toContain('347 555 0000');
  });

  it('neutralises a formula submitted through the real route', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const { LEAD_DISPLAY_FIELDS } = await import('@/lib/leads/contract');
    const { leadsToCsv } = await import('@/lib/leads/csv');

    const res = await post(submission({ notes: '=HYPERLINK("http://evil.test","click")' }));
    const { id } = await res.json();
    const stored = (await readLead(id)).data!;

    const csv = leadsToCsv([stored as never], LEAD_DISPLAY_FIELDS);
    expect(csv).not.toMatch(/(^|,)"?=HYPERLINK/);
    expect(csv).toContain('HYPERLINK');
  });
});
