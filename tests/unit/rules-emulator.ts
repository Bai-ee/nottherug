/**
 * Shared setup for the emulator-backed Firebase rules tests
 * (tests/unit/rules-firestore.test.ts, tests/unit/rules-storage.test.ts).
 * Not itself a test file — vitest only collects `*.test.ts`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199';

export const EMULATOR_SKIP_REASON =
  'Firebase emulator unreachable. These suites need a running emulator, which needs a Java ' +
  'runtime: install one (e.g. `brew install openjdk@21`, then put its bin on PATH) and start ' +
  'the emulator with `npm run emulators`. A skip here is not a pass — the rules are unverified ' +
  'until these run.';

async function isReachable(hostAndPort: string): Promise<boolean> {
  const [host, port] = hostAndPort.split(':');
  try {
    await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(750) });
    return true;
  } catch {
    return false;
  }
}

export async function emulatorsAvailable(): Promise<boolean> {
  const [firestoreUp, storageUp] = await Promise.all([
    isReachable(FIRESTORE_EMULATOR_HOST),
    isReachable(STORAGE_EMULATOR_HOST),
  ]);
  return firestoreUp && storageUp;
}

function loadRules(fileName: string): string {
  return readFileSync(path.resolve(process.cwd(), fileName), 'utf8');
}

export async function createTestEnv(projectId: string): Promise<RulesTestEnvironment> {
  const [firestoreHost, firestorePort] = FIRESTORE_EMULATOR_HOST.split(':');
  const [storageHost, storagePort] = STORAGE_EMULATOR_HOST.split(':');

  return initializeTestEnvironment({
    projectId,
    firestore: {
      rules: loadRules('firestore.rules'),
      host: firestoreHost,
      port: Number(firestorePort),
    },
    storage: {
      rules: loadRules('storage.rules'),
      host: storageHost,
      port: Number(storagePort),
    },
  });
}
