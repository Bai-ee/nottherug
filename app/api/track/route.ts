import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { EVENTS_COLLECTION, MAX_BATCH_EVENTS, MAX_BODY_BYTES, validateEvent } from '@/lib/analytics/events';
import { fsCreateDoc, fsIncrementField } from '@/lib/server/firestoreRest';
import { eventExpiryAt, rateLimitExpiryAt } from '@/lib/analytics/retention';
import { errorResponse } from '@/lib/server/errors';

// Public, unauthenticated collection endpoint (plans/003-admin-dashboard-and-tracking.md
// A2 / "Tracking and storage design constraints"): browsers POST here,
// nothing else reaches Firestore's analytics_events on their behalf. Every
// event is re-validated with lib/analytics/events.ts's validateEvent() —
// nothing from the client is trusted just because it arrived shaped right.

export const runtime = 'nodejs';
// Short on purpose: this route never calls email/AI providers, only a couple
// of Firestore round trips, and a visitor's page must never wait on it.
export const maxDuration = 10;

/** Emergency stop: set true to make this route accept-and-discard everything
 *  without touching Firestore, without changing client behavior (still 202,
 *  so a beacon/fetch caller never sees an error to retry). */
const KILL_SWITCH_ENV = 'ANALYTICS_TRACKING_DISABLED';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
// Generous relative to one real visitor (a page_view plus a handful of
// cta_click/engagement events per minute, at most): this exists to blunt a
// scripted flood, not to throttle normal browsing.
const RATE_LIMIT_MAX_PER_WINDOW = 60;

const BOT_USER_AGENT_PATTERN =
  /bot|spider|crawler|headless|python-requests|curl\/|wget\/|go-http-client|scrapy|phantomjs/i;

type ErrorBody = { ok: false; error: string };

function errorJson(status: number, error: string) {
  const body: ErrorBody = { ok: false, error };
  return NextResponse.json(body, { status });
}

/** Accepted-but-discarded response: used for the kill switch, a cross-origin
 *  request, and bot-filtered traffic. Always 202 so a legitimate caller never
 *  sees an error worth retrying over something that isn't a client bug. */
function acceptedNoop() {
  return NextResponse.json({ ok: true }, { status: 202 });
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
 * Origin checks alone do not stop scripted abuse (the plan says so
 * explicitly) — this is one layer among several, not the whole defense. A
 * mismatched Origin header is rejected; a *missing* one is allowed through
 * rather than blocked, because some legitimate sendBeacon/fetch calls omit
 * it depending on browser and privacy settings, and failing closed on that
 * would silently drop real traffic with no way for a visitor to notice.
 */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false; // malformed Origin header — treat as suspicious
  }
}

/**
 * Filters only the obvious case (no User-Agent at all, or one naming itself
 * a bot/script/HTTP-library) — never claimed as a real bot detector. Matched
 * traffic is *excluded* (silently dropped, still 202 to the caller), not
 * rejected with an error, so a script gets no signal about why its events
 * never show up in reporting.
 */
function looksLikeBot(req: Request): boolean {
  const ua = req.headers.get('user-agent');
  if (!ua) return true;
  return BOT_USER_AGENT_PATTERN.test(ua);
}

/** Mirrors app/api/leads/meetgreet/route.ts's trust model: Vercel's edge
 *  overwrites x-forwarded-for rather than appending to a client-supplied
 *  one, which is what makes trusting the first entry safe here. */
function clientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const first = forwardedFor?.split(',')[0]?.trim();
  if (first) return first;
  const realIp = req.headers.get('x-real-ip');
  return realIp?.trim() || 'unknown';
}

