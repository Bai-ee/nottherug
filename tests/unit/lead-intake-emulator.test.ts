/**
 * Plan 013 P1 (F02): capture / conversion ordering against a REAL Firestore
 * (the emulator), through the real routes and REST helpers. Nothing mocked but
 * Resend, plus a thin wrapper around `fsGetDoc` that lets a test commit another
 * writer's change at an exact point (after a route's read, before its write) so
 * the conflicting-write orderings are deterministic rather than hoped for.
 *
 * Skips with a reason when the emulator is absent. A skip is not a pass. Run:
 *   firebase emulators:exec --only firestore --project demo-not-the-rug "npx vitest run tests/unit/lead-intake-emulator.test.ts"
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const PROJECT = 'demo-lead-intake-emulator';
const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Start it with \`npm run emulators\` ` +
  `(needs a Java runtime). This suite is unverified until it runs — a skip is not a pass.`;

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT;

const sendEmail = vi.fn(async (): Promise<{ data: { id: string } | null; error: { message: string } | null }> => ({
  data: { id: 'mock-email-id' },
  error: null,
}));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'Test <test@resend.dev>', // not a bare @resend.dev address: customer mail is attempted too
  getFounderEmail: () => 'founder@example.test',
}));

/** Runs `run` once, right after the Nth read of `path` returns (1-based), before the caller can write. */
const interleave = vi.hoisted(() => ({
  path: '' as string,
  nth: 0,
  seen: 0,
  run: undefined as undefined | (() => Promise<unknown>),
}));
vi.mock('@/lib/server/firestoreRest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/firestoreRest')>('@/lib/server/firestoreRest');
  return {
    ...actual,
    fsGetDoc: async (...args: Parameters<typeof actual.fsGetDoc>) => {
      const result = await actual.fsGetDoc(...args);
      if (interleave.run && args[0] === interleave.path && ++interleave.seen === interleave.nth) {
        const run = interleave.run;
        interleave.run = undefined;
        await run();
      }
      return result;
    },
  };
});

let reachable = false;
beforeAll(async () => {
  try {
    await fetch(`http://${EMULATOR}/`, { signal: AbortSignal.timeout(750) });
    reachable = true;
  } catch {
    reachable = false;
  }
});
beforeEach(async () => {
  vi.clearAllMocks();
  interleave.run = undefined;
  interleave.seen = 0;
  if (!reachable) return;
  await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
});

let ipCounter = 0;
const freshIp = () => `203.0.113.${(++ipCounter % 250) + 1}`;

function post(path: string, body: unknown, ip = freshIp()) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}
const capture = async (email: string, extra: Record<string, unknown> = {}, ip?: string) =>
  (await import('@/app/api/leads/capture/route')).POST(post('/api/leads/capture', { email, source: 'home', ...extra }, ip));
const finalSubmit = async (email: string, extra: Record<string, unknown> = {}, ip?: string) =>
  (await import('@/app/api/leads/meetgreet/route')).POST(
    post(
      '/api/leads/meetgreet',
      {
        ownerName: 'Test Owner',
        phone: '(347) 555-0100',
        email,
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
      },
      ip,
    ),
  );

async function readLead(path: string) {
  const { fsGetDoc } = await import('@/lib/server/firestoreRest');
  return (await fsGetDoc(path)).data;
}
async function captureRow(email: string) {
  const { captureIdForEmail } = await import('@/lib/server/leadTransitions');
  return readLead(`leads/${captureIdForEmail(email)}`);
}
async function captureId(email: string) {
  return (await import('@/lib/server/leadTransitions')).captureIdForEmail(email);
}
async function allLeadRows() {
  const { fsQueryCollection } = await import('@/lib/server/firestoreRest');
  return fsQueryCollection('leads', 'submittedAt', 'ASCENDING', 100);
}

