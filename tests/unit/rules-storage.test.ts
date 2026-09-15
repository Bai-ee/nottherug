/**
 * Emulator-backed tests for storage.rules. Skips explicitly (with a reason,
 * not silently) when the emulator cannot be reached — see
 * tests/unit/rules-emulator.ts and the P1B report.
 */
import { describe, it, beforeAll, afterAll } from 'vitest';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { emulatorsAvailable, createTestEnv, EMULATOR_SKIP_REASON } from './rules-emulator';

describe('storage.rules', () => {
  let testEnv: RulesTestEnvironment | undefined;
  let available = false;

  beforeAll(async () => {
    available = await emulatorsAvailable();
    if (available) {
      testEnv = await createTestEnv('demo-not-the-rug-storage-rules');
    }
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('denies public read under the private artifact prefix', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.storage().ref('private/internal-report.html').getMetadata());
  });

  it('denies an authenticated admin read under the private artifact prefix (server-only by design)', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const admin = testEnv.authenticatedContext('admin-uid', { email: 'admin@example.test' });
    await assertFails(admin.storage().ref('private/internal-report.html').getMetadata());
  });

  it('denies a client write under photos/', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(Promise.resolve(unauth.storage().ref('photos/originals/x.jpg').put(new Blob(['x']))));
  });

  it('denies a rule-evaluated (unauthenticated, tokenless) read under photos/ — sharing happens via token URLs, which bypass rules entirely', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    await testEnv.withSecurityRulesDisabled(async (ctxAdmin) => {
      await Promise.resolve(ctxAdmin.storage().ref('photos/originals/x.jpg').put(new Blob(['x'])));
    });
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.storage().ref('photos/originals/x.jpg').getMetadata());
  });

  it('denies public read outside every declared prefix', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.storage().ref('unlisted/whatever.txt').getMetadata());
  });
});
