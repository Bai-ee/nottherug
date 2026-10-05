import { after, NextResponse } from 'next/server';
import { fsCreateDoc, withOptimisticRetry } from '@/lib/server/firestoreRest';
import {
  BENCH_COLLECTIONS,
  BENCH_SCHEMA_VERSION,
  firstNameOf,
  type BenchPerson,
  type BenchSettings,
  type NotificationOutcome,
  type StageHistoryEntry,
} from '@/lib/bench/contract';
import { areasForApplicant, parseApplication } from '@/lib/bench/validation';
import { knockoutReason } from '@/lib/bench/knockouts';
import { computeCoverage, gapSlotsFilled } from '@/lib/bench/coverage';
import {
  getBenchPersonWithMeta,
  getBenchSettingsOrDefault,
  listBenchPeople,
  mergeBenchPerson,
} from '@/lib/server/bench';
import {
  benchPersonIdForEmail,
  checkBenchRateLimit,
  clientIp,
  newResumeToken,
  readCappedText,
} from '@/lib/server/benchIntake';
import { sendApplicantEmail } from '@/lib/server/benchEmail';
import { isAiSummaryEnabled, summarizeApplication } from '@/lib/server/benchSummary';
import {
  applicationClosedEmail,
  applicationReceivedEmail,
  shadowInviteEmail,
} from '@/lib/email/bench-templates';

/**
 * Public on-call walker application (plans/011 §7.1). Same protections as the
 * meet & greet intake: capped body, honeypot, per-IP rate limit, and
 * idempotency through fsCreateDoc on an email-keyed id.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BODY_BYTES = 20_000;
const RATE_LIMIT_MAX = 5;
const RESUME_TOKEN_TTL_MS = 30 * 60 * 1000;

// maxDuration is 30 s. The overall budget is measured from request start and
// re-sliced before every Firestore call we control; the per-IP rate-limit call
// (benchIntake, default 8 s, fails open) and the applicant email (8 s, fixed in
// benchEmail) are not sliceable, so later steps reserve room for them.
// Worst case with every call stalling: rate 8 + settings 3 + create 4 + coverage 3
// + email 8 = 26 s, leaving ~1 s for the (best-effort, skipped when starved) outcome save.
// The auto-invite stage write (read 3 + write 3, reserving the email) comes first and
// gates the invite email; without budget the invite is not sent (confirmation is).
const ROUTE_BUDGET_MS = 27_000;
const EMAIL_WORST_MS = 8_000;
const MIN_STEP_MS = 500;
type Slice = (cap: number, reserve?: number) => number;

function errorJson(status: number, error: string, details?: unknown) {
  return NextResponse.json(details ? { ok: false, error, details } : { ok: false, error }, { status });
}

/**
 * The objective auto-invite rule (plan §7.3): only when Luis has switched it
 * on, a booking link exists, and the applicant fills an under-target slot.
 * A read failure falls back to a normal review, never to an invite.
 */
async function qualifiesForAutoInvite(person: BenchPerson, settings: BenchSettings, slice: Slice): Promise<boolean> {
  if (!settings.autoInviteOnGap || !settings.shadowBookingUrl) return false;
  try {
    const timeoutMs = slice(3_000, EMAIL_WORST_MS);
    if (!timeoutMs) throw new Error('route time budget exhausted');
    const coverage = computeCoverage(await listBenchPeople({ timeoutMs }), settings);
    return gapSlotsFilled(person, coverage) > 0;
  } catch (err) {
    console.error('[bench:apply] coverage read failed', err instanceof Error ? err.message : 'unknown');
    return false;
  }
}

/**
 * Auto-invite step 1, BEFORE the invite email: move review -> shadow_invited,
 * conditional on the version just read (same order as the admin route: stage
 * stored first, email second). Returns false when an admin already moved the
 * person out of review (admin state wins, no invite). Throws when the write
 * fails or there is no budget left; the caller then sends no invite.
 */
async function claimAutoInviteStage(id: string, at: string, slice: Slice): Promise<boolean> {
  const need = () => {
    const ms = slice(3_000, EMAIL_WORST_MS);
    if (!ms) throw new Error('route time budget exhausted');
    return ms;
  };
  return withOptimisticRetry(async () => {
    const { person, updateTime } = await getBenchPersonWithMeta(id, { timeoutMs: need() });
    if (!person || !updateTime) throw new Error('Person vanished before auto-invite');
    if (person.stage !== 'review') return false;
    await mergeBenchPerson(
      id,
      {
        stage: 'shadow_invited',
        stageHistory: [...person.stageHistory, { stage: 'shadow_invited', at, by: 'auto-invite' }],
        updatedAt: new Date().toISOString(),
      },
      { precondition: { updateTime }, timeoutMs: need() },
    );
    return true;
  });
}

/**
 * Records the email outcome without replacing the record: an admin may already
 * be working on this person. Only `notifications` is written, conditional on the
 * version just read. The email is never re-sent on a retry; only this write is.
 */
