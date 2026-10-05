/**
 * Conditional writes (updateTime / exists), deleteFields and optimistic retry,
 * against the Firestore emulator. Skips, with a reason, when none is reachable —
 * a skip is not a pass.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FIRESTORE_EMULATOR_HOST as EMULATOR, firestoreEmulatorReachable } from '../support/emulatorGate';

const PROJECT = 'demo-firestore-preconditions';

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT;

const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Start it with \`npm run emulators\` ` +
  `(needs a Java runtime on PATH). This suite is unverified until it runs — a skip is not a pass.`;

let reachable = false;

beforeAll(async () => {
  reachable = await firestoreEmulatorReachable();
});

beforeEach(async () => {
  if (reachable) {
    await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
      method: 'DELETE',
    });
  }
});

describe('fsMergeDoc preconditions', () => {
  it('rejects a stale updateTime and accepts the current one', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsMergeDoc, fsGetDoc, FirestorePreconditionError } = await import('@/lib/server/firestoreRest');

    await fsMergeDoc('docs/a', { n: 1 });
    const first = await fsGetDoc('docs/a');
    expect(first.updateTime).toBeTruthy();
    const second = await fsMergeDoc('docs/a', { n: 2 }, { precondition: { updateTime: first.updateTime! } });
    expect(second.updateTime).toBeTruthy();
    expect(second.updateTime).not.toBe(first.updateTime);

    // first.updateTime is now stale.
    await expect(
      fsMergeDoc('docs/a', { n: 3 }, { precondition: { updateTime: first.updateTime! } })
    ).rejects.toBeInstanceOf(FirestorePreconditionError);
    expect((await fsGetDoc('docs/a')).data).toMatchObject({ n: 2 });

    // The returned updateTime is current and usable.
    await fsMergeDoc('docs/a', { n: 4 }, { precondition: { updateTime: second.updateTime! } });
    expect((await fsGetDoc('docs/a')).data).toMatchObject({ n: 4 });
  });

  it('exists:false fails on an existing document and succeeds on a missing one', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsMergeDoc, fsGetDoc, FirestorePreconditionError } = await import('@/lib/server/firestoreRest');

    await fsMergeDoc('docs/b', { n: 1 }, { precondition: { exists: false } });
    await expect(fsMergeDoc('docs/b', { n: 2 }, { precondition: { exists: false } })).rejects.toBeInstanceOf(
      FirestorePreconditionError
    );
    expect((await fsGetDoc('docs/b')).data).toMatchObject({ n: 1 });
  });

  it('exists:true fails on a missing document and does not create it', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsMergeDoc, fsGetDoc, FirestorePreconditionError } = await import('@/lib/server/firestoreRest');

    await expect(fsMergeDoc('docs/ghost', { n: 1 }, { precondition: { exists: true } })).rejects.toBeInstanceOf(
      FirestorePreconditionError
    );
    expect((await fsGetDoc('docs/ghost')).exists).toBe(false);

    await fsMergeDoc('docs/ghost', { n: 1 });
    await fsMergeDoc('docs/ghost', { n: 2 }, { precondition: { exists: true } });
    expect((await fsGetDoc('docs/ghost')).data).toMatchObject({ n: 2 });
  });

  it('does not map an unconditional write failure to a precondition error', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsMergeDoc, FirestorePreconditionError } = await import('@/lib/server/firestoreRest');
    // A document path with an even number of segments is not a document: a genuine 400, not a precondition.
    const err = await fsMergeDoc('docs', { n: 1 }, { precondition: { exists: false } }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(FirestorePreconditionError);
  });
});

describe('fsMergeDoc deleteFields', () => {
  it('removes only the named fields, alongside a normal merge', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc, fsMergeDoc, fsGetDoc } = await import('@/lib/server/firestoreRest');

    await fsSetDoc('docs/c', { keep: 'k', drop: 'd', also: 'a', n: 1 });
    await fsMergeDoc('docs/c', { n: 2 }, { deleteFields: ['drop', 'also'] });
    const { data } = await fsGetDoc('docs/c');
    expect(data).toEqual({ keep: 'k', n: 2 });
  });

  it('allows empty data when deleteFields is given, and stays a no-op with neither', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc, fsMergeDoc, fsGetDoc } = await import('@/lib/server/firestoreRest');

    await fsSetDoc('docs/d', { keep: 'k', drop: 'd' });
    await fsMergeDoc('docs/d', {}, { deleteFields: ['drop'] });
    expect((await fsGetDoc('docs/d')).data).toEqual({ keep: 'k' });

    expect(await fsMergeDoc('docs/d', {})).toEqual({});
    expect((await fsGetDoc('docs/d')).data).toEqual({ keep: 'k' });
  });
});

describe('withOptimisticRetry on a real document', () => {
  it('applies two concurrent read-modify-write increments exactly once each', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsMergeDoc, fsGetDoc, withOptimisticRetry } = await import('@/lib/server/firestoreRest');

    await fsMergeDoc('docs/counter', { n: 0 });
    let attempts = 0;
    const increment = () =>
      withOptimisticRetry(async () => {
        attempts++;
        const cur = await fsGetDoc('docs/counter');
        // Yield so both racers read before either writes.
        await new Promise((r) => setTimeout(r, 25));
        await fsMergeDoc(
          'docs/counter',
          { n: (cur.data!.n as number) + 1 },
          { precondition: { updateTime: cur.updateTime! } }
        );
      });

    await Promise.all([increment(), increment()]);
    expect((await fsGetDoc('docs/counter')).data).toMatchObject({ n: 2 });
    expect(attempts).toBeGreaterThan(2); // at least one racer lost and retried
  });
});
