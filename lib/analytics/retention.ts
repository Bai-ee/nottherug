// Analytics retention cleanup (plan 003, "Owner decisions settled after A6":
// 13 months for raw `analytics_events`, 48 hours for `analyticsRateLimits`).
// Not scheduled anywhere — see app/api/admin/analytics/cleanup/route.ts and
// docs/analytics-operations.md for how an operator runs this by hand.
//
// Pure and deterministic: every cutoff is derived from a passed-in `now`,
// never from Date.now() inside this file, so tests never race a real clock.

import { fsDeleteDoc, fsQueryRangeWithIds } from '@/lib/server/firestoreRest';
import { EVENTS_COLLECTION } from '@/lib/analytics/events';

export const RATE_LIMITS_COLLECTION = 'analyticsRateLimits';

const EVENTS_RETENTION_MONTHS = 13;
const RATE_LIMIT_RETENTION_HOURS = 48;

// Per-collection ceiling for a single run. This is a hard cap on the query
// (never an unbounded scan) AND on the number of deletes attempted, since
// each delete is its own Firestore REST call rather than part of a batch
// commit. Sized so a run comfortably finishes inside a normal serverless
// request even from cold, while staying well above this project's actual
// daily inflow (docs/analytics-operations.md: ~500-1,000 analytics_events
// writes/day at ~100 visits/day, and analyticsRateLimits documents are
// smaller and slower-growing still) — a routine run should clear its whole
// backlog in one call. A long-neglected backlog instead takes a few calls:
// `moreRemain` on the result says so rather than silently truncating.
// Exported so tests can size ceiling/truncation fixtures against the real
// number instead of duplicating it as an independent magic constant.
export const MAX_DELETES_PER_COLLECTION = 300;

// Deletes run in small concurrent chunks rather than one at a time (slow) or
// all at once (unbounded outstanding requests against Firestore/emulator).
const DELETE_CONCURRENCY = 20;

const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

/** 13 months before `now`, as the same ISO-8601 UTC string analytics_events'
 *  `receivedAt` field uses (the field lib/analytics/report.ts orders on). */
export function eventsCutoffIso(now: Date): string {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - EVENTS_RETENTION_MONTHS);
  return cutoff.toISOString();
}

/** 48 hours before `now`, in epoch milliseconds — the same unit
 *  analyticsRateLimits' `windowStart` field is stored in (see
 *  app/api/track/route.ts's checkRateLimit). */
export function rateLimitCutoffMs(now: Date): number {
  return now.getTime() - RATE_LIMIT_RETENTION_HOURS * 60 * 60 * 1000;
}

export interface CollectionCleanupResult {
  collection: string;
  /** Rows the bounded query actually returned (never more than the per-run ceiling). */
  examined: number;
  /** Rows actually removed. Always 0 for a dry run. */
  deleted: number;
  /** Rows whose delete call failed; still present afterward, so they count toward `moreRemain`. */
  errors: number;
  /**
   * True when another run would likely find more matching rows: either this
   * run's query hit the ceiling (there may be older rows beyond what was
   * read), or some of what it found failed to delete. False means this
   * collection's backlog, as of `now`, is fully cleared.
   */
  moreRemain: boolean;
}

export interface RetentionCleanupResult {
  generatedAt: string;
  dryRun: boolean;
  events: CollectionCleanupResult;
  rateLimits: CollectionCleanupResult;
  /** Convenience OR of both collections' `moreRemain` — run again if true. */
  moreRemain: boolean;
}

/**
 * Deletes up to `DELETE_CONCURRENCY` documents at a time from `ids`, using
 * Promise.allSettled so one failing delete never aborts the rest of the
 * chunk or loses the counts already accumulated from earlier chunks.
 * fsDeleteDoc itself already treats a 404 (already gone) as success, which
 * is what makes two overlapping runs of this function safe to run
 * concurrently — a doc deleted by one run is simply a no-op delete for the
 * other, not an error.
 */
async function deleteAll(collection: string, ids: string[]): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  for (let i = 0; i < ids.length; i += DELETE_CONCURRENCY) {
    const chunk = ids.slice(i, i + DELETE_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((id) => fsDeleteDoc(`${collection}/${id}`)));
    for (const r of results) {
      if (r.status === 'fulfilled') deleted++;
      else errors++;
    }
  }
  return { deleted, errors };
}

/**
 * Finds and (unless `dryRun`) deletes documents in `collection` whose
 * `field` is strictly older than `cutoff` — i.e. queries the half-open range
 * [start-of-time, cutoff). A document exactly AT the cutoff instant is
 * therefore kept, not deleted: this matches the half-open [start, end)
 * convention `fsQueryRange`/report.ts already use everywhere else, so
 * "keep N months/hours" consistently means "keep everything up to, but not
 * including, the cutoff" rather than needing a separate rule for this file.
 */
async function cleanupCollection(
  collection: string,
  field: string,
  cutoff: string | number,
  dryRun: boolean
): Promise<CollectionCleanupResult> {
  const start: string | number = typeof cutoff === 'number' ? 0 : EPOCH_ISO;
  const rows = await fsQueryRangeWithIds(collection, field, start, cutoff, MAX_DELETES_PER_COLLECTION, 'ASCENDING');
  const examined = rows.length;

  if (dryRun) {
    return { collection, examined, deleted: 0, errors: 0, moreRemain: examined >= MAX_DELETES_PER_COLLECTION };
  }

  const { deleted, errors } = await deleteAll(collection, rows.map((r) => r.id));
  return {
    collection,
    examined,
    deleted,
    errors,
    moreRemain: examined >= MAX_DELETES_PER_COLLECTION || errors > 0,
  };
}

/**
 * Runs one bounded retention pass over both analytics collections. Safe to
 * call repeatedly (idempotent) and safe to call concurrently with itself
 * (each collection's deletes only ever remove documents that are still
 * older than that call's own cutoff, and a duplicate delete is a no-op).
 */
export async function runAnalyticsRetentionCleanup(now: Date, dryRun: boolean): Promise<RetentionCleanupResult> {
  const [events, rateLimits] = await Promise.all([
    cleanupCollection(EVENTS_COLLECTION, 'receivedAt', eventsCutoffIso(now), dryRun),
    cleanupCollection(RATE_LIMITS_COLLECTION, 'windowStart', rateLimitCutoffMs(now), dryRun),
  ]);

  return {
    generatedAt: now.toISOString(),
    dryRun,
    events,
    rateLimits,
    moreRemain: events.moreRemain || rateLimits.moreRemain,
  };
}
