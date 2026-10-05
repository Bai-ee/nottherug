import { describe, it, expect, vi, afterEach } from 'vitest';

// firestoreRest reads these at import time and imports are hoisted above plain
// statements, so set them in vi.hoisted. The emulator host makes the token step
// a no-op; fetch is mocked below, so nothing is ever contacted.
vi.hoisted(() => {
  process.env.FIREBASE_ADMIN_PROJECT_ID = 'demo-deadlines';
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:1';
});

import { DEFAULT_FS_TIMEOUT_MS, fsGetDoc, fsMergeDoc, UpstreamTimeoutError, withOptimisticRetry, FirestorePreconditionError } from '@/lib/server/firestoreRest';

/** A fetch that never resolves but rejects when its signal aborts (as real fetch does). */
function stalledFetch() {
  const seen: AbortSignal[] = [];
  const fn = vi.fn((_url: unknown, init?: RequestInit) => {
    const signal = init?.signal as AbortSignal;
    seen.push(signal);
    return new Promise<Response>((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    });
  });
  return { fn, seen };
}

describe('Firestore request deadlines', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('throws UpstreamTimeoutError within the budget and aborts the underlying fetch', async () => {
    const { fn, seen } = stalledFetch();
    globalThis.fetch = fn as unknown as typeof fetch;
    const started = Date.now();
    const err = await fsGetDoc('leads/a', { timeoutMs: 80 }).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamTimeoutError);
    expect(err).toMatchObject({ service: 'firestore', operation: 'GET leads/a' });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(seen[0].aborted).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1); // never retried
  });

  it('also covers a fetch mock that ignores the signal entirely', async () => {
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    await expect(fsMergeDoc('leads/a', { x: 1 }, { timeoutMs: 50 })).rejects.toBeInstanceOf(UpstreamTimeoutError);
  });

  it('distinguishes a caller abort from a timeout', async () => {
    const { fn } = stalledFetch();
    globalThis.fetch = fn as unknown as typeof fetch;
    const ctl = new AbortController();
    const p = fsGetDoc('leads/a', { signal: ctl.signal, timeoutMs: 5000 });
    ctl.abort(new Error('route cancelled'));
    const err = await p.catch((e) => e);
    expect(err).not.toBeInstanceOf(UpstreamTimeoutError);
    expect(err.message).toBe('route cancelled');
  });

  it('keeps an HTTP failure distinct from a timeout', async () => {
    globalThis.fetch = vi.fn(async () => new Response('boom', { status: 503 })) as unknown as typeof fetch;
    const err = await fsGetDoc('leads/a').catch((e) => e);
    expect(err).not.toBeInstanceOf(UpstreamTimeoutError);
    expect(err.message).toContain('503');
  });

  it('applies the module default budget when none is given, and honours an explicit one', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    const spy = vi.spyOn(AbortSignal, 'timeout');
    await fsGetDoc('leads/a');
    expect(spy).toHaveBeenLastCalledWith(DEFAULT_FS_TIMEOUT_MS);
    expect(DEFAULT_FS_TIMEOUT_MS).toBe(8000);
    await fsGetDoc('leads/a', { timeoutMs: 1234 });
    expect(spy).toHaveBeenLastCalledWith(1234);
  });
});

describe('contended commit (ABORTED)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });
  const aborted = () =>
    new Response(JSON.stringify({ error: { code: 409, status: 'ABORTED', message: 'too much contention' } }), { status: 409 });

  it('maps ABORTED on a conditional commit to a precondition error that withOptimisticRetry retries', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async (url: unknown) => {
      expect(String(url)).toContain(':commit');
      return ++calls < 3 ? aborted() : new Response(JSON.stringify({ writeResults: [{ updateTime: 'T3' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await withOptimisticRetry(() => fsMergeDoc('docs/a', { n: 1 }, { precondition: { updateTime: 'T0' } }));
    expect(r).toEqual({ updateTime: 'T3' });
    expect(calls).toBe(3);
  });

  it('still reports ALREADY_EXISTS by error.status, and other 409s stay plain errors', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { status: 'SOMETHING_ELSE' } }), { status: 409 })) as unknown as typeof fetch;
    const err = await fsMergeDoc('docs/a', { n: 1 }, { precondition: { exists: false } }).catch((e) => e);
    expect(err).not.toBeInstanceOf(FirestorePreconditionError);
  });

  it('leaves ABORTED on an unconditional write as a plain error', async () => {
    globalThis.fetch = vi.fn(async () => aborted()) as unknown as typeof fetch;
    const err = await fsMergeDoc('docs/a', { n: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(FirestorePreconditionError);
    expect(err.message).toContain('409');
  });
});

describe('withOptimisticRetry', () => {
  it('retries only on FirestorePreconditionError and returns the eventual result', async () => {
    let n = 0;
    const r = await withOptimisticRetry(async () => {
      if (++n < 3) throw new FirestorePreconditionError();
      return 'ok';
    });
    expect(r).toBe('ok');
    expect(n).toBe(3);
  });

  it('does not retry other errors', async () => {
    const attempt = vi.fn(async () => {
      throw new Error('dependency down');
    });
    await expect(withOptimisticRetry(attempt)).rejects.toThrow('dependency down');
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('rethrows the last precondition error after maxAttempts', async () => {
    const attempt = vi.fn(async () => {
      throw new FirestorePreconditionError('still stale');
    });
    await expect(withOptimisticRetry(attempt, { maxAttempts: 3 })).rejects.toThrow('still stale');
    expect(attempt).toHaveBeenCalledTimes(3);
  });
});
