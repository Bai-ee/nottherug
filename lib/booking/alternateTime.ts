/**
 * "No suitable time? Request another time" — the shared contract for the
 * request form (components/booking/AlternateTimeRequest.tsx), its API route
 * (app/api/leads/alternate-time) and the admin list. One file so the options
 * the form offers, what the server accepts and what admin renders cannot drift.
 *
 * A request is NOT a booking and never becomes one by itself: it is stored in
 * its own collection, separate from leads and from Calendly, and only an admin
 * moving it to "Scheduled" records that a time was arranged.
 *
 * Time handling is DST-safe by construction: availability is stored as
 * weekday + wall-clock window + IANA time zone (e.g. "Tue, 9 AM–12 PM,
 * Europe/London"), never as a UTC offset or instant. Converting to New York
 * time happens only when displaying, for a concrete date, with the zone rules
 * in force on that date.
 */

import { isValidEmail } from '@/lib/leads/validation';
import { HONEYPOT_FIELD_NAME } from '@/lib/leads/contract';
import { isOpaqueId, isTrackedRoute, type TrackedRoute } from '@/lib/analytics/events';

export const ALT_TIME_COLLECTION = 'alternateTimeRequests';

/** The business's own zone — what the founder schedules in. */
export const BUSINESS_TIME_ZONE = 'America/New_York';

export const ALT_TIME_DAYS = [
  { id: 'mon', label: 'Mon', long: 'Monday', index: 1 },
  { id: 'tue', label: 'Tue', long: 'Tuesday', index: 2 },
  { id: 'wed', label: 'Wed', long: 'Wednesday', index: 3 },
  { id: 'thu', label: 'Thu', long: 'Thursday', index: 4 },
  { id: 'fri', label: 'Fri', long: 'Friday', index: 5 },
  { id: 'sat', label: 'Sat', long: 'Saturday', index: 6 },
  { id: 'sun', label: 'Sun', long: 'Sunday', index: 0 },
] as const;

export type AltTimeDayId = (typeof ALT_TIME_DAYS)[number]['id'];

/** Wall-clock windows, interpreted in the requester's chosen time zone. */
export const ALT_TIME_WINDOWS = [
  { id: 'early', label: 'Early morning', range: '7–9 AM', start: [7, 0], end: [9, 0] },
  { id: 'morning', label: 'Morning', range: '9 AM–12 PM', start: [9, 0], end: [12, 0] },
  { id: 'midday', label: 'Midday', range: '12–3 PM', start: [12, 0], end: [15, 0] },
  { id: 'afternoon', label: 'Afternoon', range: '3–6 PM', start: [15, 0], end: [18, 0] },
  { id: 'evening', label: 'Evening', range: '6–8 PM', start: [18, 0], end: [20, 0] },
] as const;

export type AltTimeWindowId = (typeof ALT_TIME_WINDOWS)[number]['id'];

/** How the person wants to be reached to arrange the time. "text" means they
 *  agreed to texts at the number they gave. */
export const ALT_CONTACT_PREFERENCES = [
  { id: 'text', label: 'Text me' },
  { id: 'call', label: 'Call me' },
  { id: 'either', label: 'Call or text' },
  { id: 'email', label: 'Email me' },
] as const;
export type AltContactPreference = (typeof ALT_CONTACT_PREFERENCES)[number]['id'];

export function contactPreferenceLabel(id: unknown): string {
  return ALT_CONTACT_PREFERENCES.find((p) => p.id === id)?.label ?? 'Not given';
}

export const ALT_TIME_STATUSES = ['new', 'contacted', 'scheduled', 'closed'] as const;
export type AltTimeStatus = (typeof ALT_TIME_STATUSES)[number];

export const ALT_TIME_STATUS_LABELS: Record<AltTimeStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  scheduled: 'Scheduled',
  closed: 'Closed',
};

