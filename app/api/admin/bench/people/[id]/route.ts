import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import {
  getBenchPerson,
  getBenchSettings,
  isBenchPersonId,
  saveBenchPerson,
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

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** The email an action sends, if any. SMS joins these in Phase 3. */
async function notifyFor(action: BenchAction, person: BenchPerson): Promise<Record<string, NotificationOutcome>> {
  if (action === 'invite_shadow') {
    const settings = await getBenchSettings();
    return {
      shadowInvite: await sendApplicantEmail(person.email, shadowInviteEmail(person, settings.shadowBookingUrl), 'invite'),
    };
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

  let person: BenchPerson | null;
  try {
    person = await getBenchPerson(id);
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Person load failed'));
  }
  if (!person) return badRequest('Unknown person', 404);

  if (!actionAllowed(benchAction, person.stage, person.onHold)) {
    return badRequest(`"${ACTION_RULES[benchAction].label}" is not available at this stage`, 409);
  }

  const now = new Date().toISOString();
  const next: BenchPerson = { ...person, updatedAt: now };

  if (benchAction === 'save_notes') {
    if (typeof body.notes !== 'string' || body.notes.length > BENCH_FIELD_LIMITS.notes) {
      return badRequest('Notes must be text, 4,000 characters at most');
    }
    next.notes = body.notes;
  }

  if (benchAction === 'mark_shadow_done' && body.rating !== undefined && body.rating !== null) {
    const rating = body.rating;
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return badRequest('Rating must be a whole number from 1 to 5');
    }
    next.shadowRating = rating;
  }

  if (benchAction === 'hold') next.onHold = true;
  if (benchAction === 'unhold') next.onHold = false;

  const target = ACTION_RULES[benchAction].to;
  if (target) {
    next.stage = target;
    next.onHold = false;
    next.stageHistory = [...(person.stageHistory ?? []), { stage: target, at: now, by: adminEmail }];
    // New bench members start at tier B (plan §5); a pinned tier is never overwritten.
    if (target === 'bench' && !person.tierPinned && !person.tier) next.tier = 'B';
  }

  const sent = await notifyFor(benchAction, next);
  if (Object.keys(sent).length) next.notifications = { ...(person.notifications ?? {}), ...sent };

  try {
    await saveBenchPerson(next);
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Person save failed'));
  }

  return NextResponse.json({ person: toAdminPerson(next), notifications: sent });
}
