import { createHash } from 'node:crypto';
import { fsGetDoc, fsMergeDoc, withOptimisticRetry } from '@/lib/server/firestoreRest';
import { LEAD_SCHEMA_VERSION } from '@/lib/leads/contract';

/**
 * Monotonic writes for the email-keyed capture row (`leads/capture_<hash>`),
 * which two routes touch concurrently:
 *
 *   - app/api/leads/capture    records "this address entered the booking flow"
 *   - app/api/leads/meetgreet  records "this address finished the questionnaire"
 *
 * Both read the row, decide, then write. Each write is a conditional merge on
 * the row's update time, retried (bounded) when the other route got there
 * first, and each only sends the fields its caller owns. Rules:
 *
 *   - `status: 'converted'`, `convertedLeadId`, `convertedAt` are never cleared
 *     or replaced once set (the first conversion wins).
 *   - `bookedSelfReported` only ever goes false -> true. It is the visitor's
 *     own browser reporting a Calendly completion, never proof of a booking.
 *   - `submittedAt` (first seen) is written once and never moved.
 *   - A conversion that arrives before any capture creates the row already
 *     converted, so a later capture cannot make a fresh outstanding row.
 */

export function captureIdForEmail(email: string): string {
  return `capture_${createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)}`;
}

/** Absolute deadline for a route's dependency calls, `ms` from now. */
export function deadlineIn(ms: number): number {
  return Date.now() + ms;
}

/**
 * Per-call timeout: at most `capMs`, never more than what is left before
 * `deadlineAt`, and never below `floorMs` so a nearly spent budget still gives
 * the call a real (short) chance instead of an instant abort.
 */
export function callTimeout(deadlineAt: number, capMs: number, floorMs = 250): number {
  return Math.max(floorMs, Math.min(capMs, deadlineAt - Date.now()));
}

/** Bounded conflict retries; the budget deadline stops the loop earlier if time runs out. */
const CONFLICT_ATTEMPTS = 5;

export interface TransitionBudget {
  deadlineAt: number;
  /** Cap for any single Firestore call. */
  perCallMs: number;
}

function opts(budget: TransitionBudget) {
  return { timeoutMs: callTimeout(budget.deadlineAt, budget.perCallMs) };
}

function ensureWithinBudget(budget: TransitionBudget): void {
  if (Date.now() >= budget.deadlineAt) throw new Error('lead transition budget exhausted');
}

const matchesUpdateTime = (updateTime: string | undefined) =>
  updateTime ? { precondition: { updateTime } } : {};

export interface CaptureInput {
  email: string;
  source: string;
  /** The visitor's own "Calendly reported a completion" hint. */
  booked: boolean;
  nowIso: string;
}

export interface CaptureOutcome {
  id: string;
  /** Set when this address already completed the questionnaire. */
  convertedLeadId?: string;
}

/** Record or refresh a partial capture without undoing anything another writer set. */
export async function recordCapture(input: CaptureInput, budget: TransitionBudget): Promise<CaptureOutcome> {
  const id = captureIdForEmail(input.email);
  const path = `leads/${id}`;

  return withOptimisticRetry(async () => {
    ensureWithinBudget(budget);
    const existing = await fsGetDoc(path, opts(budget));

    if (!existing.exists || !existing.data) {
      ensureWithinBudget(budget);
      await fsMergeDoc(
        path,
        {
          id,
          type: 'capture',
          schemaVersion: LEAD_SCHEMA_VERSION,
          status: 'partial',
          email: input.email,
          source: input.source,
          submittedAt: input.nowIso,
          lastSeenAt: input.nowIso,
          bookedSelfReported: input.booked,
        },
        { ...opts(budget), precondition: { exists: false } },
      );
      return { id };
    }

    const data = existing.data;
    // Only fields this writer owns. `status` is left alone on an existing row so
    // a conversion can never be overwritten; it is set only if the row has none.
    const isConverted = data.status === 'converted';
    const patch: Record<string, unknown> = { lastSeenAt: input.nowIso };
    // A converted row is history: keep the email and source it was converted under.
    if (!isConverted) {
      patch.email = input.email;
      patch.source = input.source;
    }
    if (typeof data.submittedAt !== 'string') patch.submittedAt = input.nowIso;
    if (typeof data.status !== 'string') patch.status = 'partial';
    if (input.booked && data.bookedSelfReported !== true) patch.bookedSelfReported = true;

    ensureWithinBudget(budget);
    await fsMergeDoc(path, patch, { ...opts(budget), ...matchesUpdateTime(existing.updateTime) });

    const convertedLeadId =
      data.status === 'converted' && typeof data.convertedLeadId === 'string' && data.convertedLeadId
        ? data.convertedLeadId
        : undefined;
    return { id, convertedLeadId };
  }, { maxAttempts: CONFLICT_ATTEMPTS });
}

/** Best-effort true-only booking hint onto the full lead (admin hides the converted capture row). */
export async function carryBookedHintToLead(leadId: string, budget: TransitionBudget): Promise<void> {
  // Merging `true` is idempotent and cannot conflict with another true, so no precondition.
  await fsMergeDoc(`leads/${leadId}`, { bookedSelfReported: true }, opts(budget));
}

export interface ConversionInput {
  email: string;
  leadId: string;
  /** Source of the full submission; only used if this creates the marker row. */
  source: string;
  atIso: string;
}

export interface ConversionOutcome {
  /** The capture row's self-reported booking hint at the moment of conversion. */
  bookedSelfReported: boolean;
}

/**
 * Mark the address converted. Creates a converted marker if no capture exists
 * yet, keeps the first conversion if there already is one.
 */
export async function recordConversion(input: ConversionInput, budget: TransitionBudget): Promise<ConversionOutcome> {
  const id = captureIdForEmail(input.email);
  const path = `leads/${id}`;

  return withOptimisticRetry(async () => {
    ensureWithinBudget(budget);
    const existing = await fsGetDoc(path, opts(budget));

    if (!existing.exists || !existing.data) {
      ensureWithinBudget(budget);
      await fsMergeDoc(
        path,
        {
          id,
          type: 'capture',
          schemaVersion: LEAD_SCHEMA_VERSION,
          status: 'converted',
          email: input.email.trim(),
          source: input.source,
          submittedAt: input.atIso,
          lastSeenAt: input.atIso,
          bookedSelfReported: false,
          convertedLeadId: input.leadId,
          convertedAt: input.atIso,
        },
        { ...opts(budget), precondition: { exists: false } },
      );
      return { bookedSelfReported: false };
    }

    const data = existing.data;
    const bookedSelfReported = data.bookedSelfReported === true;
    const alreadyConverted =
      data.status === 'converted' && typeof data.convertedLeadId === 'string' && data.convertedLeadId.length > 0;
    if (alreadyConverted) return { bookedSelfReported };

    ensureWithinBudget(budget);
    await fsMergeDoc(
      path,
      { status: 'converted', convertedLeadId: input.leadId, convertedAt: input.atIso },
      { ...opts(budget), ...matchesUpdateTime(existing.updateTime) },
    );
    return { bookedSelfReported };
  }, { maxAttempts: CONFLICT_ATTEMPTS });
}
