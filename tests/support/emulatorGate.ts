/**
 * One gate for every emulator-backed test file.
 *
 * Local dev (default): an unreachable emulator makes the suite skip with a
 * reason, so `npm test` works without Java.
 *
 * Required mode (`REQUIRE_EMULATORS=1`, set by the CI emulator job): an
 * unreachable emulator, or an emulator host that was not provided by
 * `firebase emulators:exec`, throws instead. The suite fails; it never skips.
 * `tests/support/check-required-emulator-run.mjs` then fails the run if any
 * emulator suite executed zero tests.
 *
 * Hosts are captured at import time, before test files assign
 * `process.env.FIRESTORE_EMULATOR_HOST` themselves.
 */

export const REQUIRE_EMULATORS = process.env.REQUIRE_EMULATORS === '1';

const FIRESTORE_FROM_ENV = process.env.FIRESTORE_EMULATOR_HOST?.trim() || undefined;
const STORAGE_FROM_ENV = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim() || undefined;

/** The 8080/9199 defaults apply to plain local skip mode only. */
export const FIRESTORE_EMULATOR_HOST = FIRESTORE_FROM_ENV ?? '127.0.0.1:8080';
export const STORAGE_EMULATOR_HOST = STORAGE_FROM_ENV ?? '127.0.0.1:9199';

// Test files may stub global fetch; the probe must use the real one.
const realFetch = globalThis.fetch;

async function probe(hostAndPort: string, timeoutMs: number): Promise<boolean> {
  const [host, port] = hostAndPort.split(':');
  try {
    await realFetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(timeoutMs) });
    return true;
  } catch {
    return false;
  }
}

function fail(what: string, detail: string): never {
  throw new Error(
    `REQUIRE_EMULATORS=1 but ${what}: ${detail}. Run the suite under ` +
      '`firebase emulators:exec --only firestore,storage --project demo-not-the-rug "npm test"`. ' +
      'A required emulator suite must run; it is never allowed to skip.'
  );
}

async function check(name: string, fromEnv: string | undefined, host: string, envVar: string): Promise<boolean> {
  if (REQUIRE_EMULATORS && !fromEnv) fail(`${envVar} is not set`, `the ${name} emulator host must come from emulators:exec`);
  const up = await probe(host, REQUIRE_EMULATORS ? 3000 : 750);
  if (!up && REQUIRE_EMULATORS) fail(`the ${name} emulator is unreachable at ${host}`, 'nothing answered');
  return up;
}

/** True when Firestore is reachable. Throws instead of returning false in required mode. */
export function firestoreEmulatorReachable(): Promise<boolean> {
  return check('Firestore', FIRESTORE_FROM_ENV, FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST');
}

/** True when Firestore and Storage are both reachable. Throws in required mode if either is not. */
export async function firestoreAndStorageEmulatorsReachable(): Promise<boolean> {
  const firestore = await firestoreEmulatorReachable();
  const storage = await check('Storage', STORAGE_FROM_ENV, STORAGE_EMULATOR_HOST, 'FIREBASE_STORAGE_EMULATOR_HOST');
  return firestore && storage;
}
