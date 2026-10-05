import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { fsIncrementField } from '@/lib/server/firestoreRest';
import { readBoundedBody } from '@/lib/server/readBoundedBody';
import { carryBookedHintToLead, deadlineIn, recordCapture } from '@/lib/server/leadTransitions';
import { isValidEmail } from '@/lib/leads/validation';
import { HONEYPOT_FIELD_NAME } from '@/lib/leads/contract';

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
 * Writes go through lib/server/leadTransitions.ts, which keeps conversion and
 * the self-reported booking hint monotonic when this races the final
 * submission (app/api/leads/meetgreet).
 *
 * Sends no email. A partial capture is not a conversation the founder asked
 * to start, and the customer has not finished asking for anything yet.
 */
export const runtime = 'nodejs';
export const maxDuration = 10;

const MAX_BODY_BYTES = 4_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 8;
/** Rate-limit rows are disposable; expiresAt lets a Firestore TTL policy reap them. */
const RATE_LIMIT_RETENTION_MS = 48 * 60 * 60 * 1000;
/** Counters are namespaced per route; meetgreet uses its own, so one never spends the other's allowance. */
const RATE_LIMIT_PURPOSE = 'capture';

// Dependency budget inside the 10 s route limit (maxDuration): the rate-limit
// check and every Firestore call get a capped timeout, and the whole write
// path stops at WRITE_BUDGET_MS so the response still goes out.
const RATE_LIMIT_CALL_MS = 1_500;
const WRITE_BUDGET_MS = 7_000;
const WRITE_CALL_MS = 2_500;

/** Only the entry points that actually capture an email may write one. */
const ALLOWED_SOURCES = new Set(['welcome-modal', 'services-preview', 'home', 'home-rates', 'contact', 'book']);

function errorResponse(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Durable per-IP limit. Fails open on any limiter error or timeout: a limiter
 * outage must not block a capture (deliberate tradeoff, same as meetgreet).
 * `expiresAt` is a Date so a Firestore TTL policy on it reaps the rows.
 */
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000));
  try {
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const count = await fsIncrementField(
      `leadRateLimits/${RATE_LIMIT_PURPOSE}_${ipHash}_${windowStart}`,
      'count',
      1,
      { windowStart, expiresAt: new Date(now + RATE_LIMIT_RETENTION_MS) },
      { timeoutMs: RATE_LIMIT_CALL_MS },
    );
    return { allowed: count <= RATE_LIMIT_MAX_PER_WINDOW, retryAfterSeconds };
  } catch (err) {
    console.error('[lead:capture] rate limit check failed', err instanceof Error ? err.message : 'unknown');
    return { allowed: true, retryAfterSeconds };
  }
}

export async function POST(req: Request) {
  // readBoundedBody also rejects an over-cap declared Content-Length up front.
  const body = await readBoundedBody(req, MAX_BODY_BYTES);
  if (!body.ok) {
    return body.reason === 'too_large'
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
    parsed = body.text.length ? JSON.parse(body.text) : undefined;
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  const input = (parsed ?? {}) as { email?: unknown; source?: unknown; booked?: unknown; [key: string]: unknown };

  // Same honeypot as the meetgreet form: a filled hidden field means a bot.
  // Answer success-shaped and store nothing so it learns nothing.
  const honeypot = input[HONEYPOT_FIELD_NAME];
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return NextResponse.json({ ok: true, id: 'capture' });
  }

  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const source = typeof input.source === 'string' ? input.source : '';
  // The visitor's own browser saying Calendly reported a completion. A hint,
  // never proof (see lib/booking/onboarding-handoff.ts), so it is stored
  // under a name that says so and the table words it that way too.
  const booked = input.booked === true;

  if (!isValidEmail(email)) return errorResponse(400, 'A valid email is required.');
  if (!ALLOWED_SOURCES.has(source)) return errorResponse(400, 'Unrecognized source.');

  const budget = { deadlineAt: deadlineIn(WRITE_BUDGET_MS), perCallMs: WRITE_CALL_MS };
  let id: string;
  try {
    // First-seen time, conversion and a true booking hint are never undone; see leadTransitions.
    const outcome = await recordCapture({ email, source, booked, nowIso: new Date().toISOString() }, budget);
    id = outcome.id;

    // Already converted: the admin table shows the full lead, not this row,
    // so a booked signal arriving now must land on that lead. Best effort.
    if (booked && outcome.convertedLeadId) {
      try {
        await carryBookedHintToLead(outcome.convertedLeadId, budget);
      } catch (err) {
        console.error('[lead:capture] booked carry-over failed', err instanceof Error ? err.message : 'unknown');
      }
    }
  } catch (err) {
    // Includes upstream timeouts and exhausted conflict retries: nothing was lost
    // that the client cannot resend, and the response must still go out in budget.
    console.error('[lead:capture] firestore write failed', err instanceof Error ? err.message : 'unknown');
    return errorResponse(500, 'Could not save. Please try again.');
  }

  return NextResponse.json({ ok: true, id });
}
