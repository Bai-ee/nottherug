import { NextResponse, after } from 'next/server';
import { createHash } from 'node:crypto';
import { fsCreateDoc, fsGetDoc, fsIncrementField, fsMergeDoc } from '@/lib/server/firestoreRest';
import { readBoundedBody } from '@/lib/server/readBoundedBody';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { founderMeetGreetEmail, customerMeetGreetEmail } from '@/lib/email/templates';
import {
  callTimeout,
  captureIdForEmail,
  carryBookedHintToLead,
  recordConversion,
} from '@/lib/server/leadTransitions';
import { parseLeadSubmission } from '@/lib/leads/validation';
import { buildLeadRecord, type LeadNotifications, type LeadRecord, type LeadSubmissionInput, type NotificationOutcome } from '@/lib/leads/contract';

export const runtime = 'nodejs';
// Every other email-sending route here declares a budget; this one is the fast
// path a customer waits on, so it gets a tighter one. Worst case is two bounded
// sends (now concurrent) plus a few Firestore round trips.
export const maxDuration = 20;

// Well under Vercel's 4.5MB request limit — this route only ever carries short
// form fields, never a file.
const MAX_BODY_BYTES = 20_000;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** Rate-limit rows are disposable; expiresAt lets a Firestore TTL policy reap them. */
const RATE_LIMIT_RETENTION_MS = 48 * 60 * 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 5;
/** Counters are namespaced per route; capture uses its own, so email captures never spend this allowance. */
const RATE_LIMIT_PURPOSE = 'meetgreet';

// Dependency budgets inside the 20 s route limit (maxDuration). The Firestore
// calls before the notification step share PRE_EMAIL_BUDGET_MS (each call is
// also capped); the two sends run concurrently under EMAIL_TIMEOUT_MS; the
// notification-status write gets its own short cap. 8 s + 8 s + 2 s leaves
// headroom for the response. The post-response conversion write must finish by
// CONVERSION_DEADLINE_MS from request start or it is skipped (best effort).
const RATE_LIMIT_CALL_MS = 1_500;
const PRE_EMAIL_BUDGET_MS = 8_000;
const FIRESTORE_CALL_MS = 3_000;
const NOTIFICATION_PERSIST_MS = 2_000;
const CONVERSION_DEADLINE_MS = 19_000;

// The idempotency guard only needs to cover a client retrying after a
// timeout, not a genuine second inquiry weeks later — so the hash includes a
// coarse time bucket. A fixed bucket alone has a boundary problem: an
// identical retry a few seconds apart can land in different buckets (e.g.
// 12:59:58 then 13:00:02) and would otherwise be treated as a new lead. To
// close that, every submission is also checked against the immediately
// preceding bucket (see the lookback below) before creating — so a retry
// anywhere within roughly this window of the original is treated as one
// lead, while the same payload roughly two windows later creates a new one
// (see lead-intake.test.ts).
const SUBMISSION_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

const EMAIL_TIMEOUT_MS = 8_000;

type ErrorBody = { ok: false; error: string; details?: unknown };

function errorResponse(status: number, error: string, details?: unknown) {
  const body: ErrorBody = details ? { ok: false, error, details } : { ok: false, error };
  return NextResponse.json(body, { status });
}

/**
 * Adapter over the shared bounded reader: an absent body reads as empty text
 * (the validators below already reject it), and a stream that dies mid-read is
 * treated like an unreadable body rather than an oversized one.
 */
async function readCappedBody(
  req: Request,
  maxBytes: number
): Promise<{ ok: true; text: string } | { ok: false; reason: 'too_large' | 'aborted' }> {
  const result = await readBoundedBody(req, maxBytes);
  if (result.ok) return result;
  if (result.reason === 'missing') return { ok: true, text: '' };
  return { ok: false, reason: result.reason };
}

/**
 * Trusts the first `x-forwarded-for` entry. That is only safe because Vercel's
 * edge overwrites this header rather than appending to a client-supplied one.
 * If this ever runs behind a different proxy, or a verified-proxy config is
 * added, re-check this first — the rate limit is keyed entirely on it, and the
 * rate limit plus the honeypot are what stop this form being used to send
 * confirmation mail to arbitrary addresses.
 */
function clientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const first = forwardedFor?.split(',')[0]?.trim();
  if (first) return first;
  const realIp = req.headers.get('x-real-ip');
  return realIp?.trim() || 'unknown';
}

/**
 * Durable, per-instance-safe rate limit backed by Firestore (an in-memory Map
 * resets on every serverless cold start). Fails open (allows the request) on
 * a Firestore hiccup — a rate-limiter outage should not take down booking
 * availability. Deliberate tradeoff: an attacker who can force Firestore
 * errors could bypass the limit; that is judged less bad than blocking real
 * customers during a Firestore incident.
 *
 * The counter row is namespaced by purpose so the capture route's higher-volume
 * traffic cannot spend a visitor's final-submission allowance.
 *
 * Operational note: each `leadRateLimits/*` doc carries `expiresAt` (a Date,
 * now + 48h) so a Firestore TTL policy on that field can reap them; the policy
 * itself is configured in Firebase, not here.
 */
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000));
  try {
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const path = `leadRateLimits/${RATE_LIMIT_PURPOSE}_${ipHash}_${windowStart}`;
    const count = await fsIncrementField(
      path,
      'count',
      1,
      { windowStart, expiresAt: new Date(now + RATE_LIMIT_RETENTION_MS) },
      { timeoutMs: RATE_LIMIT_CALL_MS },
    );
    return { allowed: count <= RATE_LIMIT_MAX_PER_WINDOW, retryAfterSeconds };
  } catch (err) {
    console.error('[lead:meetgreet] rate limit check failed', err instanceof Error ? err.message : 'unknown');
    return { allowed: true, retryAfterSeconds };
  }
}

