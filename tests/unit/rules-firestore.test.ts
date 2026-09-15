/**
 * Emulator-backed tests for firestore.rules. Skips explicitly (with a
 * reason, not silently) when the emulator cannot be reached — see
 * tests/unit/rules-emulator.ts and the P1B report for why that is the case
 * in this environment.
 */
import { describe, it, beforeAll, afterAll } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { emulatorsAvailable, createTestEnv, EMULATOR_SKIP_REASON } from './rules-emulator';

describe('firestore.rules', () => {
  let testEnv: RulesTestEnvironment | undefined;
  let available = false;

  beforeAll(async () => {
    available = await emulatorsAvailable();
    if (available) {
      testEnv = await createTestEnv('demo-not-the-rug-firestore-rules');
    }
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('denies a public read of leads', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.firestore().collection('leads').doc('lead-1').get());
  });

  it('denies a public read of photoUploads', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.firestore().collection('photoUploads').doc('p1').get());
  });

  it('denies a public read of photoRenders', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.firestore().collection('photoRenders').doc('r1').get());
  });

  it('denies a public read of brief run/state collections', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.firestore().collection('notTheRugBriefState').doc('latest').get());
  });

  it('denies any client write to admins/** — no self-enrollment', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const attacker = testEnv.authenticatedContext('attacker-uid', { email: 'attacker@example.test' });
    await assertFails(
      attacker.firestore().collection('admins').doc('attacker@example.test').set({ selfEnrolled: true }),
    );
  });

  it('allows a signed-in user to read their own admins/{email} doc', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    await testEnv.withSecurityRulesDisabled(async (ctxAdmin) => {
      await ctxAdmin.firestore().collection('admins').doc('admin@example.test').set({ addedAt: 'now' });
    });
    const admin = testEnv.authenticatedContext('admin-uid', { email: 'admin@example.test' });
    await assertSucceeds(admin.firestore().collection('admins').doc('admin@example.test').get());
  });

  it('denies reading a different admin\'s admins/{email} doc', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    await testEnv.withSecurityRulesDisabled(async (ctxAdmin) => {
      await ctxAdmin.firestore().collection('admins').doc('other@example.test').set({ addedAt: 'now' });
    });
    const admin = testEnv.authenticatedContext('admin-uid-2', { email: 'admin2@example.test' });
    await assertFails(admin.firestore().collection('admins').doc('other@example.test').get());
  });

  it('denies every unauthenticated write to protected collections', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(unauth.firestore().collection('leads').doc('lead-1').set({ ownerName: 'x' }));
  });

  it('denies an unlisted collection, so the catch-all is proven and not just assumed', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const db = testEnv.unauthenticatedContext().firestore();
    // notTheRugBriefLeases and leadRateLimits have no match block of their own —
    // they are protected only by the trailing wildcard, which nothing proved.
    await assertFails(db.collection('notTheRugBriefLeases').doc('some-run-id').get());
    await assertFails(db.collection('notTheRugBriefLeases').doc('some-run-id').set({ mine: true }));
    await assertFails(db.collection('leadRateLimits').doc('abc_123').get());
    await assertFails(db.collection('somethingNobodyDeclared').doc('x').get());
    await assertFails(db.collection('somethingNobodyDeclared').doc('x').set({ mine: true }));
  });

  it('denies a subcollection nested under a denied document', async (ctx) => {
    if (!testEnv) return ctx.skip(EMULATOR_SKIP_REASON);
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('leads').doc('some-lead').collection('notes').doc('n1').get());
    await assertFails(db.collection('leads').doc('some-lead').collection('notes').doc('n1').set({ mine: true }));
  });
});
