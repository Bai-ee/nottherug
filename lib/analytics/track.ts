'use client';

// Thin, provider-agnostic event tracker (plans/002-production-readiness.md
// P4: "Record anonymous CTA click, form start, lead saved, and
// scheduling-open events... Never send names, notes, phone numbers, or email
// addresses in analytics"). No vendor SDK is installed and none is added
// here — without NEXT_PUBLIC_ANALYTICS_ENDPOINT configured, track() is a
// no-op. When an endpoint is configured, this posts a small anonymous JSON
// beacon to it; swap the body of `send()` for a real provider's snippet
// later without touching any call site.

export type AnalyticsEventName =
  | 'cta_click'
  | 'booking_form_start'
  | 'lead_saved'
  | 'scheduling_dialog_opened'
  | 'appointment_completed';

// Deliberately narrow: every field here is meant to carry an id/category/path,
// never a value typed directly from a user. That intent doesn't make it safe
// on its own — sanitize() below checks the actual *content* of every value,
// not just which of these keys it arrived under, because a caller can put
// anything in a `string` field (see its own comment for why).
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

function send(name: AnalyticsEventName, payload: Record<string, string>) {
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint || typeof window === 'undefined') return;

  const body = JSON.stringify({ event: name, ...payload, ts: Date.now() });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
    } else {
      void fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    // Analytics must never break the page it's measuring.
    console.warn('[analytics] failed to send event', name, err);
  }
}

/**
 * Records one anonymous product event. No-ops entirely unless
 * NEXT_PUBLIC_ANALYTICS_ENDPOINT is set, so this is always safe to call —
 * including in this repo today, where no analytics provider is configured.
 * Every value is checked for PII-shaped content (not just its key name)
 * before anything is sent — see sanitize()/sanitizeValue() above.
 */
export function track(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  send(name, sanitize(payload as Record<string, unknown>));
}