/** Stable per-content id so a client retry after a timeout cannot create a second lead. */
function computeSubmissionKey(data: LeadSubmissionInput, dedupeWindowStart: number): string {
  const normalized = JSON.stringify({
    ownerName: data.ownerName.toLowerCase(),
    phone: data.phone,
    email: data.email,
    neighborhood: data.neighborhood,
    dogName: data.dogName.toLowerCase(),
    breedAge: data.breedAge.toLowerCase(),
    serviceInterest: data.serviceInterest,
    vaccinations: data.vaccinations,
    walkFrequency: data.walkFrequency,
    notes: data.notes,
    reactivity: data.reactivity,
    allergies: data.allergies,
    phoneConsult: data.phoneConsult,
    source: data.source,
    dedupeWindowStart,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * A provider (Resend) error message can embed the recipient's address (e.g.
 * "Invalid `to` field: name@example.com") — that must not land verbatim in
 * server logs. Scrubs anything email-shaped and caps length.
 */
function redactProviderError(message: string): string {
  const scrubbed = message.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[redacted-email]');
  return scrubbed.length > 200 ? `${scrubbed.slice(0, 200)}…` : scrubbed;
}

async function sendLeadNotifications(lead: LeadRecord): Promise<LeadNotifications> {
  const notifications: LeadNotifications = { founder: 'skipped', customer: 'skipped' };

  let resend: ReturnType<typeof getResend>;
  let from: string;
  let founderEmail: string;
  try {
    resend = getResend();
    from = getFromAddress();
    founderEmail = getFounderEmail();
  } catch (err) {
    console.error('[lead:meetgreet] email config missing', err instanceof Error ? err.message : 'unknown');
    return notifications;
  }

  const sandbox = from.endsWith('@resend.dev');

  const sendFounder = async (): Promise<NotificationOutcome> => {
    try {
      const founderMail = founderMeetGreetEmail(lead);
      const result = await withTimeout(
        resend.emails.send({
          from,
          to: founderEmail,
          replyTo: lead.email,
          subject: founderMail.subject,
          html: founderMail.html,
          text: founderMail.text,
        }),
        EMAIL_TIMEOUT_MS,
        'founder email'
      );
      if (result.error) {
        console.error('[lead:meetgreet] founder email failed', redactProviderError(result.error.message));
        return 'failed';
      }
      return 'sent';
    } catch (err) {
      console.error('[lead:meetgreet] founder email error', err instanceof Error ? redactProviderError(err.message) : 'unknown');
      return 'failed';
    }
  };

  const sendCustomer = async (): Promise<NotificationOutcome> => {
    // A @resend.dev sender only delivers to the account's own verified address,
    // so a customer confirmation would bounce rather than arrive.
    if (sandbox) return 'skipped';
    try {
      const customerMail = customerMeetGreetEmail(lead);
      const result = await withTimeout(
        resend.emails.send({
          from,
          to: lead.email,
          subject: customerMail.subject,
          html: customerMail.html,
          text: customerMail.text,
        }),
        EMAIL_TIMEOUT_MS,
        'customer email'
      );
      if (result.error) {
        console.error('[lead:meetgreet] customer email failed', redactProviderError(result.error.message));
        return 'failed';
      }
      return 'sent';
    } catch (err) {
      console.error('[lead:meetgreet] customer email error', err instanceof Error ? redactProviderError(err.message) : 'unknown');
      return 'failed';
    }
  };

  // Concurrent, not sequential: two 8s timeouts in series put the worst case at
  // 16s of email on a route a customer is waiting on.
  const [founder, customer] = await Promise.all([sendFounder(), sendCustomer()]);
  notifications.founder = founder;
  notifications.customer = customer;

  return notifications;
}

/** Best-effort read of the capture row's self-reported booking hint for this address. */
async function readCaptureBookedHint(email: string, deadlineAt: number): Promise<boolean> {
  try {
    const capture = await fsGetDoc(`leads/${captureIdForEmail(email)}`, {
      timeoutMs: callTimeout(deadlineAt, FIRESTORE_CALL_MS),
    });
    return capture.exists && capture.data?.bookedSelfReported === true;
  } catch {
    return false;
  }
}

/** Runs after the response when possible (serverless may freeze a floating promise); awaits inline otherwise. */
async function runAfterResponse(task: () => Promise<void>): Promise<void> {
  try {
    after(task);
  } catch {
    await task();
  }
}

/**
 * Marks the email-keyed capture row converted (creating a converted marker if no
 * capture has arrived yet), then carries a booking hint the capture row held at
 * that moment onto the full lead. Together with the capture route's own
 * carry-over this covers both arrival orders. See lib/server/leadTransitions.ts.
 */
async function markCaptureConverted(
  email: string,
  leadId: string,
  source: string,
  at: string,
  leadAlreadyBooked: boolean,
  deadlineAt: number,
): Promise<void> {
  const budget = { deadlineAt, perCallMs: FIRESTORE_CALL_MS };
  try {
    const outcome = await recordConversion({ email, leadId, source, atIso: at }, budget);
    if (outcome.bookedSelfReported && !leadAlreadyBooked) await carryBookedHintToLead(leadId, budget);
  } catch (err) {
    console.error('[lead:meetgreet] capture conversion failed', err instanceof Error ? err.message : 'unknown');
  }
}

export async function POST(req: Request) {
  const requestStart = Date.now();
  const preEmailDeadline = requestStart + PRE_EMAIL_BUDGET_MS;
  const declaredLength = req.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    return errorResponse(413, 'Request body too large');
  }

  const bodyResult = await readCappedBody(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) {
    return bodyResult.reason === 'too_large'
      ? errorResponse(413, 'Request body too large')
      : errorResponse(400, 'Invalid request body');
  }

  const limit = await checkRateLimit(clientIp(req));
  if (!limit.allowed) {
    const res = errorResponse(429, 'Too many requests. Please try again later.');
    res.headers.set('Retry-After', String(limit.retryAfterSeconds));
    return res;
  }

  let parsed: unknown;
  try {
    parsed = bodyResult.text.length ? JSON.parse(bodyResult.text) : undefined;
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  const validation = parseLeadSubmission(parsed);
  if (!validation.ok) {
    return errorResponse(400, validation.errors[0]?.message ?? 'Invalid submission', validation.errors);
  }

  const dedupeWindowStart = Math.floor(Date.now() / SUBMISSION_DEDUPE_WINDOW_MS) * SUBMISSION_DEDUPE_WINDOW_MS;
  const id = computeSubmissionKey(validation.data, dedupeWindowStart);
  const submittedAt = new Date().toISOString();
  const lead = buildLeadRecord(id, submittedAt, validation.data);
  // Carry the capture's self-reported booking hint onto the lead itself, since
  // the admin table hides the converted capture row.
  const leadCarriesBookedHint = await readCaptureBookedHint(validation.data.email, preEmailDeadline);
  if (leadCarriesBookedHint) {
    (lead as unknown as Record<string, unknown>).bookedSelfReported = true;
  }

  // Bucket-boundary lookback: an identical retry that straddles the current
  // Known limitation, deliberately not fixed with a transaction: this closes the
  // boundary for a *sequential* retry, which is the real-world case (client times
  // out, person taps submit again). Two genuinely simultaneous requests landing on
  // opposite sides of the hour boundary can each complete their lookback before
  // the other's create commits, and both would be saved. That needs
  // millisecond-scale double submission at the exact top of an hour; the cost of a
  // read-write transaction on every booking is not worth closing it.

  // bucket's start hashes to a different id than the original, so a plain
  // fsCreateDoc race on `id` alone would miss it. Check the previous bucket's
  // id first — if that document exists, this is the same submission.
  const previousWindowId = computeSubmissionKey(validation.data, dedupeWindowStart - SUBMISSION_DEDUPE_WINDOW_MS);
  try {
    const previous = await fsGetDoc(`leads/${previousWindowId}`, {
      timeoutMs: callTimeout(preEmailDeadline, FIRESTORE_CALL_MS),
    });
    if (previous.exists && previous.data) {
      const existingNotifications = (previous.data.notifications as LeadNotifications | undefined)
        ?? { founder: 'skipped', customer: 'skipped' };
      return NextResponse.json({ ok: true, id: previousWindowId, duplicate: true, notifications: existingNotifications });
    }
  } catch (err) {
    console.error('[lead:meetgreet] previous-window duplicate lookup failed', err instanceof Error ? err.message : 'unknown');
    // Fall through — a lookback failure should not block a legitimate submission.
  }

  let created: boolean;
  try {
    const result = await fsCreateDoc(`leads/${id}`, lead as unknown as Record<string, unknown>, {
      timeoutMs: callTimeout(preEmailDeadline, FIRESTORE_CALL_MS),
    });
    created = result.created;
  } catch (err) {
    console.error('[lead:meetgreet] firestore create failed', err instanceof Error ? err.message : 'unknown');
    return errorResponse(500, 'Could not save lead. Please try again.');
  }

  // Best effort: the partial capture for this address is no longer
  // outstanding, so it stops showing as a lead waiting on answers. A failure
  // here must never fail the submission the customer is waiting on.
  await runAfterResponse(() =>
    markCaptureConverted(
      validation.data.email,
      id,
      validation.data.source,
      submittedAt,
      leadCarriesBookedHint,
      requestStart + CONVERSION_DEADLINE_MS,
    ),
  );

  if (!created) {
    // Same content hashed to an id that already exists — a retry of a request
    // whose response the client never saw. Return the same success shape
    // without sending another round of notifications.
    let existingNotifications: LeadNotifications = { founder: 'skipped', customer: 'skipped' };
    try {
      const existing = await fsGetDoc(`leads/${id}`, {
        timeoutMs: callTimeout(preEmailDeadline, FIRESTORE_CALL_MS, 500),
      });
      if (existing.exists && existing.data && existing.data.notifications) {
        existingNotifications = existing.data.notifications as LeadNotifications;
      }
    } catch (err) {
      console.error('[lead:meetgreet] duplicate lookup failed', err instanceof Error ? err.message : 'unknown');
    }
    return NextResponse.json({ ok: true, id, duplicate: true, notifications: existingNotifications });
  }

  const notifications = await sendLeadNotifications(lead);
  lead.notifications = notifications;

  try {
    // Merge only notifications: a booked flag merged onto this lead meanwhile must survive.
    await fsMergeDoc(`leads/${id}`, { notifications }, { timeoutMs: NOTIFICATION_PERSIST_MS });
  } catch (err) {
    // The lead itself is already saved; only the notification-status write failed.
    console.error('[lead:meetgreet] notification status persist failed', err instanceof Error ? err.message : 'unknown');
  }

  return NextResponse.json({ ok: true, id, notifications });
}
