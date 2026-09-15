import 'server-only';
import { fsCreateDoc, fsSetDoc, fsGetDoc, fsDeleteDoc } from '@/lib/server/firestoreRest';

/**
 * Per-day, per-recipient send idempotency for the email cron routes.
 *
 * Not specific to the Not The Rug brief pipeline — leads-digest and
 * founder-brief share this so "a duplicate trigger cannot double-send" means
 * the same thing for both. Lives under app/api/cron (a route-adjacent, non-
 * routed "_lib" folder) rather than lib/email/**, which this task does not own.
 */

const SEND_LOG_COLLECTION = 'emailSendLog';
const TZ = 'America/New_York';

// A claim stuck in 'pending' (the process was killed between the atomic
// claim and recordSendOutcome — a route maxDuration timeout, a Resend hang)
// must not permanently skip that day's send with no error recorded. Mirrors
// lib/not-the-rug-brief/run.ts's lease-staleness pattern: short enough that a
// genuinely crashed claim is reclaimed the same day, long enough to cover a
// real in-flight send (both cron routes cap at maxDuration = 30).
const PENDING_CLAIM_STALE_MS = 2 * 60 * 1000;

/** Calendar-day key in the business's own timezone, matching lib/leads/stats.ts. */
export function todayKeyET(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function docId(kind: string, day: string, recipient: string): string {
  const safeRecipient = recipient.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  return `${kind}_${day}_${safeRecipient}`;
}

/**
 * Atomically claims the one-time send slot for (kind, day, recipient).
 * Returns true if this call may proceed to send — false if another request
 * (a duplicate cron trigger, or an earlier successful send) already claimed
 * it. fsCreateDoc's create-if-absent semantics make this safe across
 * concurrent invocations, the same guarantee lead-intake idempotency relies on.
 */
export async function claimDailySend(kind: string, recipient: string, day: string = todayKeyET()): Promise<boolean> {
  const path = `${SEND_LOG_COLLECTION}/${docId(kind, day, recipient)}`;
  const seed = { kind, recipient, day, claimedAt: new Date().toISOString(), outcome: 'pending' };

  const first = await fsCreateDoc(path, seed);
  if (first.created) return true;

  // Something already holds this slot. Only reclaim a *pending* claim that
  // has gone stale — a resolved claim ('sent' or 'failed') must never be
  // reclaimed, since that resolution is the actual duplicate-send guard.
  const existing = await fsGetDoc(path).catch(() => null);
  const data = existing?.data as { outcome?: string; claimedAt?: string } | undefined;
  if (data?.outcome !== 'pending') return false;

  const claimedAtMs = data.claimedAt ? new Date(data.claimedAt).getTime() : NaN;
  const ageMs = Number.isFinite(claimedAtMs) ? Date.now() - claimedAtMs : Number.POSITIVE_INFINITY;
  if (ageMs <= PENDING_CLAIM_STALE_MS) return false;

  // Stale pending claim from a crashed attempt — reclaim it. Not perfectly
  // atomic (delete then create is two operations), the same tradeoff the
  // brief run lease makes: this path only matters for crash recovery, not
  // normal traffic, which fsCreateDoc alone already serializes.
  await fsDeleteDoc(path).catch(() => {});
  const retry = await fsCreateDoc(path, seed);
  return retry.created;
}

/**
 * Records what happened after a claimed send attempt. Best-effort — a
 * failure here is logged, not thrown, since the send itself already happened
 * (or failed) and the caller's response already reflects that.
 */
export async function recordSendOutcome(
  kind: string,
  recipient: string,
  day: string,
  outcome: { status: 'sent' | 'failed'; emailId?: string; error?: string },
): Promise<void> {
  try {
    await fsSetDoc(`${SEND_LOG_COLLECTION}/${docId(kind, day, recipient)}`, {
      kind,
      recipient,
      day,
      recordedAt: new Date().toISOString(),
      outcome: outcome.status,
      emailId: outcome.emailId ?? null,
      error: outcome.error ?? null,
    });
  } catch (err) {
    console.error(`[cron:${kind}] failed to record send outcome:`, err instanceof Error ? err.message : err);
  }
}