async function persistNotifications(id: string, notifications: Record<string, NotificationOutcome>, slice: Slice): Promise<void> {
  const need = () => {
    const ms = slice(3_000);
    if (!ms) throw new Error('route time budget exhausted');
    return ms;
  };
  await withOptimisticRetry(async () => {
    const { person, updateTime } = await getBenchPersonWithMeta(id, { timeoutMs: need() });
    if (!person || !updateTime) return;
    const fields: Partial<BenchPerson> = {
      notifications: { ...(person.notifications ?? {}), ...notifications },
      updatedAt: new Date().toISOString(),
    };
    await mergeBenchPerson(id, fields, { precondition: { updateTime }, timeoutMs: need() });
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const slice: Slice = (cap, reserve = 0) => {
    const ms = Math.min(cap, ROUTE_BUDGET_MS - (Date.now() - startedAt) - reserve);
    return ms >= MIN_STEP_MS ? Math.floor(ms) : 0;
  };
  const text = await readCappedText(req, MAX_BODY_BYTES);
  if (text === null) return errorJson(413, 'Request body too large');

  if (!(await checkBenchRateLimit(clientIp(req), 'apply', RATE_LIMIT_MAX))) {
    return errorJson(429, 'Too many requests. Please try again later.');
  }

  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : undefined;
  } catch {
    return errorJson(400, 'Invalid JSON');
  }

  const settings = await getBenchSettingsOrDefault({ timeoutMs: slice(3_000, EMAIL_WORST_MS) || MIN_STEP_MS });
  const validation = parseApplication(parsed, settings);
  if (!validation.ok) {
    return errorJson(400, validation.errors[0]?.message ?? 'Invalid application', validation.errors);
  }
  const app = validation.data;

  const id = benchPersonIdForEmail(app.email);
  const now = new Date().toISOString();
  const knockout = knockoutReason(app);
  const resume = app.hasResume && !knockout ? newResumeToken() : null;

  const history: StageHistoryEntry[] = [{ stage: 'applied', at: now, by: 'applicant' }];
  history.push({ stage: knockout ? 'rejected' : 'review', at: now, by: knockout ? 'knockout' : 'applicant' });

  const person: BenchPerson = {
    id,
    schemaVersion: BENCH_SCHEMA_VERSION,
    fullName: app.fullName,
    firstName: firstNameOf(app.fullName),
    email: app.email,
    phoneE164: app.phoneE164,
    source: app.source,
    utm: app.utm,
    stage: knockout ? 'rejected' : 'review',
    stageHistory: history,
    onHold: false,
    areas: areasForApplicant(app.answers, settings.areas),
    availability: app.availability,
    unavailableDates: [],
    answers: app.answers,
    confirmedAt: now,
    knockoutReason: knockout,
    resumePath: null,
    resumeKind: null,
    resumeUploadTokenHash: resume?.hash ?? null,
    resumeUploadExpiresAt: resume ? new Date(Date.now() + RESUME_TOKEN_TTL_MS).toISOString() : null,
    aiSummary: null,
    smsConsentAt: app.smsConsent ? now : null,
    smsOptedOut: false,
    employmentType: null,
    tier: null,
    tierPinned: false,
    notes: '',
    shadowRating: null,
    createdAt: now,
    updatedAt: now,
  };

  let created: boolean;
  try {
    const timeoutMs = slice(4_000, EMAIL_WORST_MS);
    if (!timeoutMs) throw new Error('route time budget exhausted');
    created = (await fsCreateDoc(`${BENCH_COLLECTIONS.people}/${id}`, person as unknown as Record<string, unknown>, { timeoutMs })).created;
  } catch (err) {
    console.error('[bench:apply] firestore create failed', err instanceof Error ? err.message : 'unknown');
    return errorJson(500, 'Could not save your application. Please try again.');
  }

  // Same address already applied: one row per person, and no second round of
  // email. The applicant still sees a success, because their application is on file.
  if (!created) return NextResponse.json({ ok: true, id, duplicate: true });

  const notifications: Record<string, NotificationOutcome> = {};
  if (knockout) {
    notifications.closed = await sendApplicantEmail(person.email, applicationClosedEmail(person), 'apply-closed');
  } else {
    // Auto-invite: stage first, email second, and only if the stage write landed.
    let invite: 'sent-eligible' | 'admin-moved' | 'none' = 'none';
    if (await qualifiesForAutoInvite(person, settings, slice)) {
      try {
        invite = (await claimAutoInviteStage(id, now, slice)) ? 'sent-eligible' : 'admin-moved';
      } catch (err) {
        // Stage not stored (failure or no budget): no invite. The application is saved and stays in review.
        console.error('[bench:apply] auto-invite stage write failed, invite not sent', err instanceof Error ? err.message : 'unknown');
      }
    }
    if (invite === 'sent-eligible') {
      notifications.shadowInvite = await sendApplicantEmail(
        person.email,
        shadowInviteEmail(person, settings.shadowBookingUrl),
        'apply-auto-invite',
      );
    } else if (invite === 'none') {
      notifications.received = await sendApplicantEmail(person.email, applicationReceivedEmail(person), 'apply-received');
    }
    // 'admin-moved': an admin already acted on this person; admin state wins and nothing is sent.
  }

  if (Object.keys(notifications).length) {
    try {
      await persistNotifications(id, notifications, slice);
    } catch (err) {
      // The application itself is saved; only the email outcome did not persist.
      console.error('[bench:apply] notification persist failed', err instanceof Error ? err.message : 'unknown');
    }
  }

  if (!knockout && isAiSummaryEnabled()) {
    const blockLabels = Object.fromEntries(settings.timeBlocks.map((b) => [b.key, b.label]));
    after(() => summarizeApplication(id, blockLabels));
  }

  return NextResponse.json({ ok: true, id, ...(resume ? { resumeToken: resume.token } : {}) });
}
