import 'server-only';
import { fsCreateDoc, fsSetDoc } from '@/lib/server/firestoreRest';

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
  const { created } = await fsCreateDoc(`${SEND_LOG_COLLECTION}/${docId(kind, day, recipient)}`, {
    kind,
    recipient,
    day,
    claimedAt: new Date().toISOString(),
    outcome: 'pending',
  });
  return created;
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