/**
 * Durable, per-instance-safe rate limit backed by Firestore — an in-process
 * Map resets on every serverless cold start, which is exactly the failure
 * mode plans/003 calls out. Fails open on a Firestore hiccup: a rate-limiter
 * outage must not take down collection entirely. Identifiers are hashed and
 * bucketed by a short window, kept in their own collection separate from
 * analytics_events, so they never leak into reporting.
 */
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const windowStart = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const path = `analyticsRateLimits/${ipHash}_${windowStart}`;
    const count = await fsIncrementField(path, 'count', 1, {
      windowStart,
      expiresAt: rateLimitExpiryAt(windowStart),
    });
    return count <= RATE_LIMIT_MAX_PER_WINDOW;
  } catch (err) {
    console.error('[track] rate limit check failed', err instanceof Error ? err.message : 'unknown');
    return true;
  }
}

type StoreOutcome = 'stored' | 'duplicate' | 'rejected';

/**
 * Validates and stores one event. Dedup is fsCreateDoc's 409 behavior keyed
 * on the client-supplied event id (a duplicate is a successful outcome, not
 * an error — a retried beacon must not inflate counts). `receivedAt` is this
 * request's server receipt time and is the reporting authority; the client's
 * `ts` is kept only as an advisory `clientTs`, never used to order or bucket
 * events.
 */
async function storeOneEvent(raw: unknown, receivedAt: string): Promise<StoreOutcome> {
  const event = validateEvent(raw);
  if (!event) return 'rejected';

  const doc: Record<string, unknown> = {
    event: event.event,
    id: event.id,
    sid: event.sid,
    route: event.route,
    receivedAt,
    clientTs: event.ts,
    // Firestore TTL deletes the document once this passes; the manual cleanup
    // route stays for backlog written before the policy existed.
    expiresAt: eventExpiryAt(new Date(receivedAt)),
  };
  if (event.cta) doc.cta = event.cta;
  if (event.step) doc.step = event.step;
  if (event.src) doc.src = event.src;
  if (event.ref) doc.ref = event.ref;
  if (event.camp) doc.camp = event.camp;
  if (event.mode) doc.mode = event.mode;

  try {
    const result = await fsCreateDoc(`${EVENTS_COLLECTION}/${event.id}`, doc);
    return result.created ? 'stored' : 'duplicate';
  } catch (err) {
    console.error('[track] firestore create failed', err instanceof Error ? err.message : 'unknown');
    return 'rejected';
  }
}

async function handleTrackRequest(req: Request): Promise<NextResponse> {
  if (process.env[KILL_SWITCH_ENV] === 'true') return acceptedNoop();
  if (!isSameOrigin(req)) return acceptedNoop();

  const declaredLength = req.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    return errorJson(413, 'Request body too large');
  }

  const bodyResult = await readCappedBody(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return errorJson(413, 'Request body too large');

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyResult.text);
  } catch {
    return errorJson(400, 'Invalid JSON');
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_BATCH_EVENTS) {
    return errorJson(400, 'Invalid batch');
  }

  if (looksLikeBot(req)) return acceptedNoop();

  const allowed = await checkRateLimit(clientIp(req));
  if (!allowed) return errorJson(429, 'Too many requests');

  const receivedAt = new Date().toISOString();
  const results = await Promise.allSettled(parsed.map((raw) => storeOneEvent(raw, receivedAt)));

  const outcomes = results.map((r) => (r.status === 'fulfilled' ? r.value : 'rejected'));
  const stored = outcomes.filter((o) => o === 'stored').length;
  const duplicate = outcomes.filter((o) => o === 'duplicate').length;
  const rejected = outcomes.length - stored - duplicate;

  // Always 202: a public ingestion endpoint should never 500 because one
  // malformed event sat next to valid ones in the same batch, and the
  // client has nothing useful to do with a per-event breakdown anyway.
  return NextResponse.json({ ok: true, stored, duplicate, rejected }, { status: 202 });
}

export async function POST(req: Request) {
  try {
    return await handleTrackRequest(req);
  } catch (err) {
    // Never leak internals to a public endpoint's caller.
    return errorResponse(err);
  }
}
