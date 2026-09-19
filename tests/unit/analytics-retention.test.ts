/**
 * Coverage for lib/analytics/retention.ts (plan 003, "Owner decisions
 * settled after A6"): 13-month analytics_events retention, 48-hour
 * analyticsRateLimits retention, the batch ceiling and "more remain" signal,
 * dry run, and delete-failure isolation.
 *
 * fsQueryRangeWithIds/fsDeleteDoc are mocked with a small in-memory
 * implementation that actually applies the requested [start, end) range,
 * limit, and ordering — the same contract real Firestore has — so these
 * tests exercise retention's own cutoff math, not just its wiring. Mirrors
 * the fixture-driven mocking style in tests/unit/analytics-report.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { id: string; data: Record<string, unknown> };

const fsQueryRangeWithIds = vi.fn();
const fsDeleteDoc = vi.fn();

vi.mock('@/lib/server/firestoreRest', () => ({
  fsQueryRangeWithIds: (...args: unknown[]) => fsQueryRangeWithIds(...args),
  fsDeleteDoc: (...args: unknown[]) => fsDeleteDoc(...args),
}));

const NOW = new Date('2026-09-16T12:00:00.000Z');

/** Wires fsQueryRangeWithIds to a real [start, end) filter/sort/limit over per-collection fixtures. */
function mockRanges(byCollection: Record<string, Row[]>) {
  fsQueryRangeWithIds.mockImplementation(
    async (collection: string, field: string, start: string | number, end: string | number, limit = 5000) => {
      const fixtures = byCollection[collection] ?? [];
      const matches = fixtures.filter((r) => {
        const v = r.data[field] as string | number;
        return v >= start && v < end;
      });
      matches.sort((a, b) => {
        const av = a.data[field] as string | number;
        const bv = b.data[field] as string | number;
        return av < bv ? -1 : av > bv ? 1 : 0;
      });
      return matches.slice(0, limit);
    }
  );
}

