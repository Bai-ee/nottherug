import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { FirestorePreconditionError, withOptimisticRetry } from '@/lib/server/firestoreRest';
import {
  getBenchPersonWithMeta,
  getBenchSettings,
  isBenchPersonId,
  mergeBenchPerson,
  toAdminPerson,
} from '@/lib/server/bench';
import { sendApplicantEmail } from '@/lib/server/benchEmail';
import { ACTION_RULES, actionAllowed } from '@/lib/bench/stages';
import {
  BENCH_ACTIONS,
  BENCH_FIELD_LIMITS,
  type BenchAction,
  type BenchPerson,
  type NotificationOutcome,
} from '@/lib/bench/contract';
import {
  applicationDeclinedEmail,
  conditionalOfferEmail,
  shadowInviteEmail,
} from '@/lib/email/bench-templates';

export const runtime = 'nodejs';
export const maxDuration = 20;

class PersonMissingError extends Error {}
class ActionNotAllowedError extends Error {
  constructor(readonly action: BenchAction) {
    super('action not allowed');
  }
}

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** The email an action sends, if any. SMS joins these in Phase 3. */
async function notifyFor(
  action: BenchAction,
  person: BenchPerson,
  shadowBookingUrl: string,
): Promise<Record<string, NotificationOutcome>> {
  if (action === 'invite_shadow') {
    return { shadowInvite: await sendApplicantEmail(person.email, shadowInviteEmail(person, shadowBookingUrl), 'invite') };
  }
  if (action === 'reject') {
    return { declined: await sendApplicantEmail(person.email, applicationDeclinedEmail(person), 'reject') };
  }
  if (action === 'conditional_offer') {
    return { offer: await sendApplicantEmail(person.email, conditionalOfferEmail(person), 'offer') };
  }
  return {};
}

/** One stage action on one person (plan §7.3–7.4). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  let adminEmail: string;
  try {
    adminEmail = await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }

  const { id } = await ctx.params;
  if (!isBenchPersonId(id)) return badRequest('Unknown person', 404);

  let body: Record<string, unknown>;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return badRequest('Invalid request');
    body = raw as Record<string, unknown>;
  } catch {
    return badRequest('Invalid JSON');
  }

  const action = body.action;
  if (typeof action !== 'string' || !(BENCH_ACTIONS as readonly string[]).includes(action)) {
    return badRequest('Unknown action');
  }
  const benchAction = action as BenchAction;

  // Everything that can fail validation is checked before any write.
  let notes: string | undefined;
  if (benchAction === 'save_notes') {
    if (typeof body.notes !== 'string' || body.notes.length > BENCH_FIELD_LIMITS.notes) {
      return badRequest('Notes must be text, 4,000 characters at most');
    }
    notes = body.notes;
  }

  let rating: number | undefined;
  if (benchAction === 'mark_shadow_done' && body.rating !== undefined && body.rating !== null) {
    const r = body.rating;
    if (typeof r !== 'number' || !Number.isInteger(r) || r < 1 || r > 5) {
      return badRequest('Rating must be a whole number from 1 to 5');
    }
    rating = r;
  }

  // Read before the write, so a settings failure cannot leave a half-done action.
  let shadowBookingUrl = '';
  if (benchAction === 'invite_shadow') {
    try {
      shadowBookingUrl = (await getBenchSettings()).shadowBookingUrl;
    } catch (err) {
      return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Settings load failed'));
    }
  }

  // Write only the fields this action changes, conditional on the version it was
  // decided against: an applicant's resume upload or an AI summary landing in
  // between is never overwritten, and a concurrent admin edit is re-read, not lost.
  let next: BenchPerson;
  try {
    next = await withOptimisticRetry(async () => {
      const { person, updateTime } = await getBenchPersonWithMeta(id);
      if (!person) throw new PersonMissingError();
      if (!updateTime) throw new Error('Person read returned no updateTime');
      if (!actionAllowed(benchAction, person.stage, person.onHold)) throw new ActionNotAllowedError(benchAction);

      const now = new Date().toISOString();
      const fields: Partial<BenchPerson> = { updatedAt: now };
      if (notes !== undefined) fields.notes = notes;
      if (rating !== undefined) fields.shadowRating = rating;
      if (benchAction === 'hold') fields.onHold = true;
      if (benchAction === 'unhold') fields.onHold = false;

      const target = ACTION_RULES[benchAction].to;
      if (target) {
        fields.stage = target;
        fields.onHold = false;
        fields.stageHistory = [...(person.stageHistory ?? []), { stage: target, at: now, by: adminEmail }];
        // New bench members start at tier B (plan §5); a pinned tier is never overwritten.
        if (target === 'bench' && !person.tierPinned && !person.tier) fields.tier = 'B';
      }

      await mergeBenchPerson(id, fields, { precondition: { updateTime } });
      return { ...person, ...fields };
    });
  } catch (err) {
    if (err instanceof PersonMissingError) return badRequest('Unknown person', 404);
    if (err instanceof ActionNotAllowedError) {
      return badRequest(`"${ACTION_RULES[err.action].label}" is not available at this stage`, 409);
    }
    if (err instanceof FirestorePreconditionError) {
      return badRequest('This applicant was just changed by someone else. Refresh and try again.', 409);
    }
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Person save failed'));
  }

  // The email goes out once, after the stage change is stored, and is never retried.
  const sent = await notifyFor(benchAction, next, shadowBookingUrl);
  if (Object.keys(sent).length) {
    try {
      next = await withOptimisticRetry(async () => {
        const { person, updateTime } = await getBenchPersonWithMeta(id);
        if (!person || !updateTime) throw new Error('Person vanished before notifications were recorded');
        const fields: Partial<BenchPerson> = { notifications: { ...(person.notifications ?? {}), ...sent } };
        await mergeBenchPerson(id, fields, { precondition: { updateTime } });
        return { ...person, ...fields };
      });
    } catch (err) {
      // The stage change is saved and the email went out; only its outcome record is missing.
      console.error('[bench:admin] notification persist failed', err instanceof Error ? err.message : 'unknown');
      next = { ...next, notifications: { ...(next.notifications ?? {}), ...sent } };
    }
  }

  return NextResponse.json({ person: toAdminPerson(next), notifications: sent });
}