/** Surfaces that render the request form. The scheduler dialog passes its host's source. */
export const ALT_TIME_SOURCES = ['welcome-modal', 'home', 'home-rates', 'contact', 'book', 'signup', 'services-preview'] as const;
export type AltTimeSource = (typeof ALT_TIME_SOURCES)[number];

export const ALT_TIME_LIMITS = { name: 100, email: 254, phone: 30, note: 1000, timeZone: 64 } as const;

/** A phone number someone can actually be called back on: 7–15 digits, with
 *  the usual spaces, dashes, dots, parentheses and a leading +. */
export function isValidPhone(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > ALT_TIME_LIMITS.phone) return false;
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/** What a validated new request contains. */
export type AltTimeRequestInput = {
  name: string;
  email: string;
  phone: string;
  contactPreference: AltContactPreference;
  days: AltTimeDayId[];
  windows: AltTimeWindowId[];
  timeZone: string;
  note: string;
  source: AltTimeSource;
  sourcePage: TrackedRoute | null;
  idempotencyKey: string;
};

export type AltTimeFieldError = { field: string; message: string };

export function isAltTimeStatus(v: unknown): v is AltTimeStatus {
  return typeof v === 'string' && (ALT_TIME_STATUSES as readonly string[]).includes(v);
}

/** True for a zone this runtime's Intl data knows (any IANA name, e.g. "America/New_York"). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > ALT_TIME_LIMITS.timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function pickList<T extends string>(raw: unknown, allowed: readonly T[]): T[] | null {
  if (!Array.isArray(raw)) return null;
  const out: T[] = [];
  for (const v of raw) {
    if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) return null;
    if (!out.includes(v as T)) out.push(v as T);
  }
  // Stable order regardless of click order.
  return allowed.filter((a) => out.includes(a));
}

/**
 * Server-side validation. Field messages are written for the visitor, since
 * the form shows them inline next to the field they name.
 */
export function parseAlternateTimeRequest(
  input: unknown,
): { ok: true; data: AltTimeRequestInput } | { ok: false; errors: AltTimeFieldError[]; spam?: true } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: [{ field: 'body', message: 'Something went wrong. Please try again.' }] };
  }
  const body = input as Record<string, unknown>;

  const honeypot = body[HONEYPOT_FIELD_NAME];
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { ok: false, errors: [], spam: true };
  }

  const errors: AltTimeFieldError[] = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.push({ field: 'name', message: 'Please enter your name.' });
  else if (name.length > ALT_TIME_LIMITS.name) errors.push({ field: 'name', message: 'Please shorten your name.' });

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) errors.push({ field: 'email', message: 'Please enter your email.' });
  else if (email.length > ALT_TIME_LIMITS.email || !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  }

  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!phone) errors.push({ field: 'phone', message: 'Please enter your phone number.' });
  else if (!isValidPhone(phone)) errors.push({ field: 'phone', message: 'Please enter a valid phone number.' });

  const contactPreference = ALT_CONTACT_PREFERENCES.find((p) => p.id === body.contactPreference)?.id;
  if (!contactPreference) errors.push({ field: 'contactPreference', message: 'Choose how you’d like us to reach you.' });

  const days = pickList(body.days, ALT_TIME_DAYS.map((d) => d.id));
  if (!days || days.length === 0) errors.push({ field: 'days', message: 'Choose at least one day.' });

  const windows = pickList(body.windows, ALT_TIME_WINDOWS.map((w) => w.id));
  if (!windows || windows.length === 0) errors.push({ field: 'windows', message: 'Choose at least one time window.' });

  const timeZone = typeof body.timeZone === 'string' ? body.timeZone.trim() : '';
  if (!isValidTimeZone(timeZone)) errors.push({ field: 'timeZone', message: 'Choose your time zone.' });

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > ALT_TIME_LIMITS.note) {
    errors.push({ field: 'note', message: `Please keep the note under ${ALT_TIME_LIMITS.note} characters.` });
  }

  const source = typeof body.source === 'string' && (ALT_TIME_SOURCES as readonly string[]).includes(body.source)
    ? (body.source as AltTimeSource)
    : null;
  if (!source) errors.push({ field: 'body', message: 'Something went wrong. Please refresh and try again.' });

  const sourcePage = isTrackedRoute(body.sourcePage) ? body.sourcePage : null;

  const idempotencyKey = isOpaqueId(body.idempotencyKey) ? body.idempotencyKey : '';
  if (!idempotencyKey) errors.push({ field: 'body', message: 'Something went wrong. Please refresh and try again.' });

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      contactPreference: contactPreference!,
      days: days!,
      windows: windows!,
      timeZone,
      note,
      source: source!,
      sourcePage,
      idempotencyKey,
    },
  };
}

