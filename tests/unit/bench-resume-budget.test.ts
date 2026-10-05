/**
 * Resume route deadline math (maxDuration 30 s). Every Firestore/Storage call
 * stalls until the deadline the route handed it; fake timers make that instant.
 * The summed worst case must finish with headroom for the response.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';

let docs: Map<string, Record<string, unknown>>;
const state = { stallGets: false, stallUpload: false, stallDelete: false, calls: [] as number[] };
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

vi.mock('@/lib/server/firestoreRest', async () => {
  const fake = (await import('./bench-fs-fake')).firestoreContractFake(() => docs);
  return {
    ...fake,
    fsGetDoc: async (path: string, opts?: { timeoutMs?: number }) => {
      if (state.stallGets) {
        state.calls.push(opts?.timeoutMs ?? -1);
        await sleep(opts?.timeoutMs ?? 8000);
        throw new fake.UpstreamTimeoutError('firestore', 'get');
      }
      return fake.fsGetDoc(path);
    },
  };
});
vi.mock('@/lib/server/benchIntake', () => ({
  checkBenchRateLimit: async () => true,
  clientIp: () => '192.0.2.1',
  hashResumeToken: (t: string) => createHash('sha256').update(t).digest('hex'),
}));
vi.mock('@/lib/server/firebaseStorage', () => ({
  storageUploadPrivate: async (_p: string, _b: Buffer, _t: string, opts?: { timeoutMs?: number }) => {
    if (state.stallUpload) {
      await sleep(opts?.timeoutMs ?? 15000);
      throw new Error('upload timed out');
    }
    // Upload succeeds, then every later Firestore read stalls.
    state.stallGets = true;
  },
  storageDelete: async (_p: string, opts?: { timeoutMs?: number }) => {
    if (state.stallDelete) await sleep(opts?.timeoutMs ?? 15000);
  },
}));

const ID = `bench_${'b'.repeat(32)}`;
const token = 'budget-token';

function request() {
  const f = new FormData();
  f.set('personId', ID);
  f.set('token', token);
  f.set('file', new Blob(['%PDF-1.4 x'], { type: 'application/pdf' }), 'r.pdf');
  return new Request('https://example.test/api/bench/apply/resume', { method: 'POST', body: f });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  Object.assign(state, { stallGets: false, stallUpload: false, stallDelete: true, calls: [] });
  docs = new Map([
    [
      `benchPeople/${ID}`,
      {
        id: ID,
        resumePath: null,
        resumeUploadTokenHash: createHash('sha256').update(token).digest('hex'),
        resumeUploadExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      },
    ],
  ]);
});
afterEach(() => vi.useRealTimers());

async function run() {
  const { POST } = await import('@/app/api/bench/apply/resume/route');
  const started = Date.now();
  let finishedAt = 0;
  const pending = POST(request()).then((r) => {
    finishedAt = Date.now();
    return r;
  });
  // Step the fake clock in small increments, yielding real ticks so body parsing can finish.
  for (let i = 0; i < 700 && !finishedAt; i++) {
    await new Promise<void>((r) => setImmediate(r));
    await vi.advanceTimersByTimeAsync(100);
  }
  const res = await pending;
  return { res, elapsed: finishedAt - started };
}

describe('resume route time budget', () => {
  it('a stalled claim read fails fast with 503 and spends no more than its cap', async () => {
    state.stallGets = true;
    const { res, elapsed } = await run();
    expect(res.status).toBe(503);
    expect(elapsed).toBeLessThanOrEqual(5_000);
  });

  it('a stalled upload plus a stalled cleanup finishes inside the budget', async () => {
    state.stallUpload = true;
    const { res, elapsed } = await run();
    expect(res.status).toBe(500);
    expect(elapsed).toBeLessThanOrEqual(28_000);
  });

  it('stalled finalize read, confirm read and cleanup together finish inside the budget', async () => {
    const { res, elapsed } = await run();
    expect(res.status).toBe(500);
    expect(elapsed).toBeLessThanOrEqual(28_000);
    // Each stalled call was handed a deadline no larger than what was left.
    expect(state.calls.every((ms) => ms > 0 && ms <= 5_000)).toBe(true);
  });
});
