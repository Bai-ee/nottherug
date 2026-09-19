'use client';

// First-party analytics tracker: posts validated events to the same-origin
// POST /api/track endpoint (app/api/track/route.ts), which re-validates and
// stores them in Firestore. See plans/003-admin-dashboard-and-tracking.md
// (the locked A0 decision table) and lib/analytics/events.ts for the shared
// contract every field here must match — that file is the source of truth
// for event names, allowlists and limits, not this one.
//
// Tracking defaults OFF (decision 10): nothing is read from sessionStorage
// and nothing is sent until NEXT_PUBLIC_ANALYTICS_ENABLED=true. A separate
// NEXT_PUBLIC_ANALYTICS_TEST_MODE flag stamps mode:'test' on every event, so
// preview/acceptance traffic can be proven end to end without mixing into
// real business numbers.

import {
  isBookingStep,
  isCtaId,
  toTrackedRoute,
  type AnalyticsEvent as WireEvent,
  type EventName,
} from './events';
import { getSessionSnapshot, newOpaqueId, noteEngagementSignal } from './session';

export type AnalyticsEventName = EventName;

// Deliberately narrow: every field here is meant to carry an id/category/path,
// never a value typed directly from a user. That intent doesn't make it safe
// on its own — sanitize() below checks the actual *content* of every value,
// not just which of these keys it arrived under, because a caller can put
// anything in a `string` field (see its own comment for why). `page`/`source`
// stay here for backward compatibility with existing call sites, but they are
// not part of the stored event (see lib/analytics/events.ts) — `route` is
// derived independently from the current URL instead of trusting a caller's
// free-form label.
export interface AnalyticsPayload {
  page?: string;
  source?: string;
  cta?: string;
  step?: string;
}

// First line of defense: drop a field outright if its key name even suggests
// PII, so a differently-named alias (`emailAddress`, `customer_email`,
// `dogName`, ...) is caught the same as an exact match. This runs on
// `Record<string, unknown>`, not `AnalyticsPayload`, because the whole point
// is to catch a payload that doesn't actually match the type it claims to —
// e.g. a call site that spreads in a wider object, or one that came from a
// caller written before this file's type was tightened.
const BLOCKED_KEY_SUBSTRINGS = ['name', 'email', 'phone', 'note', 'message'];

function isBlockedKey(key: string): boolean {
  const lower = key.toLowerCase();
  return BLOCKED_KEY_SUBSTRINGS.some((s) => lower.includes(s));
}

// Second line of defense, and the one that actually matters: a value can be
// PII-shaped regardless of which (allowed) key it's sitting under — nothing
// stops a caller from writing `track('cta_click', { cta: user.email })`. Both
// patterns match *anywhere in* the string, not just when the whole value is
// one, since a free-text-ish value could have an email or number embedded in
// otherwise-fine text.
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// A run of 7+ digits, commas/dots/spaces/dashes/parens allowed between them —
// enough to catch a phone number in any common written form (347-610-9676,
// (347) 610 9676, +13476109676, ...) without flagging a short numeric value
// like a price or a step count ("1 of 5").
const PHONE_PATTERN = /(?:\d[\s.\-()]*){7,}/;

function looksSensitive(value: string): boolean {
  return EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value);
}

// Returns the sanitized string form of one value, or null if it should be
// dropped entirely (rather than sent as a redacted placeholder — a payload
// key simply missing says less than a key present with a fake-looking value).
function sanitizeValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    const parts = value.map(sanitizeValue).filter((v): v is string => v !== null);
    return parts.length ? parts.join(',') : null;
  }

  if (typeof value === 'object') {
    // Deliberate, not the accident it used to be: a nested object's shape is
    // unknown to this function, so there is no way to vet its contents key
    // by key the way the top level is vetted below. Drop it rather than
    // serialize it (the old code did `String(value)`, which happened to
    // produce the harmless-looking "[object Object]" — that was luck, not a
    // check, and would not have caught e.g. an array of objects the same way).
    return null;
  }

  const str = String(value);
  return looksSensitive(str) ? null : str;
}

