import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LeadRecord } from '@/lib/leads/contract';

const fsQueryCollection = vi.fn(async () => [] as unknown[]);

vi.mock('@/lib/server/firestoreRest', () => ({ fsQueryCollection }));

function lead(id: string, submittedAtIso: string, overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id,
    type: 'meetgreet',
    submittedAt: submittedAtIso,
    email: `${id}@example.test`,
    ownerName: id,
    source: 'book-page',
    ...overrides,
  };
}

describe('getLeadStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a truthfully named, capped recent count', async () => {
    fsQueryCollection.mockResolvedValueOnce([lead('a', '2026-01-05T12:00:00.000Z')]);
    const { getLeadStats } = await import('@/lib/leads/stats');
    const stats = await getLeadStats(7);
    expect(stats.totals.recentCount).toBe(1);
    expect(stats.totals.recentCountCap).toBeGreaterThan(0);
    expect(fsQueryCollection).toHaveBeenCalledWith('leads', 'submittedAt', 'DESCENDING', stats.totals.recentCountCap);
  });

  it('buckets a lead just before and just after NY local midnight into the correct calendar day', async () => {
    // "now" = 2026-01-15 noon in New York (UTC-5 in January) = 17:00Z.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T17:00:00.000Z'));

    fsQueryCollection.mockResolvedValueOnce([
      lead('before-midnight', '2026-01-15T04:59:59.000Z'), // 2026-01-14 23:59:59 NY
      lead('after-midnight', '2026-01-15T05:00:01.000Z'), // 2026-01-15 00:00:01 NY
    ]);

    const { getLeadStats } = await import('@/lib/leads/stats');
    const stats = await getLeadStats(7);

    expect(stats.today.dateLabel).toBe('2026-01-15');
    expect(stats.yesterday.dateLabel).toBe('2026-01-14');
    expect(stats.today.leads.map((l) => l.id)).toEqual(['after-midnight']);
    expect(stats.yesterday.leads.map((l) => l.id)).toEqual(['before-midnight']);
  });

  it('keeps day bucketing correct across the spring-forward DST transition', async () => {
    // "now" = 2026-03-09 noon NY (EDT, UTC-4, after the transition).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T16:00:00.000Z'));

    fsQueryCollection.mockResolvedValueOnce([
      // 2026-03-08 01:59 EST (before the 2am -> 3am jump)
      lead('pre-transition', '2026-03-08T06:59:00.000Z'),
      // 2026-03-08 03:01 EDT (right after the jump, same calendar day)
      lead('post-transition', '2026-03-08T07:01:00.000Z'),
      // 2026-03-07 23:59 EST — the day before
      lead('day-before', '2026-03-08T04:59:00.000Z'),
    ]);

    const { getLeadStats } = await import('@/lib/leads/stats');
    const stats = await getLeadStats(7);

    const byDate = new Map(stats.byDay.map((d) => [d.date, d.count]));
    expect(byDate.get('2026-03-08')).toBe(2);
    expect(byDate.get('2026-03-07')).toBe(1);
  });

  it('keeps day bucketing correct across the fall-back DST transition', async () => {
    // "now" = 2026-11-01 noon NY (EST, UTC-5, after the transition).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T17:00:00.000Z'));

    fsQueryCollection.mockResolvedValueOnce([
      // 2026-11-01 01:30 EDT, before the 2am -> 1am repeat (05:30Z at UTC-4)
      lead('pre-fallback', '2026-11-01T05:30:00.000Z'),
      // 2026-11-01 01:30 EST, the same wall-clock hour repeated after the
      // fall-back (06:30Z at UTC-5) — a naive UTC-offset-only bucketing
      // would double this into the wrong day or miscount it.
      lead('post-fallback', '2026-11-01T06:30:00.000Z'),
      // 2026-10-31 23:59 EDT — the day before
      lead('day-before', '2026-11-01T03:59:00.000Z'),
    ]);

    const { getLeadStats } = await import('@/lib/leads/stats');
    const stats = await getLeadStats(7);

    const byDate = new Map(stats.byDay.map((d) => [d.date, d.count]));
    expect(byDate.get('2026-11-01')).toBe(2);
    expect(byDate.get('2026-10-31')).toBe(1);
  });
});
