// Booking-availability reporting (plan 017). Pure builders over events the
// report has already fetched and classified — no Firestore access here, so
// every number is unit-testable from fixtures.
//
// Vocabulary, kept distinct on purpose (never presented as interchangeable):
//   submissions          questionnaire leads saved (the `leads` collection)
//   distinct contacts    distinct email addresses across leads, captures and
//                        alternate-time requests
//   booking events       appointment_completed events: Calendly's verified
//                        browser message reached the page
//   distinct bookings    distinct Calendly invitee ids among those events,
//                        where Calendly sent one (replays collapse)
//   confirmed appointments  NOT observable: that needs Calendly's API or
//                        webhooks, which this integration does not use. Always
//                        null, never estimated.
//
// What the Calendly embed can and cannot tell us: the iframe is cross-origin,
// so the page sees only the postMessage events Calendly chooses to send. The
// one the site acts on is `calendly.event_scheduled`, carrying the scheduled
// event and invitee resource URIs. Nothing reports which slot was picked,
// which slots existed, or that none did — so no metric here claims "no slots
// available" or describes slot selection.

import type { AltRequestFailureReason } from './events';

export interface ReportEvent {
  event: string;
  id: string;
  sid: string;
  receivedAt: string;
  cta?: string;
  vid?: string;
  bookingRef?: string;
  reason?: AltRequestFailureReason;
}

export interface RequestRow {
  createdAt?: unknown;
  status?: unknown;
  email?: unknown;
  linkedCaptureId?: unknown;
}

export const ALT_STATUS_KEYS = ['new', 'contacted', 'scheduled', 'closed'] as const;

export interface BookingAvailabilitySection {
  sessions: number;
  /** Distinct first-party browser ids. Sessions recorded before browser ids
   *  existed (or with storage blocked) are counted in sessionsWithoutBrowserId. */
  uniqueBrowsers: number;
  sessionsWithoutBrowserId: number;
  schedulerOpenedSessions: number;
  bookingEvents: number;
  /** Null when no booking event in range carried a Calendly id (cannot be measured). */
  distinctBookings: number | null;
  bookingEventsWithoutId: number;
  /** Always null: see the file comment. */
  confirmedAppointments: null;
  altRequestOpenedSessions: number;
  altRequestSubmittedEvents: number;
  altRequestFailedEvents: number;
  altRequestFailureReasons: Partial<Record<AltRequestFailureReason | 'unknown', number>>;
  /** Saved requests created in range, from the requests collection (authoritative). Null if it could not be read. */
  altRequestsSaved: number | null;
  /** Status today of the requests created in range. "scheduled" is the admin's
   *  explicit record that a time was arranged — the only request→booking link. */
  altRequestOutcomes: Record<(typeof ALT_STATUS_KEYS)[number], number> | null;
  altRequestsLinkedToLead: number | null;
  emailLinkClicks: number;
  emailClickSessions: number;
  emailClickBrowsers: number;
  emailCopies: number;
  excludedTest: { events: number; sessions: number; leads: number | null; requests: number | null };
}

export function buildBookingSection(
  events: ReportEvent[],
  requests: RequestRow[] | null,
  excluded: BookingAvailabilitySection['excludedTest'],
): BookingAvailabilitySection {
  const sessions = new Set(events.map((e) => e.sid));
  const sidsWithVid = new Set(events.filter((e) => e.vid).map((e) => e.sid));
  const browsers = new Set(events.map((e) => e.vid).filter((b): b is string => Boolean(b)));

  const bookings = events.filter((e) => e.event === 'appointment_completed');
  const refs = new Set(bookings.map((e) => e.bookingRef).filter((r): r is string => Boolean(r)));
  const withoutId = bookings.filter((e) => !e.bookingRef).length;

  const failed = events.filter((e) => e.event === 'alt_time_request_failed');
  const reasons: BookingAvailabilitySection['altRequestFailureReasons'] = {};
  for (const f of failed) {
    const k = f.reason ?? 'unknown';
    reasons[k] = (reasons[k] ?? 0) + 1;
  }

  const emailClicks = events.filter((e) => e.event === 'cta_click' && e.cta === 'contact_email');

  let outcomes: BookingAvailabilitySection['altRequestOutcomes'] = null;
  let linked: number | null = null;
  if (requests) {
    outcomes = { new: 0, contacted: 0, scheduled: 0, closed: 0 };
    linked = 0;
    for (const r of requests) {
      const s = (ALT_STATUS_KEYS as readonly string[]).includes(String(r.status)) ? (r.status as keyof typeof outcomes) : 'new';
      outcomes[s] += 1;
      if (typeof r.linkedCaptureId === 'string' && r.linkedCaptureId) linked += 1;
    }
  }

  return {
    sessions: sessions.size,
    uniqueBrowsers: browsers.size,
    sessionsWithoutBrowserId: [...sessions].filter((s) => !sidsWithVid.has(s)).length,
    schedulerOpenedSessions: new Set(events.filter((e) => e.event === 'scheduling_dialog_opened').map((e) => e.sid)).size,
    bookingEvents: bookings.length,
    distinctBookings: refs.size > 0 ? refs.size : bookings.length === 0 ? 0 : null,
    bookingEventsWithoutId: withoutId,
    confirmedAppointments: null,
    altRequestOpenedSessions: new Set(events.filter((e) => e.event === 'alt_time_request_opened').map((e) => e.sid)).size,
    altRequestSubmittedEvents: events.filter((e) => e.event === 'alt_time_request_submitted').length,
    altRequestFailedEvents: failed.length,
    altRequestFailureReasons: reasons,
    altRequestsSaved: requests ? requests.length : null,
    altRequestOutcomes: outcomes,
    altRequestsLinkedToLead: linked,
    emailLinkClicks: emailClicks.length,
    emailClickSessions: new Set(emailClicks.map((e) => e.sid)).size,
    emailClickBrowsers: new Set(emailClicks.map((e) => e.vid).filter(Boolean)).size,
    emailCopies: events.filter((e) => e.event === 'email_copied').length,
    excludedTest: excluded,
  };
}

