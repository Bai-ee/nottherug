import { NextResponse, after } from 'next/server';
import { createHash } from 'node:crypto';
import { fsCreateDoc, fsGetDoc, fsIncrementField, fsMergeDoc } from '@/lib/server/firestoreRest';
import {
  ALT_TIME_COLLECTION,
  contactPreferenceLabel,
  BUSINESS_TIME_ZONE,
  describeWindowIn,
  parseAlternateTimeRequest,
  summarizeAvailability,
  type AltTimeRequestInput,
} from '@/lib/booking/alternateTime';
import { isCampaignSlug } from '@/lib/analytics/events';
import { readLinkage } from '@/lib/leads/linkage';
import { TEST_DEVICES_COLLECTION } from '@/lib/testing/classification';
import { getFounderEmail, getFromAddress, getResend } from '@/lib/email/resend';
import { isSandboxSender } from '@/lib/email/sandbox';
import { customerAlternateTimeEmail, founderAlternateTimeEmail } from '@/lib/email/templates';
import { consentFields, readOptIn } from '@/lib/leads/consent';

/**
 * "No suitable time? Request another time." Saves a request for the founder
 * to follow up on — never a booking, never written to `leads`, never sent to
 * Calendly. Linked to the email-keyed capture row when one exists, so admin
 * can see the same person in both places.
 *
 * Idempotent on the client's per-attempt key: a double click, a retry after a
 * timeout, or a replayed request all land on the same document (fsCreateDoc's
 * 409) and answer with the same success. A person who deliberately sends a
 * second request later gets a new key, and a second row.
 *
 * The visitor sees success ONLY when this route has saved the document.
 */
export const runtime = 'nodejs';
export const maxDuration = 15;

const MAX_BODY_BYTES = 8_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 6;
const RATE_LIMIT_RETENTION_MS = 48 * 60 * 60 * 1000;
const EMAIL_TIMEOUT_MS = 8_000;

type ErrorKind = 'validation' | 'rate_limited' | 'server';

function errorJson(status: number, kind: ErrorKind, error: string, fieldErrors?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ ok: false, kind, error, ...(fieldErrors ? { fieldErrors } : {}) }, { status });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const windowStart = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const count = await fsIncrementField(`leadRateLimits/alt_${ipHash}_${windowStart}`, 'count', 1, {
      windowStart,
      expiresAt: new Date(Date.now() + RATE_LIMIT_RETENTION_MS),
    });
    return count <= RATE_LIMIT_MAX_PER_WINDOW;
  } catch (err) {
    console.error('[lead:alt-time] rate limit check failed', err instanceof Error ? err.message : 'unknown');
    return true; // fail open, same trade-off as the other lead routes
  }
}

function captureIdForEmail(email: string): string {
  return `capture_${createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)}`;
}

