import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { fsCreateDoc, fsGetDoc, fsIncrementField, fsSetDoc } from '@/lib/server/firestoreRest';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { founderMeetGreetEmail, customerMeetGreetEmail } from '@/lib/email/templates';
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
const RATE_LIMIT_MAX_PER_WINDOW = 5;

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

async function readCappedBody(req: Request, maxBytes: number): Promise<{ ok: true; text: string } | { ok: false }> {
  if (!req.body) {
    const text = await req.text();
    return Buffer.byteLength(text, 'utf8') > maxBytes ? { ok: false } : { ok: true, text };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false };
      }
      chunks.push(value);
    }
  }
  return { ok: true, text: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8') };
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
 * Operational note: `leadRateLimits/*` documents accumulate — one per IP per
 * RATE_LIMIT_WINDOW_MS window — and are never deleted. Each carries a
 * `windowStart` field, but it is a plain epoch-ms integer, not a Firestore
 * Timestamp, so a native TTL policy cannot target it as-is without a change
 * to firestoreRest.ts's value serialization (not owned by this task). No
 * cleanup job is included; this is a flagged follow-up, not a bug.
 */
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const windowStart = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const path = `leadRateLimits/${ipHash}_${windowStart}`;
    const count = await fsIncrementField(path, 'count', 1, { windowStart });
    return count <= RATE_LIMIT_MAX_PER_WINDOW;
  } catch (err) {
    console.error('[lead:meetgreet] rate limit check failed', err instanceof Error ? err.message : 'unknown');
    return true;
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

export async function POST(req: Request) {
  const declaredLength = req.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    return errorResponse(413, 'Request body too large');
  }

  const bodyResult = await readCappedBody(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return errorResponse(413, 'Request body too large');

  const allowed = await checkRateLimit(clientIp(req));
  if (!allowed) return errorResponse(429, 'Too many requests. Please try again later.');

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
    const previous = await fsGetDoc(`leads/${previousWindowId}`);
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
    const result = await fsCreateDoc(`leads/${id}`, lead as unknown as Record<string, unknown>);
    created = result.created;
  } catch (err) {
    console.error('[lead:meetgreet] firestore create failed', err instanceof Error ? err.message : 'unknown');
    return errorResponse(500, 'Could not save lead. Please try again.');
  }

  if (!created) {
    // Same content hashed to an id that already exists — a retry of a request
    // whose response the client never saw. Return the same success shape
    // without sending another round of notifications.
    let existingNotifications: LeadNotifications = { founder: 'skipped', customer: 'skipped' };
    try {
      const existing = await fsGetDoc(`leads/${id}`);
      if (existing.exists && existing.data && existing.data.notifications) {
        existingNotifications = existing.data.notifications as LeadNotifications;
      }
    } catch (err) {
      console.error('[lead:meetgreet] duplicate lookup failed', err instanceof Error ? err.message : 'unknown');
    }
    return NextResponse.json({ ok: true, id, duplicate: true, notifications: existingNotifications });
  }

  console.log('[lead:meetgreet] saved', id);

  const notifications = await sendLeadNotifications(lead);
  lead.notifications = notifications;

  try {
    await fsSetDoc(`leads/${id}`, lead as unknown as Record<string, unknown>);
  } catch (err) {
    // The lead itself is already saved; only the notification-status write failed.
    console.error('[lead:meetgreet] notification status persist failed', err instanceof Error ? err.message : 'unknown');
  }

  return NextResponse.json({ ok: true, id, notifications });
}
