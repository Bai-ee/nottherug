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

// Deliberately narrow: every field here is safe to leave the app. Nothing
// resembling a name, email, phone number, or free-text note belongs in this
// type — if a call site needs one of those to describe an event, that is a
// sign the event should carry a category/id instead, not the raw value.
export interface AnalyticsPayload {
  page?: string;
  source?: string;
  cta?: string;
  step?: string;
}

// Defense in depth: even if a future payload accidentally includes one of
// these keys, it is stripped before anything is sent, rather than trusting
// every call site to have gotten AnalyticsPayload right.
const BLOCKED_KEYS = new Set([
  'name', 'ownername', 'owner_name', 'dogname', 'dog_name',
  'email', 'phone', 'notes', 'message', 'breedage', 'breed_age',
]);

function sanitize(payload: AnalyticsPayload): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (BLOCKED_KEYS.has(key.toLowerCase())) continue;
    clean[key] = String(value);
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
 */
export function track(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  send(name, sanitize(payload));
}
