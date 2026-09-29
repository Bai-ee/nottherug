import { after, NextResponse } from 'next/server';
import { fsCreateDoc, fsSetDoc } from '@/lib/server/firestoreRest';
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
import { getBenchSettingsOrDefault, listBenchPeople } from '@/lib/server/bench';
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

function errorJson(status: number, error: string, details?: unknown) {
  return NextResponse.json(details ? { ok: false, error, details } : { ok: false, error }, { status });
}

/**
 * The objective auto-invite rule (plan §7.3): only when Luis has switched it
 * on, a booking link exists, and the applicant fills an under-target slot.
 * A read failure falls back to a normal review, never to an invite.
 */
async function qualifiesForAutoInvite(person: BenchPerson, settings: BenchSettings): Promise<boolean> {
  if (!settings.autoInviteOnGap || !settings.shadowBookingUrl) return false;
  try {
    const coverage = computeCoverage(await listBenchPeople(), settings);
    return gapSlotsFilled(person, coverage) > 0;
  } catch (err) {
    console.error('[bench:apply] coverage read failed', err instanceof Error ? err.message : 'unknown');
    return false;
  }
}

export async function POST(req: Request) {
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

  const settings = await getBenchSettingsOrDefault();
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
    created = (await fsCreateDoc(`${BENCH_COLLECTIONS.people}/${id}`, person as unknown as Record<string, unknown>)).created;
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
  } else if (await qualifiesForAutoInvite(person, settings)) {
    person.stage = 'shadow_invited';
    person.stageHistory = [...person.stageHistory, { stage: 'shadow_invited', at: now, by: 'auto-invite' }];
    notifications.shadowInvite = await sendApplicantEmail(
      person.email,
      shadowInviteEmail(person, settings.shadowBookingUrl),
      'apply-auto-invite',
    );
  } else {
    notifications.received = await sendApplicantEmail(person.email, applicationReceivedEmail(person), 'apply-received');
  }

  try {
    await fsSetDoc(`${BENCH_COLLECTIONS.people}/${id}`, {
      ...person,
      notifications,
      updatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
  } catch (err) {
    // The application itself is saved; only the email outcome did not persist.
    console.error('[bench:apply] notification persist failed', err instanceof Error ? err.message : 'unknown');
  }

  if (!knockout && isAiSummaryEnabled()) {
    const blockLabels = Object.fromEntries(settings.timeBlocks.map((b) => [b.key, b.label]));
    after(() => summarizeApplication(id, blockLabels));
  }

  return NextResponse.json({ ok: true, id, ...(resume ? { resumeToken: resume.token } : {}) });
}