// ---- Time-zone display helpers (pure, DST-correct) -------------------------

/** UTC offset of `timeZone` at the instant `utcMs`, in minutes (e.g. -300 for EST). */
export function zoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asIfUtc - utcMs) / 60_000);
}

/**
 * The UTC instant of wall-clock `hour:minute` on calendar date `date`
 * (YYYY-MM-DD) in `timeZone`. Two passes, because the zone's offset can differ
 * between the naive guess and the corrected instant near a DST change.
 */
export function zonedWallClockToUtc(date: string, hour: number, minute: number, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const naive = Date.UTC(y, m - 1, d, hour, minute);
  const off1 = zoneOffsetMinutes(naive, timeZone);
  const guess = naive - off1 * 60_000;
  const off2 = zoneOffsetMinutes(guess, timeZone);
  return new Date(off2 === off1 ? guess : naive - off2 * 60_000);
}

/** Calendar date (YYYY-MM-DD) of `instant` as seen in `timeZone`. */
export function dateInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** The next calendar date on or after `now` (as seen in `timeZone`) that falls on `dayId`. */
export function nextDateForDay(dayId: AltTimeDayId, timeZone: string, now: Date): string {
  const target = ALT_TIME_DAYS.find((d) => d.id === dayId)!.index;
  const today = dateInZone(now, timeZone);
  const base = new Date(`${today}T12:00:00.000Z`);
  const delta = (target - base.getUTCDay() + 7) % 7;
  base.setUTCDate(base.getUTCDate() + delta);
  return base.toISOString().slice(0, 10);
}

function formatTimeIn(instant: Date, timeZone: string): string {
  return instant.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
}

/**
 * One requested window on its next occurrence, rendered in another zone —
 * e.g. "Tue Mar 10, 5:00 AM–8:00 AM" New York for a London morning. Uses the
 * zone rules on that specific date, so the answer is right on both sides of a
 * DST change (and in the weeks when the US and Europe change on different dates).
 */
export function describeWindowIn(
  dayId: AltTimeDayId,
  windowId: AltTimeWindowId,
  fromZone: string,
  toZone: string,
  now: Date,
): string {
  const w = ALT_TIME_WINDOWS.find((x) => x.id === windowId)!;
  const date = nextDateForDay(dayId, fromZone, now);
  const start = zonedWallClockToUtc(date, w.start[0], w.start[1], fromZone);
  const end = zonedWallClockToUtc(date, w.end[0], w.end[1], fromZone);
  const dayLabel = start.toLocaleDateString('en-US', { timeZone: toZone, weekday: 'short', month: 'short', day: 'numeric' });
  return `${dayLabel}, ${formatTimeIn(start, toZone)}–${formatTimeIn(end, toZone)}`;
}

/** A short "Mon, Wed · Morning (9 AM–12 PM), Evening (6–8 PM)" summary. */
export function summarizeAvailability(days: readonly string[], windows: readonly string[]): string {
  const dayText = ALT_TIME_DAYS.filter((d) => days.includes(d.id)).map((d) => d.label).join(', ');
  const windowText = ALT_TIME_WINDOWS.filter((w) => windows.includes(w.id)).map((w) => `${w.label} (${w.range})`).join(', ');
  return [dayText, windowText].filter(Boolean).join(' · ');
}
