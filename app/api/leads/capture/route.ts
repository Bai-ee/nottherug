import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { fsIncrementField, fsSetDoc, fsGetDoc } from '@/lib/server/firestoreRest';
import { isValidEmail } from '@/lib/leads/validation';
import { LEAD_SCHEMA_VERSION } from '@/lib/leads/contract';

/**
 * The first half of the booking-first journey: someone gives an email and
 * goes to book on Calendly. Previously nothing was written until they came
 * back and answered the questionnaire, so anyone who booked and never
 * returned existed only inside Calendly — the founder had no lead and no
 * address.
 *
 * This writes a deliberately partial lead so that person is not lost. It is
 * marked `status: 'partial'` and carries no answers, because none were given;
 * the leads table says so in words rather than presenting it as an inquiry.
 *
 * Keyed by email, not by content hash: the same person re-entering their
 * address updates one row instead of stacking duplicates. When they later
 * complete the questionnaire, the full submission marks this row converted
 * so it stops appearing as outstanding.
 *
 * Sends no email. A partial capture is not a conversation the founder asked
 * to start, and the customer has not finished asking for anything yet.
 */
export const runtime = 'nodejs';
export const maxDuration = 10;

const MAX_BODY_BYTES = 4_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 8;

/** Only the entry points that actually capture an email may write one. */
const ALLOWED_SOURCES = new Set(['welcome-modal', 'services-preview', 'home', 'home-rates', 'contact', 'book']);

function errorResponse(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function readCappedBody(req: Request, limit: number): Promise<{ ok: true; text: string } | { ok: false }> {
  const text = await req.text();
  if (text.length > limit) return { ok: false };
  return { ok: true, text };
}

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const windowStart = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const count = await fsIncrementField(`leadRateLimits/${ipHash}_${windowStart}`, 'count', 1, { windowStart });
    return count <= RATE_LIMIT_MAX_PER_WINDOW;
  } catch (err) {
    console.error('[lead:capture] rate limit check failed', err instanceof Error ? err.message : 'unknown');
    return true; // fail open: a limiter outage must not block a capture
  }
}

/** One row per address, so re-entering an email updates rather than stacks. */
export function captureIdForEmail(email: string): string {
  return `capture_${createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)}`;
}

export async function POST(req: Request) {
  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > MAX_BODY_BYTES) return errorResponse(413, 'Request body too large');

  const body = await readCappedBody(req, MAX_BODY_BYTES);
  if (!body.ok) return errorResponse(413, 'Request body too large');

  if (!(await checkRateLimit(clientIp(req)))) {
    return errorResponse(429, 'Too many requests. Please try again later.');
  }

  let parsed: unknown;
  try {
    parsed = body.text.length ? JSON.parse(body.text) : undefined;
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  const input = (parsed ?? {}) as { email?: unknown; source?: unknown; booked?: unknown };
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const source = typeof input.source === 'string' ? input.source : '';
  // The visitor's own browser saying Calendly reported a completion. A hint,
  // never proof (see lib/booking/onboarding-handoff.ts), so it is stored
  // under a name that says so and the table words it that way too.
  const booked = input.booked === true;

  if (!isValidEmail(email)) return errorResponse(400, 'A valid email is required.');
  if (!ALLOWED_SOURCES.has(source)) return errorResponse(400, 'Unrecognized source.');

  const id = captureIdForEmail(email);
  const now = new Date().toISOString();

  try {
    // Keep the first sighting; a second capture only refreshes when it happened.
    const existing = await fsGetDoc(`leads/${id}`);
    const firstSeenAt = (existing.exists && (existing.data?.submittedAt as string)) || now;
    const status = (existing.exists && existing.data?.status === 'converted') ? 'converted' : 'partial';
    const alreadyBooked = existing.exists && existing.data?.bookedSelfReported === true;

    await fsSetDoc(`leads/${id}`, {
      id,
      type: 'capture',
      schemaVersion: LEAD_SCHEMA_VERSION,
      status,
      email,
      source,
      submittedAt: firstSeenAt,
      lastSeenAt: now,
      bookedSelfReported: booked || alreadyBooked,
    });
  } catch (err) {
    console.error('[lead:capture] firestore write failed', err instanceof Error ? err.message : 'unknown');
    return errorResponse(500, 'Could not save. Please try again.');
  }

  return NextResponse.json({ ok: true, id });
}