function requestIdForKey(key: string): string {
  return `altreq_${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
}

/** Session attribution as the tracker stored it — the same allowlisted shape, never free text. */
function readAttribution(input: unknown): Record<string, string> | null {
  if (!input || typeof input !== 'object') return null;
  const a = input as Record<string, unknown>;
  if (a.src === 'campaign' && isCampaignSlug(a.camp)) return { src: 'campaign', camp: a.camp };
  if (a.src === 'referral' && typeof a.ref === 'string' && /^[a-z0-9.-]{1,128}$/.test(a.ref)) return { src: 'referral', ref: a.ref };
  if (a.src === 'direct') return { src: 'direct' };
  return null;
}

function nyPreview(data: AltTimeRequestInput, now: Date): string[] {
  if (data.timeZone === BUSINESS_TIME_ZONE) return [];
  const out: string[] = [];
  for (const day of data.days) {
    for (const w of data.windows) out.push(describeWindowIn(day, w, data.timeZone, BUSINESS_TIME_ZONE, now));
  }
  return out.slice(0, 14);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Existing internal notification path (Resend → FOUNDER_EMAIL). Skipped, not
 *  failed, when it is not configured — the request is in admin either way. */
async function notifyFounder(doc: Record<string, unknown>, data: AltTimeRequestInput, now: Date): Promise<'sent' | 'failed' | 'skipped'> {
  let from: string;
  let to: string;
  let resend: ReturnType<typeof getResend>;
  try {
    resend = getResend();
    from = getFromAddress();
    to = getFounderEmail();
  } catch {
    return 'skipped';
  }
  try {
    const mail = founderAlternateTimeEmail({
      id: String(doc.id),
      createdAt: String(doc.createdAt),
      name: data.name,
      email: data.email,
      phone: data.phone,
      contactPreference: contactPreferenceLabel(data.contactPreference),
      availability: summarizeAvailability(data.days, data.windows),
      timeZone: data.timeZone,
      nyPreview: nyPreview(data, now),
      note: data.note,
      source: data.source,
    });
    const result = await withTimeout(
      resend.emails.send({ from, to, replyTo: data.email, subject: mail.subject, html: mail.html, text: mail.text }),
      EMAIL_TIMEOUT_MS,
    );
    if (result.error) {
      console.error('[lead:alt-time] founder email failed');
      return 'failed';
    }
    return 'sent';
  } catch {
    console.error('[lead:alt-time] founder email error');
    return 'failed';
  }
}

/** The requester's confirmation. Skipped (not failed) when the sender is the
 *  @resend.dev sandbox, which can only deliver to the Resend account itself. */
async function confirmToCustomer(data: AltTimeRequestInput, newsletterOptIn: boolean): Promise<'sent' | 'failed' | 'skipped'> {
  let from: string;
  let resend: ReturnType<typeof getResend>;
  try {
    resend = getResend();
    from = getFromAddress();
  } catch {
    return 'skipped';
  }
  if (isSandboxSender(from)) return 'skipped';
  try {
    const mail = customerAlternateTimeEmail({
      name: data.name,
      availability: summarizeAvailability(data.days, data.windows),
      timeZone: data.timeZone,
      contactPreference: contactPreferenceLabel(data.contactPreference),
      phone: data.phone,
      newsletterOptIn,
    });
    const result = await withTimeout(
      resend.emails.send({ from, to: data.email, subject: mail.subject, html: mail.html, text: mail.text }),
      EMAIL_TIMEOUT_MS,
    );
    if (result.error) {
      console.error('[lead:alt-time] customer email failed');
      return 'failed';
    }
    return 'sent';
  } catch {
    console.error('[lead:alt-time] customer email error');
    return 'failed';
  }
}

async function runAfterResponse(task: () => Promise<void>): Promise<void> {
  try {
    after(task);
  } catch {
    await task();
  }
}

export async function POST(req: Request) {
  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > MAX_BODY_BYTES) return errorJson(413, 'validation', 'Request body too large');
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return errorJson(413, 'validation', 'Request body too large');

  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : undefined;
  } catch {
    return errorJson(400, 'validation', 'Something went wrong. Please try again.');
  }

  const validation = parseAlternateTimeRequest(parsed);
  if (!validation.ok) {
    // Honeypot: success-shaped, nothing stored, so a bot learns nothing.
    if (validation.spam) return NextResponse.json({ ok: true, id: 'altreq' });
    return errorJson(400, 'validation', validation.errors[0]?.message ?? 'Please check the form.', validation.errors);
  }
  const data = validation.data;

  if (!(await checkRateLimit(clientIp(req)))) {
    return errorJson(429, 'rate_limited', 'Too many requests. Please wait a few minutes and try again.');
  }

  const body = parsed as Record<string, unknown>;
  const linkage = readLinkage(body.linkage);
  const newsletterOptIn = readOptIn(body.newsletterOptIn);
  const attribution = readAttribution(body.attribution);
  const id = requestIdForKey(data.idempotencyKey);
  const now = new Date();
  const createdAt = now.toISOString();

  // Best-effort lookups; neither may block saving the request.
  let testFlag = false;
  if (linkage.testDeviceId) {
    try {
      testFlag = (await fsGetDoc(`${TEST_DEVICES_COLLECTION}/${linkage.testDeviceId}`)).exists;
    } catch {
      testFlag = false; // classification is re-done at read time anyway
    }
  }
  let linkedCaptureId: string | null = null;
  try {
    const captureId = captureIdForEmail(data.email);
    const capture = await fsGetDoc(`leads/${captureId}`);
    if (capture.exists) linkedCaptureId = captureId;
  } catch {
    linkedCaptureId = null;
  }

  const doc: Record<string, unknown> = {
    id,
    createdAt,
    status: 'new',
    statusUpdatedAt: createdAt,
    name: data.name,
    email: data.email,
    phone: data.phone,
    contactPreference: data.contactPreference,
    days: data.days,
    windows: data.windows,
    timeZone: data.timeZone,
    note: data.note,
    source: data.source,
    sourcePage: data.sourcePage,
    testFlag,
    ...(attribution ? { attribution } : {}),
    ...linkage,
    ...(newsletterOptIn ? consentFields('newsletter', data.source, createdAt) : {}),
    ...(linkedCaptureId ? { linkedCaptureId, linkedConvertedLeadId: null } : {}),
  };

  let created: boolean;
  try {
    created = (await fsCreateDoc(`${ALT_TIME_COLLECTION}/${id}`, doc)).created;
  } catch (err) {
    console.error('[lead:alt-time] firestore create failed', err instanceof Error ? err.message : 'unknown');
    return errorJson(500, 'server', 'We couldn’t save your request. Please try again.');
  }

  if (!created) {
    // Same attempt key: this request is already saved. Same success answer,
    // no second notification.
    return NextResponse.json({ ok: true, id, duplicate: true });
  }

  await runAfterResponse(async () => {
    // Only the first save of an attempt gets here, so each email goes once.
    const [notification, customerNotification] = testFlag
      ? (['skipped', 'skipped'] as const)
      : await Promise.all([notifyFounder(doc, data, now), confirmToCustomer(data, newsletterOptIn)]);
    try {
      await fsMergeDoc(`${ALT_TIME_COLLECTION}/${id}`, { notification, customerNotification });
    } catch {
      console.error('[lead:alt-time] notification status persist failed');
    }
  });

  return NextResponse.json({ ok: true, id });
}
