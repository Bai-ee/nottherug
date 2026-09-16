/**
 * Emulator-backed rules tests for the analytics collections added by plan A6
 * (plans/003-admin-dashboard-and-tracking.md): analytics_events and
 * analyticsRateLimits. Companion to tests/unit/rules-firestore.test.ts —
 * split into its own file so this targeted addition doesn't touch that
 * suite's existing file. Same skip-with-reason pattern; see
 * tests/unit/rules-emulator.ts.
 */
import { describe, it, beforeAll, afterAll } from 'vitest';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { emulatorsAvailable, createTestEnv, EMULATOR_SKIP_REASON } from './rules-emulator';

describe('firestore.rules — analytics collections', () => {
  let testEnv: RulesTestEnvironment | undefined;

  beforeAll(async () => {
    if (await emulatorsAvailable()) {
      testEnv = await createTestEnv('demo-not-the-rug-firestore-rules-analytics');
    }
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('denies a public read of analytics_events', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.firestore().collection('analytics_events').doc('evt-1').get());
  });

  it('denies a public write of analytics_events, including one shaped exactly like the server writes', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(
      unauth
        .firestore()
        .collection('analytics_events')
        .doc('evt-1')
        .set({
          event: 'page_view',
          id: 'evt-1',
          sid: 'sess-1',
          route: '/',
          receivedAt: new Date().toISOString(),
          clientTs: Date.now(),
        })
    );
  });

  it('denies a signed-in admin from reading analytics_events directly — server routes must be used, not the client SDK', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const admin = testEnv.authenticatedContext('admin-uid', { email: 'admin@example.test' });
    await assertFails(admin.firestore().collection('analytics_events').doc('evt-1').get());
  });

  it('denies a public read or write of analyticsRateLimits counters', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.firestore().collection('analyticsRateLimits').doc('abc_123').get());
    await assertFails(unauth.firestore().collection('analyticsRateLimits').doc('abc_123').set({ count: 999, windowStart: 0 }));
  });
});