describe('capture and conversion ordering (emulator)', () => {
  it('capture then convert: the row ends converted and the lead carries the booking hint', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const email = 'order-a@example.test';
    expect((await capture(email, { booked: true })).status).toBe(200);
    const res = await finalSubmit(email);
    const { id: leadId } = (await res.json()) as { id: string };

    expect(await captureRow(email)).toMatchObject({ type: 'capture', status: 'converted', convertedLeadId: leadId, bookedSelfReported: true });
    expect((await readLead(`leads/${leadId}`))?.bookedSelfReported).toBe(true);
    expect((await allLeadRows()).filter((r) => r.type === 'capture' && r.status === 'partial')).toHaveLength(0);
  });

  it('convert then capture: a converted marker exists first, so capture creates no outstanding row', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const email = 'order-b@example.test';
    const res = await finalSubmit(email);
    const { id: leadId } = (await res.json()) as { id: string };
    const marker = await captureRow(email);
    expect(marker).toMatchObject({ type: 'capture', status: 'converted', convertedLeadId: leadId, bookedSelfReported: false });
    const firstSeen = marker?.submittedAt;

    expect((await capture(email, { booked: true })).status).toBe(200);
    expect(await captureRow(email)).toMatchObject({ status: 'converted', convertedLeadId: leadId, submittedAt: firstSeen, bookedSelfReported: true, source: 'book-page' });
    // The booking signal that arrived after conversion lands on the full lead.
    expect((await readLead(`leads/${leadId}`))?.bookedSelfReported).toBe(true);
    expect((await allLeadRows()).filter((r) => r.type === 'capture' && r.status === 'partial')).toHaveLength(0);
  });

  it('a conversion committed between capture read and capture write is not reverted', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const email = 'order-c@example.test';
    await capture(email);
    const before = await captureRow(email);
    const id = await captureId(email);
    let leadId = '';
    interleave.path = `leads/${id}`;
    interleave.nth = 1;
    interleave.seen = 0;
    interleave.run = async () => {
      leadId = ((await (await finalSubmit(email)).json()) as { id: string }).id;
    };

    expect((await capture(email)).status).toBe(200);
    const row = await captureRow(email);
    expect(leadId).not.toBe('');
    expect(row).toMatchObject({ status: 'converted', convertedLeadId: leadId, submittedAt: before?.submittedAt });
    expect(row?.convertedAt).toBeTruthy();
  });

  it('booked hint landing mid-conversion still reaches the lead (capture write between conversion read and write)', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const email = 'order-d@example.test';
    await capture(email); // partial, not booked
    const id = await captureId(email);
    // Reads of the capture row during the final submission: #1 booking-hint read, #2 conversion read.
    interleave.path = `leads/${id}`;
    interleave.nth = 2;
    interleave.seen = 0;
    interleave.run = () => capture(email, { booked: true });

    const { id: leadId } = (await (await finalSubmit(email)).json()) as { id: string };
    expect(await captureRow(email)).toMatchObject({ status: 'converted', convertedLeadId: leadId, bookedSelfReported: true });
    expect((await readLead(`leads/${leadId}`))?.bookedSelfReported).toBe(true);
  });

  it('booked capture racing a conversion that commits first still reaches the lead', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const email = 'order-e@example.test';
    await capture(email);
    const id = await captureId(email);
    let leadId = '';
    interleave.path = `leads/${id}`;
    interleave.nth = 1;
    interleave.seen = 0;
    interleave.run = async () => {
      leadId = ((await (await finalSubmit(email)).json()) as { id: string }).id;
    };

    expect((await capture(email, { booked: true })).status).toBe(200);
    expect(await captureRow(email)).toMatchObject({ status: 'converted', convertedLeadId: leadId, bookedSelfReported: true });
    expect((await readLead(`leads/${leadId}`))?.bookedSelfReported).toBe(true);
  });

  it('concurrent true and false booking signals never leave the hint false', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    for (const seedFirst of [false, true]) {
      const email = `signals-${seedFirst}@example.test`;
      if (seedFirst) await capture(email);
      const results = await Promise.all([
        capture(email, { booked: false }),
        capture(email, { booked: true }),
        capture(email, { booked: false }),
        capture(email, { booked: true }),
      ]);
      expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
      expect((await captureRow(email))?.bookedSelfReported).toBe(true);
    }
  });

  it('simultaneous first captures produce one row with one stable first-seen time', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const email = 'simultaneous@example.test';
    const results = await Promise.all([1, 2, 3, 4].map(() => capture(email)));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    const rows = (await allLeadRows()).filter((r) => r.email === email);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: 'capture', status: 'partial' });
    const firstSeen = rows[0].submittedAt;
    await capture(email);
    expect((await captureRow(email))?.submittedAt).toBe(firstSeen);
  });

  it('capture racing the final submission always ends converted, never partial with a lead id', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    for (let i = 0; i < 4; i++) {
      const email = `race-${i}@example.test`;
      const [c, f] = await Promise.all([capture(email, { booked: true }), finalSubmit(email)]);
      expect(c.status).toBe(200);
      const { id: leadId } = (await f.json()) as { id: string };
      expect(await captureRow(email)).toMatchObject({ status: 'converted', convertedLeadId: leadId, bookedSelfReported: true });
      expect((await readLead(`leads/${leadId}`))?.bookedSelfReported).toBe(true);
    }
  });
});

describe('final submission against the real counters and store (emulator)', () => {
  it('five captures from one IP do not block the final submission', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const ip = '198.51.100.77';
    for (let i = 0; i < 5; i++) expect((await capture('quota@example.test', {}, ip)).status).toBe(200);
    expect((await finalSubmit('quota@example.test', {}, ip)).status).toBe(200);
  });

  it('a duplicate final submission saves one lead and sends one founder email', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const email = 'dupe@example.test';
    const [a, b] = await Promise.all([finalSubmit(email), finalSubmit(email)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const ids = new Set([((await a.json()) as { id: string }).id, ((await b.json()) as { id: string }).id]);
    expect(ids.size).toBe(1);
    expect((await allLeadRows()).filter((r) => r.type !== 'capture' && r.email === email)).toHaveLength(1);
    const founderSends = (sendEmail.mock.calls as unknown as Array<[{ to: string }]>).filter(([m]) => m.to === 'founder@example.test');
    expect(founderSends).toHaveLength(1);
  });

  it('a notification failure keeps the lead and sends nothing twice', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    sendEmail
      .mockResolvedValueOnce({ data: null, error: { message: 'provider rejected' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'provider rejected' } });
    const email = 'notify-fail@example.test';
    const res = await finalSubmit(email);
    const json = (await res.json()) as { id: string; notifications: { founder: string; customer: string } };
    expect(res.status).toBe(200);
    expect(json.notifications).toEqual({ founder: 'failed', customer: 'failed' });
    expect(await readLead(`leads/${json.id}`)).toMatchObject({ email, notifications: { founder: 'failed', customer: 'failed' } });
    expect(await captureRow(email)).toMatchObject({ status: 'converted', convertedLeadId: json.id });
    expect(sendEmail).toHaveBeenCalledTimes(2); // one founder, one customer, no retries
  });
});
