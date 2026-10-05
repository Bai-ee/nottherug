/**
 * In-memory stand-in for the Firestore REST helpers, for the lead route tests
 * that mock `@/lib/server/firestoreRest`. It models update times and write
 * preconditions so optimistic-retry code paths are exercised, and records the
 * options each call received so timeout budgets can be asserted.
 *
 * It is a convenience for control-flow tests; the emulator suite
 * (lead-intake-emulator.test.ts) is the proof against a real Firestore.
 */
import { vi } from 'vitest';

type Doc = { data: Record<string, unknown>; version: number };
type CallOpts = { timeoutMs?: number; precondition?: { updateTime: string } | { exists: boolean } } | undefined;

class FirestorePreconditionFake extends Error {}

export const fsFake = {
  docs: new Map<string, Doc>(),
  counters: new Map<string, number>(),
  counterSeeds: new Map<string, Record<string, unknown>>(),
  calls: [] as Array<{ fn: string; path: string; opts: CallOpts }>,
  /** Runs once, right before the next matching merge is checked: simulates another writer getting in first. */
  interleave: undefined as undefined | { match: (path: string) => boolean; run: () => void },
  PreconditionError: undefined as unknown as new (message?: string) => Error,

  reset() {
    this.docs.clear();
    this.counters.clear();
    this.counterSeeds.clear();
    this.calls.length = 0;
    this.interleave = undefined;
  },

  /** Direct write that bumps the update time, as a concurrent request would. */
  write(path: string, patch: Record<string, unknown>) {
    const existing = this.docs.get(path);
    this.docs.set(path, { data: { ...(existing?.data ?? {}), ...patch }, version: (existing?.version ?? 0) + 1 });
  },

  data(path: string): Record<string, unknown> | undefined {
    return this.docs.get(path)?.data;
  },

  callsTo(fn: string) {
    return this.calls.filter((c) => c.fn === fn);
  },

  api: {
    fsGetDoc: vi.fn(async (path: string, opts?: CallOpts) => {
      fsFake.calls.push({ fn: 'fsGetDoc', path, opts });
      const doc = fsFake.docs.get(path);
      return doc ? { exists: true, data: { ...doc.data }, updateTime: `v${doc.version}` } : { exists: false };
    }),
    fsMergeDoc: vi.fn(async (path: string, data: Record<string, unknown>, opts?: CallOpts) => {
      fsFake.calls.push({ fn: 'fsMergeDoc', path, opts });
      if (fsFake.interleave?.match(path)) {
        const run = fsFake.interleave.run;
        fsFake.interleave = undefined;
        run();
      }
      const doc = fsFake.docs.get(path);
      const pre = opts?.precondition;
      const Err = fsFake.PreconditionError ?? FirestorePreconditionFake;
      if (pre && 'exists' in pre && pre.exists === false && doc) throw new Err('exists');
      if (pre && 'updateTime' in pre && (!doc || pre.updateTime !== `v${doc.version}`)) throw new Err('stale');
      fsFake.write(path, data);
      return { updateTime: `v${fsFake.docs.get(path)!.version}` };
    }),
    fsCreateDoc: vi.fn(async (path: string, data: Record<string, unknown> = {}, opts?: CallOpts) => {
      fsFake.calls.push({ fn: 'fsCreateDoc', path, opts });
      if (fsFake.docs.has(path)) return { created: false };
      fsFake.docs.set(path, { data: { ...data }, version: 1 });
      return { created: true };
    }),
    fsIncrementField: vi.fn(
      async (path: string, _field: string, amount: number, seed: Record<string, unknown> = {}, opts?: CallOpts) => {
        fsFake.calls.push({ fn: 'fsIncrementField', path, opts });
        const n = (fsFake.counters.get(path) ?? 0) + amount;
        fsFake.counters.set(path, n);
        fsFake.counterSeeds.set(path, seed);
        return n;
      },
    ),
    fsSetDoc: vi.fn(async (path: string, data: Record<string, unknown> = {}) => {
      fsFake.docs.set(path, { data: { ...data }, version: (fsFake.docs.get(path)?.version ?? 0) + 1 });
    }),
    fsDeleteDoc: vi.fn(async () => {}),
    fsQueryCollection: vi.fn(async () => [] as unknown[]),
  },
};