// ---- "Saved without scheduler" linkage --------------------------------------

export interface SavedLinkage {
  /** Saved in a session that also opened the scheduler. */
  withSchedulerSameSession: number;
  /** Saved in a session without the scheduler, but an EARLIER booking is linked
   *  (same browser id, or the lead itself records a booking made first). */
  afterEarlierBooking: number;
  /** No linked booking found. Unknown — not abandonment: the booking may have
   *  happened on another device, before browser ids existed, or not at all. */
  unknown: number;
}

export function buildSavedLinkage(
  events: ReportEvent[],
  /** appointment_completed events from before the range (a bounded lookback), for browser-id matching. */
  earlierBookings: ReportEvent[],
  /** sids of leads in range whose record says a booking came first (bookedSelfReported). */
  leadSidsBookedFirst: Set<string>,
): SavedLinkage {
  const dialogSids = new Set(events.filter((e) => e.event === 'scheduling_dialog_opened').map((e) => e.sid));
  const firstSavedAt = new Map<string, string>();
  for (const e of events) {
    if (e.event !== 'lead_saved') continue;
    const prev = firstSavedAt.get(e.sid);
    if (!prev || e.receivedAt < prev) firstSavedAt.set(e.sid, e.receivedAt);
  }
  const vidsBySid = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.vid) continue;
    const set = vidsBySid.get(e.sid) ?? new Set<string>();
    set.add(e.vid);
    vidsBySid.set(e.sid, set);
  }
  const bookingTimesByVid = new Map<string, string[]>();
  for (const e of [...earlierBookings, ...events]) {
    if (e.event !== 'appointment_completed' || !e.vid) continue;
    const list = bookingTimesByVid.get(e.vid) ?? [];
    list.push(e.receivedAt);
    bookingTimesByVid.set(e.vid, list);
  }

  const out: SavedLinkage = { withSchedulerSameSession: 0, afterEarlierBooking: 0, unknown: 0 };
  for (const [sid, savedAt] of firstSavedAt) {
    if (dialogSids.has(sid)) {
      out.withSchedulerSameSession += 1;
      continue;
    }
    const vids = vidsBySid.get(sid) ?? new Set<string>();
    const bookedEarlier = [...vids].some((b) => (bookingTimesByVid.get(b) ?? []).some((t) => t < savedAt));
    if (bookedEarlier || leadSidsBookedFirst.has(sid)) out.afterEarlierBooking += 1;
    else out.unknown += 1;
  }
  return out;
}

/** Browser ids of lead_saved sessions that need a lookback to resolve. */
export function unresolvedSavedBrowserIds(events: ReportEvent[], leadSidsBookedFirst: Set<string>): Set<string> {
  const dialogSids = new Set(events.filter((e) => e.event === 'scheduling_dialog_opened').map((e) => e.sid));
  const savedSids = new Set(events.filter((e) => e.event === 'lead_saved').map((e) => e.sid));
  const out = new Set<string>();
  for (const e of events) {
    if (!e.vid || !savedSids.has(e.sid) || dialogSids.has(e.sid) || leadSidsBookedFirst.has(e.sid)) continue;
    out.add(e.vid);
  }
  return out;
}

// ---- Review flags -------------------------------------------------------------

export interface ReviewFlag {
  kind: 'repeat_bookings' | 'rapid_email_clicks';
  sid: string;
  count: number;
  /** For repeat_bookings: how many distinct Calendly ids among them (null if none carried one). */
  distinctBookings: number | null;
  firstAt: string;
  lastAt: string;
  /** Already classified as test (by any rule). */
  confirmedTest: boolean;
}

const REPEAT_BOOKING_WINDOW_MS = 10 * 60 * 1000;
const RAPID_EMAIL_WINDOW_MS = 2 * 60 * 1000;
const RAPID_EMAIL_MIN = 5;
const MAX_FLAGS = 25;

