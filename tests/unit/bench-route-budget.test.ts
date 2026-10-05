/**
 * Deadline math for the admin person route (maxDuration 20 s) and the public
 * apply route (maxDuration 30 s). Fake timers; no real waits. "slow" calls take
 * their whole deadline minus 1 ms and succeed (the worst case that still lets
 * the flow continue); "stall" calls run to their deadline and fail. Merge/write
 * calls are stalled as well as reads.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { applicationPayload } from './bench-fixtures';
import { DEFAULT_BENCH_SETTINGS } from '@/lib/bench/contract';

type Mode = 'ok' | 'slow' | 'stall' | 'lost-ack';
let docs: Map<string, Record<string, unknown>>;
const mode = { get: 'ok' as Mode, merge: 'ok' as Mode, create: 'ok' as Mode, query: 'ok' as Mode, incr: 'ok' as Mode, email: 'ok' as Mode };
let afterLostAck: Mode | null = null; // flips `mode.get` once a lost-ack write has committed
let mergesBeforeStall = 0; // merges that succeed immediately before `mode.merge` applies
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

vi.mock('@/lib/server/firestoreRest', async () => {
  const fake = (await import('./bench-fs-fake')).firestoreContractFake(() => docs);
  async function gate<T>(kind: keyof typeof mode, opts: { timeoutMs?: number } | undefined, run: () => Promise<T>): Promise<T> {
    const ms = opts?.timeoutMs ?? 8000;
    if (mode[kind] === 'slow') {
      await sleep(ms - 1);
    } else if (mode[kind] === 'lost-ack') {
      // The write commits, but the caller never hears back before its deadline.
      await run();
      if (afterLostAck) mode.get = afterLostAck;
      await sleep(ms);
      throw new fake.UpstreamTimeoutError('firestore', kind);
    } else if (mode[kind] === 'stall') {
      await sleep(ms);
      throw new fake.UpstreamTimeoutError('firestore', kind);
    }
    return run();
  }
  return {
    ...fake,
    fsGetDoc: (path: string, opts?: { timeoutMs?: number }) => gate('get', opts, () => fake.fsGetDoc(path)),
    fsMergeDoc: (path: string, data: Record<string, unknown>, opts?: { timeoutMs?: number }) => {
      if (mergesBeforeStall > 0) {
        mergesBeforeStall--;
        return fake.fsMergeDoc(path, data, opts as never);
      }
      return gate('merge', opts, () => fake.fsMergeDoc(path, data, opts as never));
    },
    fsCreateDoc: (path: string, data: Record<string, unknown>, opts?: { timeoutMs?: number }) =>
      gate('create', opts, async () => {
        if (docs.has(path)) return { created: false };
        docs.set(path, data);
        return { created: true };
      }),
    fsQueryCollection: (_c: string, _o: string, _d: string, _l: number, opts?: { timeoutMs?: number }) =>
      gate('query', opts, async () => [...docs.entries()].filter(([p]) => p.startsWith('benchPeople/')).map(([, d]) => d)),
    fsIncrementField: (_p: string, _f: string, _a: number, _s: unknown, opts?: { timeoutMs?: number }) =>
      gate('incr', opts, async () => 1),
    fsDeleteDoc: vi.fn(),
  };
});
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin: vi.fn(async () => 'luis@nottherug.test') }));
const sendEmail = vi.fn(async () => {
  if (mode.email === 'stall') await sleep(60_000);
  return { data: { id: 'mock' }, error: null };
});
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'hello@nottherug.test',
  getFounderEmail: () => 'luis@nottherug.test',
}));

const ID = `bench_${'c'.repeat(32)}`;
const stage = (over: Record<string, unknown> = {}) => ({
  id: ID,
  fullName: 'Sam Rivera',
  firstName: 'Sam',
  email: 'sam@example.test',
  stage: 'review',
  stageHistory: [],
  onHold: false,
  tierPinned: false,
  tier: null,
  notes: '',
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.clearAllMocks();
  mergesBeforeStall = 0;
  afterLostAck = null;
  Object.assign(mode, { get: 'ok', merge: 'ok', create: 'ok', query: 'ok', incr: 'ok', email: 'ok' });
  docs = new Map([[`benchPeople/${ID}`, stage()]]);
});
afterEach(() => vi.useRealTimers());

async function timed(start: () => Promise<Response>) {
  const started = Date.now();
  let finishedAt = 0;
  const pending = start().then((r) => {
    finishedAt = Date.now();
    return r;
  });
  for (let i = 0; i < 700 && !finishedAt; i++) {
    await new Promise<void>((r) => setImmediate(r));
    await vi.advanceTimersByTimeAsync(100);
  }
  return { res: await pending, elapsed: finishedAt - started };
}

async function admin(action: string, body: Record<string, unknown> = {}) {
  const { POST } = await import('@/app/api/admin/bench/people/[id]/route');
  return timed(() =>
    POST(
      new NextRequest(`http://localhost/api/admin/bench/people/${ID}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      }),
      { params: Promise.resolve({ id: ID }) },
    ),
  );
}

async function apply() {
  const { POST } = await import('@/app/api/bench/apply/route');
  return timed(() =>
    POST(
      new Request('http://localhost/api/bench/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
        body: JSON.stringify(applicationPayload()),
      }),
    ),
  );
}

describe('admin person route stays inside maxDuration (20 s)', () => {
  it('invite_shadow with every call at its deadline and a stalled email: 17 s, outcome save skipped', async () => {
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, shadowBookingUrl: 'https://calendly.test/shadow' });
    mode.get = 'slow';
    mode.merge = 'slow';
    mode.email = 'stall';
    const { res, elapsed } = await admin('invite_shadow');
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThanOrEqual(18_000);
    expect(docs.get(`benchPeople/${ID}`)?.stage).toBe('shadow_invited');
  });

  it('a stalled stage write fails within budget and sends no email', async () => {
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, shadowBookingUrl: 'https://calendly.test/shadow' });
    mode.merge = 'stall';
    const { res, elapsed } = await admin('invite_shadow');
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(elapsed).toBeLessThanOrEqual(18_000);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('a no-email action with a slow read and a stalled write fails within budget', async () => {
    mode.get = 'slow';
    mode.merge = 'stall';
    const { res, elapsed } = await admin('save_notes', { notes: 'x' });
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(elapsed).toBeLessThanOrEqual(18_000);
  });

  it('a stalled outcome write after the email still answers 200 within budget', async () => {
    mode.get = 'slow';
    mode.merge = 'stall';
    mergesBeforeStall = 1; // the stage write lands; the notifications write stalls
    const { res, elapsed } = await admin('reject');
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThanOrEqual(18_000);
    expect(docs.get(`benchPeople/${ID}`)?.stage).toBe('rejected');
  });
});

describe('apply route auto-invite ordering', () => {
  const autoInviteSettings = () =>
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, autoInviteOnGap: true, shadowBookingUrl: 'https://calendly.test/shadow' });
  const savedPerson = () => [...docs.entries()].find(([k]) => k.startsWith('benchPeople/bench_') && k !== `benchPeople/${ID}`)?.[1];
  const emailTexts = () => (sendEmail.mock.calls as unknown as Array<[{ text: string }]>).map((c) => c[0].text);

  it('a stage write that timed out but committed is confirmed by a re-read: invite sent once, no confirmation', async () => {
    autoInviteSettings();
    mode.merge = 'lost-ack';
    const { res, elapsed } = await apply();
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThanOrEqual(29_000);
    expect(savedPerson()?.stage).toBe('shadow_invited');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(emailTexts()[0]).toContain('calendly.test');
  });

  it('a timed-out write that did not commit sends the confirmation, not the invite', async () => {
    autoInviteSettings();
    mode.merge = 'stall';
    const { res } = await apply();
    expect(res.status).toBe(200);
    expect(savedPerson()?.stage).toBe('review');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(emailTexts()[0]).not.toContain('calendly.test');
  });

  it('a committed write whose confirm read also stalls sends the confirmation, inside the budget', async () => {
    autoInviteSettings();
    mode.merge = 'lost-ack';
    afterLostAck = 'stall';
    const { res, elapsed } = await apply();
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThanOrEqual(29_000);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(emailTexts()[0]).not.toContain('calendly.test');
  });

  it('a stalled stage write sends no invite, keeps the application in review, and sends the confirmation instead', async () => {
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, autoInviteOnGap: true, shadowBookingUrl: 'https://calendly.test/shadow' });
    mode.merge = 'stall';
    const { res, elapsed } = await apply();
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThanOrEqual(29_000);
    const saved = [...docs.entries()].find(([k]) => k.startsWith('benchPeople/bench_') && k !== `benchPeople/${ID}`)?.[1];
    expect(saved?.stage).toBe('review');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sendEmail.mock.calls[0])).not.toContain('calendly.test');
  });
});

describe('apply route stays inside maxDuration (30 s)', () => {
  it('every sliceable call at its deadline, stalled rate limiter and email: ~26 s, outcome save starved', async () => {
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, autoInviteOnGap: true, shadowBookingUrl: 'https://calendly.test/shadow' });
    mode.incr = 'stall'; // fails open after 8 s
    mode.get = 'slow';
    mode.query = 'slow';
    mode.create = 'slow';
    mode.merge = 'slow';
    mode.email = 'stall';
    const { res, elapsed } = await apply();
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThanOrEqual(29_000);
    const saved = [...docs.keys()].find((k) => k.startsWith('benchPeople/bench_') && k !== `benchPeople/${ID}`);
    expect(saved).toBeDefined();
  });

  it('a stalled outcome write is logged and the application still succeeds within budget', async () => {
    mode.merge = 'stall';
    const { res, elapsed } = await apply();
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThanOrEqual(29_000);
  });

  it('a stalled create fails the request within its slice', async () => {
    mode.create = 'stall';
    const { res, elapsed } = await apply();
    expect(res.status).toBe(500);
    expect(elapsed).toBeLessThanOrEqual(29_000);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
