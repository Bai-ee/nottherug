/**
 * Coverage for app/api/cron/_lib/sendGuard.ts: the per-day, per-recipient
 * idempotency shared by the founder-brief and leads-digest cron routes.
 * Firestore is mocked with an in-memory map — nothing here reaches the network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type FsDoc = { data: Record<string, unknown> };
let store: Map<string, FsDoc>;

const fsCreateDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  if (store.has(path)) return { created: false };
  store.set(path, { data });
  return { created: true };
});
const fsSetDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  store.set(path, { data });
});

vi.mock('@/lib/server/firestoreRest', () => ({
  fsCreateDoc,
  fsSetDoc,
  fsGetDoc: vi.fn(async () => ({ exists: false })),
  fsDeleteDoc: vi.fn(),
  fsQueryCollection: vi.fn(async () => []),
  fsIncrementField: vi.fn(async () => 1),
}));

vi.mock('server-only', () => ({}));

beforeEach(() => {
  store = new Map();
  vi.clearAllMocks();
});

describe('claimDailySend', () => {
  it('claims the slot once and refuses a duplicate trigger for the same day/recipient', async () => {
    const { claimDailySend } = await import('@/app/api/cron/_lib/sendGuard');

    const first = await claimDailySend('founder-brief', 'founder@example.test', '2026-09-01');
    const second = await claimDailySend('founder-brief', 'founder@example.test', '2026-09-01');

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(fsCreateDoc).toHaveBeenCalledTimes(2);
  });

  it('treats a different day or a different recipient as a separate slot', async () => {
    const { claimDailySend } = await import('@/app/api/cron/_lib/sendGuard');

    expect(await claimDailySend('founder-brief', 'founder@example.test', '2026-09-01')).toBe(true);
    expect(await claimDailySend('founder-brief', 'founder@example.test', '2026-09-02')).toBe(true);
    expect(await claimDailySend('founder-brief', 'other@example.test', '2026-09-01')).toBe(true);
  });

  it('keeps founder-brief and leads-digest as independent kinds for the same day', async () => {
    const { claimDailySend } = await import('@/app/api/cron/_lib/sendGuard');

    expect(await claimDailySend('founder-brief', 'founder@example.test', '2026-09-01')).toBe(true);
    expect(await claimDailySend('leads-digest', 'founder@example.test', '2026-09-01')).toBe(true);
  });
});

describe('todayKeyET', () => {
  it('formats a date as YYYY-MM-DD in America/New_York', async () => {
    const { todayKeyET } = await import('@/app/api/cron/_lib/sendGuard');
    // 2026-01-01T04:30:00Z is still 2025-12-31 evening in New York.
    expect(todayKeyET(new Date('2026-01-01T04:30:00.000Z'))).toBe('2025-12-31');
  });
});