// Exported only for tests/unit/analytics-track.test.ts — not part of the
// public API other files should call; use track() instead.
export function sanitize(payload: Record<string, unknown>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isBlockedKey(key)) continue;
    const sanitized = sanitizeValue(value);
    if (sanitized !== null) clean[key] = sanitized;
  }
  return clean;
}

const TRACK_ENDPOINT = '/api/track';

/** Default OFF (decision 10) — flip on only for the intended production/
 *  preview host, never globally. */
export function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
}

/** Stamps every event with mode:'test' so preview/acceptance traffic never
 *  mixes into real business numbers (decision 10). */
function isTestMode(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE === 'true';
}

// Best-effort delivery, never awaited by a caller and never allowed to
// propagate: a click handler or a booking save must not stall or fail
// because analytics couldn't reach the network.
function deliver(body: string) {
  try {
    if (navigator.sendBeacon) {
      // sendBeacon can return false (queue full, payload rejected) without
      // throwing — that isn't an exception, so without this check a beacon
      // failure would silently drop the event instead of falling back.
      const queued = navigator.sendBeacon(TRACK_ENDPOINT, new Blob([body], { type: 'application/json' }));
      if (queued) return;
    }
    // Fetch rejection (offline, blocked by an extension, etc.) must be
    // caught here — an unhandled rejection here would surface in every
    // visitor's console for something that is never their problem.
    void fetch(TRACK_ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch((err) => {
      console.warn('[analytics] delivery failed', err);
    });
  } catch (err) {
    // Analytics must never break the page it's measuring.
    console.warn('[analytics] failed to send event', err);
  }
}

function sendEvent(event: EventName, fields: Partial<Pick<WireEvent, 'cta' | 'step'>>) {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;
  // Admin is never tracked. Structurally true today (PageViewTracker and
  // TrackedCtaLink only render on public marketing routes), and enforced
  // here too so that stays true even if a future call site slips.
  if (window.location.pathname.startsWith('/admin')) return;

  const snapshot = getSessionSnapshot();
  if (!snapshot) return; // sessionStorage unusable (private mode, etc.) — degrade to disabled, not a crash

  const wireEvent: WireEvent = {
    event,
    id: newOpaqueId(),
    sid: snapshot.id,
    ts: Date.now(),
    route: toTrackedRoute(window.location.pathname),
    ...fields,
    ...(snapshot.attribution ?? {}),
  };
  if (isTestMode()) wireEvent.mode = 'test';

  try {
    // Sent as a one-element batch: app/api/track/route.ts accepts an array
    // (bounded by MAX_BATCH_EVENTS) so the wire format doesn't need to change
    // if a future caller ever batches multiple events into one delivery.
    deliver(JSON.stringify([wireEvent]));
  } catch (err) {
    console.warn('[analytics] failed to send event', event, err);
  }
}

/**
 * Records one anonymous product event. No-ops entirely unless tracking is
 * enabled (see isAnalyticsEnabled) — always safe to call, including in this
 * repo today with tracking off by default. Every value is checked for
 * PII-shaped content (not just its key name) before anything is built — see
 * sanitize()/sanitizeValue() above — and the event itself is re-validated
 * server-side against lib/analytics/events.ts before it is ever stored.
 */
export function track(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (!isAnalyticsEnabled()) return;

  const clean = sanitize(payload as Record<string, unknown>);

  if (name === 'cta_click') {
    if (!isCtaId(clean.cta)) return; // not a stable, allowlisted CTA id — nothing valid to record
    sendEvent(name, { cta: clean.cta });
    // "Any tracked click" (decision 2) counts toward engagement; cta_click is
    // the only click-shaped event any call site sends today.
    if (noteEngagementSignal()) sendEvent('engagement', {});
    return;
  }

  if (name === 'booking_step') {
    if (!isBookingStep(clean.step)) return;
    sendEvent(name, { step: clean.step });
    return;
  }

  sendEvent(name, {});
}
