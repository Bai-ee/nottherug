/**
 * fsMergeDoc must change only the fields it is given. fsSetDoc replaces the
 * whole document (no updateMask), which is what wiped convertedLeadId on a
 * re-capture (plan 012 F5). Skips, with a reason, when no emulator is reachable.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const PROJECT = 'demo-firestore-merge';

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT;

const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Start it with \`npm run emulators\` ` +
  `(needs a Java runtime on PATH). This suite is unverified until it runs — a skip is not a pass.`;

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
  if (reachable) {
    await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
      method: 'DELETE',
    });
  }
});

describe('fsMergeDoc', () => {
  it('leaves fields it was not given untouched', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc, fsMergeDoc, fsGetDoc } = await import('@/lib/server/firestoreRest');

    await fsSetDoc('captures/a', { email: 'a@example.com', convertedLeadId: 'lead-1', convertedAt: 'then' });
    await fsMergeDoc('captures/a', { email: 'a@example.com', booked: true });

    const { data } = await fsGetDoc('captures/a');
    expect(data).toMatchObject({
      email: 'a@example.com',
      booked: true,
      convertedLeadId: 'lead-1',
      convertedAt: 'then',
    });
  });

  it('creates the document when it does not exist', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsMergeDoc, fsGetDoc } = await import('@/lib/server/firestoreRest');

    await fsMergeDoc('captures/new', { email: 'n@example.com' });
    const got = await fsGetDoc('captures/new');
    expect(got.exists).toBe(true);
    expect(got.data).toMatchObject({ email: 'n@example.com' });
  });

  it('fsSetDoc still replaces the whole document', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc, fsGetDoc } = await import('@/lib/server/firestoreRest');

    await fsSetDoc('captures/b', { a: 1, b: 2 });
    await fsSetDoc('captures/b', { a: 3 });
    const { data } = await fsGetDoc('captures/b');
    expect(data).toEqual({ a: 3 });
  });
});

describe('fsMergeDoc with no fields', () => {
  it('writes nothing (an empty updateMask would replace the whole document)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { fsMergeDoc } = await import('@/lib/server/firestoreRest');
    await fsMergeDoc('captures/none', {});
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