function densestRun(times: string[], windowMs: number): { count: number; first: string; last: string } {
  const sorted = [...times].sort();
  let best = { count: 0, first: '', last: '' };
  let start = 0;
  for (let end = 0; end < sorted.length; end++) {
    while (Date.parse(sorted[end]) - Date.parse(sorted[start]) > windowMs) start++;
    const count = end - start + 1;
    if (count > best.count) best = { count, first: sorted[start], last: sorted[end] };
  }
  return best;
}

/**
 * Patterns worth a human look — several booking completions, or a burst of
 * email taps, from one session in minutes. A flag is a prompt to review, never
 * a classification: it marks nothing as test, and a real person can do either
 * (a failed mail app invites repeated taps). The admin decides.
 */
export function buildReviewFlags(events: ReportEvent[], isTest: (e: ReportEvent) => boolean): ReviewFlag[] {
  const bySid = new Map<string, ReportEvent[]>();
  for (const e of events) {
    const list = bySid.get(e.sid) ?? [];
    list.push(e);
    bySid.set(e.sid, list);
  }
  const flags: ReviewFlag[] = [];
  for (const [sid, list] of bySid) {
    const confirmedTest = list.some(isTest);
    const bookings = list.filter((e) => e.event === 'appointment_completed');
    if (bookings.length >= 2) {
      const run = densestRun(bookings.map((e) => e.receivedAt), REPEAT_BOOKING_WINDOW_MS);
      if (run.count >= 2) {
        const refs = new Set(bookings.map((e) => e.bookingRef).filter(Boolean));
        flags.push({
          kind: 'repeat_bookings',
          sid,
          count: run.count,
          distinctBookings: refs.size > 0 ? refs.size : null,
          firstAt: run.first,
          lastAt: run.last,
          confirmedTest,
        });
      }
    }
    const emails = list.filter((e) => e.event === 'cta_click' && e.cta === 'contact_email');
    if (emails.length >= RAPID_EMAIL_MIN) {
      const run = densestRun(emails.map((e) => e.receivedAt), RAPID_EMAIL_WINDOW_MS);
      if (run.count >= RAPID_EMAIL_MIN) {
        flags.push({ kind: 'rapid_email_clicks', sid, count: run.count, distinctBookings: null, firstAt: run.first, lastAt: run.last, confirmedTest });
      }
    }
  }
  return flags.sort((a, b) => b.lastAt.localeCompare(a.lastAt)).slice(0, MAX_FLAGS);
}

// ---- Availability-change comparison -----------------------------------------

export const AVAILABILITY_CHANGE_ENV = 'BOOKING_AVAILABILITY_CHANGED_AT';

export interface PeriodCounts {
  startIso: string;
  endIso: string;
  days: number;
  sessions: number;
  uniqueBrowsers: number;
  schedulerOpenedSessions: number;
  bookingEvents: number;
  distinctBookings: number | null;
  altRequestOpenedSessions: number;
  altRequestsSaved: number | null;
  emailLinkClicks: number;
}

export type AvailabilityComparison =
  | { configured: false; envVar: string; reason: 'missing' | 'invalid' }
  | {
      configured: true;
      changedAt: string;
      /** The change is in the future — nothing to compare yet. */
      pending: boolean;
      before: PeriodCounts | null;
      after: PeriodCounts | null;
      /** Events before this instant were never recorded, so "before" may be short. */
      trackingStartDate: string | null;
      truncated: boolean;
    };

/** Reads the explicitly recorded change instant. Never inferred. */
export function readAvailabilityChange(env: Record<string, string | undefined> = process.env):
  | { ok: true; changedAt: Date }
  | { ok: false; reason: 'missing' | 'invalid' } {
  const raw = env[AVAILABILITY_CHANGE_ENV]?.trim();
  if (!raw) return { ok: false, reason: 'missing' };
  // Require an explicit offset or Z so the instant is unambiguous.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(raw)) return { ok: false, reason: 'invalid' };
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? { ok: false, reason: 'invalid' } : { ok: true, changedAt: d };
}

export function buildPeriodCounts(
  events: ReportEvent[],
  requests: RequestRow[] | null,
  startIso: string,
  endIso: string,
): PeriodCounts {
  const inRange = events.filter((e) => e.receivedAt >= startIso && e.receivedAt < endIso);
  const reqs = requests
    ? requests.filter((r) => typeof r.createdAt === 'string' && r.createdAt >= startIso && r.createdAt < endIso)
    : null;
  const section = buildBookingSection(inRange, reqs, { events: 0, sessions: 0, leads: null, requests: null });
  return {
    startIso,
    endIso,
    days: Math.round(((Date.parse(endIso) - Date.parse(startIso)) / 86_400_000) * 10) / 10,
    sessions: section.sessions,
    uniqueBrowsers: section.uniqueBrowsers,
    schedulerOpenedSessions: section.schedulerOpenedSessions,
    bookingEvents: section.bookingEvents,
    distinctBookings: section.distinctBookings,
    altRequestOpenedSessions: section.altRequestOpenedSessions,
    altRequestsSaved: section.altRequestsSaved,
    emailLinkClicks: section.emailLinkClicks,
  };
}