describe('runAnalyticsRetentionCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsDeleteDoc.mockResolvedValue(undefined);
  });

  it('deletes analytics_events older than 13 months and keeps events inside the window', async () => {
    const old = { id: 'old-1', data: { receivedAt: '2025-06-01T00:00:00.000Z' } }; // ~15.5 months before NOW
    const recent = { id: 'recent-1', data: { receivedAt: '2026-08-01T00:00:00.000Z' } }; // ~1.5 months before NOW
    mockRanges({ analytics_events: [old, recent], analyticsRateLimits: [] });

    const { runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    const result = await runAnalyticsRetentionCleanup(NOW, false);

    expect(result.events.examined).toBe(1);
    expect(result.events.deleted).toBe(1);
    expect(fsDeleteDoc).toHaveBeenCalledWith('analytics_events/old-1');
    expect(fsDeleteDoc).not.toHaveBeenCalledWith('analytics_events/recent-1');
  });

  it('deletes analyticsRateLimits documents older than 48 hours and keeps newer ones', async () => {
    const now = NOW.getTime();
    const old = { id: 'hash1_100', data: { windowStart: now - 72 * 60 * 60 * 1000, count: 3 } }; // 72h old
    const recent = { id: 'hash2_200', data: { windowStart: now - 1 * 60 * 60 * 1000, count: 1 } }; // 1h old
    mockRanges({ analytics_events: [], analyticsRateLimits: [old, recent] });

    const { runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    const result = await runAnalyticsRetentionCleanup(NOW, false);

    expect(result.rateLimits.examined).toBe(1);
    expect(result.rateLimits.deleted).toBe(1);
    expect(fsDeleteDoc).toHaveBeenCalledWith('analyticsRateLimits/hash1_100');
    expect(fsDeleteDoc).not.toHaveBeenCalledWith('analyticsRateLimits/hash2_200');
  });

  it('keeps a document exactly at the events cutoff instant (half-open range excludes the boundary)', async () => {
    const { eventsCutoffIso, runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    const boundary = { id: 'boundary-event', data: { receivedAt: eventsCutoffIso(NOW) } };
    mockRanges({ analytics_events: [boundary], analyticsRateLimits: [] });

    const result = await runAnalyticsRetentionCleanup(NOW, false);

    // The cleanup query is [epoch, cutoff) — LESS_THAN, not LESS_THAN_OR_EQUAL —
    // so a row exactly at the cutoff is on the "keep" side, same half-open
    // convention fsQueryRange/report.ts use for every other bounded query in
    // this codebase. It never reaches the query result, so it's never examined.
    expect(result.events.examined).toBe(0);
    expect(result.events.deleted).toBe(0);
    expect(fsDeleteDoc).not.toHaveBeenCalledWith('analytics_events/boundary-event');
  });

  it('keeps a document exactly at the rate-limit cutoff instant (same half-open convention)', async () => {
    const { rateLimitCutoffMs, runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    const boundary = { id: 'hash3_300', data: { windowStart: rateLimitCutoffMs(NOW) } };
    mockRanges({ analytics_events: [], analyticsRateLimits: [boundary] });

    const result = await runAnalyticsRetentionCleanup(NOW, false);

    expect(result.rateLimits.examined).toBe(0);
    expect(result.rateLimits.deleted).toBe(0);
    expect(fsDeleteDoc).not.toHaveBeenCalledWith('analyticsRateLimits/hash3_300');
  });

  it('respects the per-collection batch ceiling and reports moreRemain when it is hit', async () => {
    const { MAX_DELETES_PER_COLLECTION, runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    // One more deletable row than the ceiling, all comfortably older than 13 months.
    const many: Row[] = Array.from({ length: MAX_DELETES_PER_COLLECTION + 5 }, (_, i) => ({
      id: `old-${i}`,
      data: { receivedAt: new Date(Date.UTC(2020, 0, 1 + i)).toISOString() },
    }));
    mockRanges({ analytics_events: many, analyticsRateLimits: [] });

    const result = await runAnalyticsRetentionCleanup(NOW, false);

    expect(result.events.examined).toBe(MAX_DELETES_PER_COLLECTION);
    expect(result.events.deleted).toBe(MAX_DELETES_PER_COLLECTION);
    expect(result.events.moreRemain).toBe(true);
    expect(result.moreRemain).toBe(true);
  });

  it('reports moreRemain=false when the whole backlog fits under the ceiling', async () => {
    const old = { id: 'old-1', data: { receivedAt: '2020-01-01T00:00:00.000Z' } };
    mockRanges({ analytics_events: [old], analyticsRateLimits: [] });

    const { runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    const result = await runAnalyticsRetentionCleanup(NOW, false);

    expect(result.events.moreRemain).toBe(false);
    expect(result.moreRemain).toBe(false);
  });

  it('dry run finds matching rows but deletes nothing', async () => {
    const old = { id: 'old-1', data: { receivedAt: '2020-01-01T00:00:00.000Z' } };
    const oldRateLimit = { id: 'hash4_400', data: { windowStart: NOW.getTime() - 100 * 60 * 60 * 1000 } };
    mockRanges({ analytics_events: [old], analyticsRateLimits: [oldRateLimit] });

    const { runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    const result = await runAnalyticsRetentionCleanup(NOW, true);

    expect(result.dryRun).toBe(true);
    expect(result.events.examined).toBe(1);
    expect(result.events.deleted).toBe(0);
    expect(result.rateLimits.examined).toBe(1);
    expect(result.rateLimits.deleted).toBe(0);
    expect(fsDeleteDoc).not.toHaveBeenCalled();
  });

  it('a delete failure mid-run does not lose the counts already accumulated', async () => {
    const rows: Row[] = Array.from({ length: 5 }, (_, i) => ({
      id: `old-${i}`,
      data: { receivedAt: new Date(Date.UTC(2020, 0, 1 + i)).toISOString() },
    }));
    mockRanges({ analytics_events: rows, analyticsRateLimits: [] });

    fsDeleteDoc.mockImplementation(async (path: string) => {
      if (path === 'analytics_events/old-2') throw new Error('simulated Firestore delete failure');
    });

    const { runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');
    const result = await runAnalyticsRetentionCleanup(NOW, false);

    // The other 4 deletes still succeeded and are still counted — one bad
    // delete does not throw the whole run away or zero out its counts.
    expect(result.events.examined).toBe(5);
    expect(result.events.deleted).toBe(4);
    expect(result.events.errors).toBe(1);
    // A failed delete means that row is still there, so a retry is needed.
    expect(result.events.moreRemain).toBe(true);
  });

  it('is safe to run twice concurrently against the same backlog', async () => {
    const rows: Row[] = [
      { id: 'old-1', data: { receivedAt: '2020-01-01T00:00:00.000Z' } },
      { id: 'old-2', data: { receivedAt: '2020-01-02T00:00:00.000Z' } },
    ];
    mockRanges({ analytics_events: rows, analyticsRateLimits: [] });
    // Matches fsDeleteDoc's real contract: deleting an already-gone doc is a
    // no-op success (404 is swallowed), never a throw — see
    // lib/server/firestoreRest.ts's fsDeleteDoc. retention.ts has no shared
    // mutable state across calls, so two concurrent runs over the same
    // read-only snapshot simply do the same idempotent work twice.
    const { runAnalyticsRetentionCleanup } = await import('@/lib/analytics/retention');

    const [a, b] = await Promise.all([
      runAnalyticsRetentionCleanup(NOW, false),
      runAnalyticsRetentionCleanup(NOW, false),
    ]);

    expect(a.events.deleted).toBe(2);
    expect(b.events.deleted).toBe(2);
  });
});

describe('TTL expiry stamps', () => {
  it('expires an event 13 months after it was received', async () => {
    const { eventExpiryAt } = await import('@/lib/analytics/retention');
    const expiry = eventExpiryAt(new Date('2026-01-15T10:00:00.000Z'));
    expect(expiry.toISOString()).toBe('2027-02-15T10:00:00.000Z');
  });

  it('expires a rate-limit bucket 48 hours after its window', async () => {
    const { rateLimitExpiryAt } = await import('@/lib/analytics/retention');
    const windowStart = Date.parse('2026-01-15T10:00:00.000Z');
    expect(rateLimitExpiryAt(windowStart).toISOString()).toBe('2026-01-17T10:00:00.000Z');
  });

  it('stamps an expiry the cleanup cutoff agrees with', async () => {
    const { eventExpiryAt, eventsCutoffIso } = await import('@/lib/analytics/retention');
    // A document stamped at receipt is expired exactly when a cleanup run at
    // that moment would also consider it past the cutoff.
    const receivedAt = new Date('2026-01-15T10:00:00.000Z');
    const expiry = eventExpiryAt(receivedAt);
    expect(eventsCutoffIso(expiry)).toBe(receivedAt.toISOString());
  });
});
