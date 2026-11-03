// Which records are confirmed test activity — one rule set, used by the
// analytics report, the leads list and the alternate-time requests list so the
// three can never disagree about what "test" means.
//
// A record is test ONLY because someone said so, never because of what it
// contains: no name, email, dog name or repeat visit ever classifies anything.
// The sources of "someone said so":
//   1. mode:'test'      — the build-time NEXT_PUBLIC_ANALYTICS_TEST_MODE flag
//                         (preview/acceptance deployments).
//   2. test device      — an admin marked a browser as a test device
//                         (app/api/admin/test-devices). Events and submissions
//                         from it carry its id; the id must exist in
//                         `testDevices` to count, so a forged value is inert.
//                         The browser id recorded when the device was marked
//                         also classifies that browser's earlier events.
//   3. marked session   — an admin marked an analytics session as test from
//                         the dashboard's review list (`analyticsTestSessions`).
//   4. record override  — an admin marked a lead or request as test, or as
//                         confirmed real (`testOverride`). An override always
//                         wins for that record, and a test-marked record's
//                         session is treated as a test session for events.
//
// Raw records are never deleted or rewritten by any of this; classification
// happens when reading.

import { fsQueryCollection } from '@/lib/server/firestoreRest';
import { isOpaqueId } from '@/lib/analytics/events';

export const TEST_DEVICES_COLLECTION = 'testDevices';
export const TEST_SESSIONS_COLLECTION = 'analyticsTestSessions';

/** Far above any real number of test devices or hand-marked sessions. */
const TEST_CONTEXT_READ_LIMIT = 500;

export interface TestContext {
  deviceIds: Set<string>;
  browserIds: Set<string>;
  sessionIds: Set<string>;
}

export function emptyTestContext(): TestContext {
  return { deviceIds: new Set(), browserIds: new Set(), sessionIds: new Set() };
}

/**
 * Reads the two small marker collections. Throws on a Firestore failure so the
 * caller can say "test classification unavailable" instead of silently
 * counting test activity as real.
 */
export async function loadTestContext(): Promise<TestContext> {
  const [devices, sessions] = await Promise.all([
    fsQueryCollection(TEST_DEVICES_COLLECTION, 'createdAt', 'DESCENDING', TEST_CONTEXT_READ_LIMIT),
    fsQueryCollection(TEST_SESSIONS_COLLECTION, 'markedAt', 'DESCENDING', TEST_CONTEXT_READ_LIMIT),
  ]);
  if (!Array.isArray(devices) || !Array.isArray(sessions)) throw new Error('test context read returned no rows');
  const ctx = emptyTestContext();
  for (const d of devices) {
    if (isOpaqueId(d.id)) ctx.deviceIds.add(d.id);
    if (isOpaqueId(d.vid)) ctx.browserIds.add(d.vid);
  }
  for (const s of sessions) {
    if (isOpaqueId(s.sid)) ctx.sessionIds.add(s.sid);
  }
  return ctx;
}

export type TestReason = 'override' | 'device' | 'session' | 'build';

/** A lead or alternate-time request. Returns why it is test, or null when it is not. */
export function recordTestReason(
  record: { testOverride?: unknown; testDeviceId?: unknown; sid?: unknown; vid?: unknown },
  ctx: TestContext,
): TestReason | null {
  if (record.testOverride === true) return 'override';
  if (record.testOverride === false) return null;
  if (typeof record.testDeviceId === 'string' && ctx.deviceIds.has(record.testDeviceId)) return 'device';
  if (typeof record.vid === 'string' && ctx.browserIds.has(record.vid)) return 'device';
  if (typeof record.sid === 'string' && ctx.sessionIds.has(record.sid)) return 'session';
  return null;
}

export function isTestRecord(
  record: { testOverride?: unknown; testDeviceId?: unknown; sid?: unknown; vid?: unknown },
  ctx: TestContext,
): boolean {
  return recordTestReason(record, ctx) !== null;
}

/** One analytics event. */
export function isTestEvent(
  event: { mode?: unknown; td?: unknown; sid?: unknown; vid?: unknown },
  ctx: TestContext,
): boolean {
  if (event.mode === 'test') return true;
  if (typeof event.td === 'string' && ctx.deviceIds.has(event.td)) return true;
  if (typeof event.vid === 'string' && ctx.browserIds.has(event.vid)) return true;
  return typeof event.sid === 'string' && ctx.sessionIds.has(event.sid);
}

/**
 * The view a report or list is asked for:
 *  - 'real'       default business view, confirmed tests excluded;
 *  - 'with_test'  everything, tests included (the "Include test activity" toggle);
 *  - 'test_only'  developer view of test traffic alone (?testMode=1).
 */
export type TestView = 'real' | 'with_test' | 'test_only';

export function keepForView(isTest: boolean, view: TestView): boolean {
  if (view === 'with_test') return true;
  if (view === 'test_only') return isTest;
  return !isTest;
}
