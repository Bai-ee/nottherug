/**
 * Proves the "fails open" half of app/api/track/route.ts's durable rate
 * limiter against a real Firestore emulator: fsCreateDoc runs for real
 * (event storage is genuine), while fsIncrementField — the rate-limit
 * counter write — is wrapped so a single test can force it to throw,
 * simulating a Firestore outage on that one call. checkRateLimit()'s
 * try/catch must still let the request through (return true / allowed)
 * rather than blocking real traffic because the limiter itself is down.
 *
 * Kept in its own file (rather than tests/unit/analytics-emulator-roundtrip.test.ts)
 * because vi.mock applies file-wide; every other emulator round-trip test
 * needs the real, unmocked fsIncrementField.
 *
 * Skips (with a reason, not silently) when the emulator is unreachable.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const PROJECT = 'demo-analytics-failopen';

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT;

const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Start it with \`npm run emulators\` ` +
  `(needs a Java runtime on PATH). This suite is unverified until it runs — a skip is not a pass.`;

const state = vi.hoisted(() => ({ throwOnIncrement: false }));

vi.mock('@/lib/server/firestoreRest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/firestoreRest')>();
  return {
    ...actual,
    fsIncrementField: async (...args: Parameters<typeof actual.fsIncrementField>) => {
      if (state.throwOnIncrement) throw new Error('simulated Firestore outage on the rate-limit counter');
      return actual.fsIncrementField(...args);
    },
  };
});

let reachable = false;

async function emulatorUp() {
  try {
    await fetch(`http://${EMULATOR}/`, { signal: AbortSignal.timeout(750) });
    return true;
  } catch {
    return false;
  }
}

async function clearFirestore() {
  await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  origin: 'http://localhost',
  host: 'localhost',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Test',
  'x-forwarded-for': '203.0.113.99',
};

async function post(events: unknown[]) {
  const { POST } = await import('@/app/api/track/route');
  return POST(new Request('http://localhost/api/track', { method: 'POST', headers: DEFAULT_HEADERS, body: JSON.stringify(events) }));
}

async function getRawDoc(id: string) {
  const { fsGetDoc } = await import('@/lib/server/firestoreRest');
  return fsGetDoc(`analytics_events/${id}`);
}

beforeAll(async () => {
  reachable = await emulatorUp();
});

beforeEach(async () => {
  if (reachable) await clearFirestore();
  state.throwOnIncrement = false;
});

describe('rate limiter fails open on a Firestore error', () => {
  it('a healthy rate-limit counter still allows and stores a normal event (sanity baseline)', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = 'fo-baseline-1';
    const res = await post([{ event: 'page_view', id, sid: 'sess-fo-baseline', ts: Date.now(), route: '/' }]);
    expect(res.status).toBe(202);
    expect((await res.json()).stored).toBe(1);
    expect((await getRawDoc(id)).exists).toBe(true);
  });

  it('a thrown error from the rate-limit counter write does not block the request — traffic is still accepted and stored', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    state.throwOnIncrement = true;

    const id = 'fo-outage-1';
    const res = await post([{ event: 'page_view', id, sid: 'sess-fo-outage', ts: Date.now(), route: '/' }]);

    // Not a 429, not a 500: checkRateLimit() catches the throw and returns
    // true (allowed) — app/api/track/route.ts's documented fail-open contract.
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.stored).toBe(1);

    const stored = await getRawDoc(id);
    expect(stored.exists).toBe(true);
  });
});
