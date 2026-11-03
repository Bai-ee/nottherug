// Owner-facing analytics reporting service (plan A4:
// plans/003-admin-dashboard-and-tracking.md). Turns raw `analytics_events`
// documents and the authoritative `leads` collection into the exact numbers
// the admin dashboard shows.
//
// By design (locked decision 5) there is no rollup/aggregation collection —
// at the owner's expected traffic (under ~100 visits/day) this queries raw
// events directly, bounded by date window every time, so every number stays
// exact instead of drifting from a partially-failed aggregate.
//
// Everything here reuses the shared contract in lib/analytics/events.ts
// (event names, CTA ids, booking steps, validation) so this file cannot
// silently disagree with the client tracker or the ingestion route about
// what a field means.

import { fsQueryRange } from '@/lib/server/firestoreRest';
import {
  emptyTestContext,
  isTestEvent,
  isTestRecord,
  keepForView,
  loadTestContext,
  type TestContext,
  type TestView,
} from '@/lib/testing/classification';
import { ALT_TIME_COLLECTION } from '@/lib/booking/alternateTime';
import { normalizeEmail } from '@/lib/leads/linkage';
import {
  buildBookingSection,
  buildPeriodCounts,
  buildReviewFlags,
  buildSavedLinkage,
  readAvailabilityChange,
  unresolvedSavedBrowserIds,
  AVAILABILITY_CHANGE_ENV,
  type AvailabilityComparison,
  type BookingAvailabilitySection,
  type ReportEvent,
  type RequestRow,
  type ReviewFlag,
  type SavedLinkage,
} from '@/lib/analytics/bookingReport';
import { measureLeadCompleteness } from '@/lib/leads/completeness';
import type { LeadRecord } from '@/lib/leads/contract';
import { ServiceError } from '@/lib/server/errors';
import {
  BOOKING_STEPS,
  CTA_IDS,
  EVENTS_COLLECTION,
  isAltRequestFailureReason,
  isBookingStep,
  isCampaignSlug,
  isCtaId,
  isEventName,
  isOpaqueId,
  isTrackedRoute,
  type AltRequestFailureReason,
  type BookingStep,
  type CampaignSlug,
  type CtaId,
  type EventName,
  isVisitorKind,
  type SourceKind,
  type TrackedRoute,
  type VisitorKind,
} from '@/lib/analytics/events';

const TZ = 'America/New_York';

// ---- Public response contract --------------------------------------------
// This is what app/api/admin/analytics/route.ts returns and what the
// dashboard UI (A5) imports directly. Treat it as a public contract: adding
// fields is fine, changing the meaning of an existing one is not.

export const REPORT_RANGES = ['today', '7d', '30d'] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export function isReportRange(v: unknown): v is ReportRange {
  return typeof v === 'string' && (REPORT_RANGES as readonly string[]).includes(v);
}

/**
 * What a caller may ask for. The admin dashboard only ever passes a
 * ReportRange; the server-to-server stats API (app/api/stats) also accepts a
 * rolling 24 hours ending now and a custom inclusive span of New York
 * calendar dates. Build custom specs with parseReportSpec, never by hand.
 */
export type ReportSpec = ReportRange | '24h' | { from: string; to: string };
export type ReportKey = ReportRange | '24h' | 'custom';

/** Longest custom span accepted. Bounds the raw-event read (decision 5: no rollups). */
export const MAX_CUSTOM_RANGE_DAYS = 90;
/** Events expire 13 months after receipt (lib/analytics/retention.ts); older dates hold nothing. */
const MAX_LOOKBACK_DAYS = 395;
const DATE_LABEL_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDateLabel(v: string): boolean {
  return DATE_LABEL_RE.test(v) && new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v;
}

function daysBetweenLabels(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / 86_400_000);
}

/**
 * Reads `range` / `from` / `to` query values into a ReportSpec. `from`+`to`
 * (YYYY-MM-DD, New York dates, inclusive) win over `range`; an unknown
 * `range` falls back to `fallback`. A custom span that is malformed,
 * reversed, in the future, longer than MAX_CUSTOM_RANGE_DAYS or older than
 * event retention is an error, never silently clamped.
 */
export function parseReportSpec(
  params: { range?: string | null; from?: string | null; to?: string | null },
  fallback: ReportRange | '24h',
  now = new Date()
): { ok: true; spec: ReportSpec } | { ok: false; error: string } {
  const { from, to } = params;
  if (from || to) {
    if (!from || !to) return { ok: false, error: 'from and to must be given together' };
    if (!isRealDateLabel(from) || !isRealDateLabel(to)) return { ok: false, error: 'from and to must be YYYY-MM-DD dates' };
    const todayLabel = isoDateInTZ(now, TZ);
    if (from > to) return { ok: false, error: 'from must be on or before to' };
    if (to > todayLabel) return { ok: false, error: 'to cannot be in the future' };
    if (daysBetweenLabels(from, to) + 1 > MAX_CUSTOM_RANGE_DAYS) return { ok: false, error: `custom ranges are limited to ${MAX_CUSTOM_RANGE_DAYS} days` };
    if (daysBetweenLabels(from, todayLabel) > MAX_LOOKBACK_DAYS) return { ok: false, error: 'from is older than the 13-month event retention' };
    return { ok: true, spec: { from, to } };
  }
  if (params.range === '24h') return { ok: true, spec: '24h' };
  return { ok: true, spec: isReportRange(params.range) ? params.range : fallback };
}

export function reportKeyOf(spec: ReportSpec): ReportKey {
  return typeof spec === 'string' ? spec : 'custom';
}

export interface RangeWindow {
  key: ReportKey;
  /** Half-open UTC instant bounds actually sent to Firestore: [startIso, endIso). */
  startIso: string;
  endIso: string;
  /** Number of America/New_York calendar days covered. Not always 24h * days — see DST handling below. */
  days: number;
  timezone: string;
}

export interface DailyTrendPoint {
  /** America/New_York calendar date, YYYY-MM-DD. */
  date: string;
  pageviews: number;
  /**
   * Distinct sid count WITHIN this one day only. Do not sum this column to
   * get a range total — a session can span midnight and would be double
   * counted. The range total lives at AnalyticsReport.sessions, computed
   * once from the whole window's event set.
   */
  sessions: number;
  /** Distinct visitor ids that day; same no-summing rule as sessions. Null
   *  when the day had events but none carried a visitor id (before visitor
   *  tracking began). */
  visitors: number | null;
  engagedSessions: number;
  /** Tracked lead_saved events that day — the inquiry card's own daily line.
   *  This is the tracked cohort, not the authoritative leads total. */
  leadSaved: number;
}

export interface SourceRow {
  /** 'campaign:<slug>' | 'referral:<hostname>' | 'direct' (also covers referrer-stripped traffic). */
  source: string;
  sessions: number;
}

export interface PageRow {
  /** A stored TrackedRoute, e.g. '/' or '/book'. Events whose route is null (an untracked/unknown path) are not counted here. */
  route: string;
  /** Deduplicated page_view events for this route in range. */
  pageviews: number;
  /** Distinct sids that viewed this route. Sums across rows can exceed AnalyticsReport.sessions — one session can visit several pages. */
  sessions: number;
}

export interface CtaRow {
  cta: CtaId;
  clicks: number;
}

export interface FunnelStepRow {
  step: BookingStep;
  /** Distinct sessions that reached this step at least once (back/forward navigation does not inflate this). */
  sessions: number;
}

export interface BookingFunnel {
  /** Distinct booking_form_start events (one per attempt, per the client contract). */
  formStarts: number;
  steps: FunnelStepRow[];
  /** Distinct sessions that opened the scheduling dialog. */
  dialogOpened: number;
  /**
   * Distinct sessions that saved a lead WITHOUT ever opening the scheduling
   * dialog ("Saved, scheduler not opened"). Still a completed inquiry, not
   * abandonment. The phone-consultation option that once produced this shape
   * has been removed, but the measure (lead_saved and no
   * scheduling_dialog_opened in the same session) is unchanged and still true.
   */
  savedSchedulerNotOpened: number;
  /**
   * Every lead_saved session split by what can be linked: scheduler in the
   * same session, an EARLIER booking from the same browser (or recorded on the
   * lead), or unknown. Unknown is not abandonment.
   */
  savedLinkage?: SavedLinkage;
  /** Distinct sessions that opened the dialog AND produced a verified appointment_completed. */
  calendlyScheduled: number;
  /**
   * Sessions that started the booking form (booking_form_start or any
   * booking_step) but recorded neither lead_saved nor appointment_completed,
   * grouped by the furthest step they reached ('started' = form opened, no
   * step yet). Always one row per stage, in funnel order.
   */
  abandonment: Array<{ lastStep: 'started' | BookingStep; sessions: number }>;
}

export interface SessionDurationInfo {
  /** Sessions with at least two events in range (one event has no measurable span). */
  measuredSessions: number;
  /** null when no session is measurable. */
  medianSeconds: number | null;
  meanSeconds: number | null;
  note: string;
}

/** New vs returning split of AnalyticsReport.visitors; nulls follow it. */
export interface VisitorBreakdown {
  /** Visitors whose first-ever session (the one that created the id) is in range. */
  newVisitors: number | null;
  /** visitors minus newVisitors: the browser had visited before its first session in range. */
  returningVisitors: number | null;
  /** Sessions in range carrying a visitor id. Below `sessions` when part of the range predates visitor tracking or storage was blocked. */
  sessionsWithVisitorId: number;
  /** sessionsWithVisitorId over visitors. Null when there are no visitors. */
  sessionsPerVisitor: number | null;
  note: string;
}

export interface InquiryRateInfo {
  /** null when the denominator is zero — never divide by zero and call it 0%. */
  rate: number | null;
  /** Numerator: deduplicated lead_saved events from TRACKED sessions in range. */
  trackedLeadSaved: number;
  /** Denominator, reported explicitly per the plan's "report the denominator alongside it". */
  trackedSessions: number;
  note: string;
}

export interface LiveTile {
  windowMinutes: 60;
  startIso: string;
  endIso: string;
  pageviews: number;
  sessions: number;
  /** Distinct visitor ids in the 60 minutes. */
  visitors: number;
}

/**
 * 'ok' — normal, has activity.
 * 'zero_activity' — tracking has recorded events before, but none in this window.
 * 'no_data_yet' — no event has ever been recorded (trackingStartDate is null); do not imply history.
 * 'partial_failure' — at least one dependency (leads, events, live or first-event lookup) failed; some fields are degraded, not fabricated.
 */
export type ReportStatus = 'ok' | 'zero_activity' | 'no_data_yet' | 'partial_failure';

export interface AnalyticsReportMeta {
  status: ReportStatus;
  /** Server clock time this report was computed — lets the UI show "stale" if it holds an old response (decision 11). */
  generatedAt: string;
  /** Earliest event ever recorded (in the requested mode), or null if none exists yet. */
  trackingStartDate: string | null;
  /** Which mode this report reflects: false = real business data (default), true = test/preview traffic only. */
  testMode: boolean;
  /** Which dependency(ies) failed and were substituted with safe defaults rather than fabricated data. */
  degraded: Array<'leads' | 'events'>;
  /**
   * Independent dependencies that failed and have no honest value: 'live' (the
   * rolling 60-minute tile; its numbers are zero-filled placeholders, not
   * measurements) and 'trackingStart' (trackingStartDate is null because the
   * lookup failed, NOT because no event exists). Additive to `degraded`; any
   * entry also makes status 'partial_failure'. Empty on a healthy report.
   */
  unavailable: Array<'live' | 'trackingStart'>;
  /** Which records this report includes: real only (default), real + test, or test only. */
  testView?: TestView;
  /** 'unavailable' when the test-marker collections could not be read: only
   *  build-time mode:'test' is excluded then, and the UI says so. */
  testClassification?: 'ok' | 'unavailable';
  /**
   * True if the bounded event query for this range hit its row ceiling, meaning
   * more matching events exist than were read. Every events-derived number in
   * this response is then a floor, not an exact total — never presented as one.
   */
  eventsTruncated: boolean;
}

export interface AnalyticsReport {
  meta: AnalyticsReportMeta;
  range: RangeWindow;

  /**
   * Authoritative saved-lead count for the range, from the leads collection —
   * never the client lead_saved event.
   *
   * Counts only `type: 'meetgreet'` documents (a completed questionnaire).
   * The leads collection also holds `type: 'capture'` documents — a
   * deliberately partial lead (email + Calendly booking intent, no answers)
   * written by app/api/leads/capture/route.ts when someone only gives an
   * email before booking. Those are excluded at the Firestore query level
   * (a `type == 'meetgreet'` equality filter alongside the date range), never
   * fetched and filtered client-side — see fsQueryRangeCount in
   * lib/server/firestoreRest.ts. The capture-side count is reported
   * separately as `outstandingCaptures` and must never be added here.
   *
   * Null in exactly two cases the UI must tell apart:
   *  - the leads query failed (meta.degraded includes 'leads');
   *  - this is a test-mode report (meta.testMode). Leads carry no mode field,
   *    so real inquiries cannot be split out of a test-mode view, and showing
   *    the real total under a "not real business data" banner would be a lie.
   *    Not measured is the only honest answer there.
   *
   * KNOWN LIMITATION: a lead written before the `type` field existed (schema
   * v1) matches neither `type == 'meetgreet'` nor `type == 'capture'` —
   * Firestore equality filters never match a document missing the filtered
   * field — so such a document is invisible to this count. Only matters if
   * its `submittedAt` falls inside the queried range; harmless for the
   * today/7d/30d ranges this report actually supports unless the `type` field
   * was introduced within the last 30 days.
   */
  inquiries: number | null;
  inquiryRate: InquiryRateInfo;

  /**
   * Count of `type: 'capture'` leads documents in this same range whose
   * `status` is still `'partial'` — someone gave an email and started
   * booking on Calendly but has not answered the questionnaire yet. Once they
   * do, the meetgreet submission flips that same document's `status` to
   * `'converted'` (see markCaptureConverted in app/api/leads/meetgreet), so
   * it drops out of this count; the genuine inquiry they created is a
   * separate `type: 'meetgreet'` document already counted in `inquiries`.
   *
   * Never added to `inquiries` and never rendered as one — see
   * components/admin/analytics/InquiryHeadline.tsx. Filtered at the query
   * level the same way (a `status == 'partial'` equality filter alongside the
   * date range) and shares `inquiries`'s exact null semantics: null when the
   * leads query failed, null in test mode.
   */
  outstandingCaptures: number | null;
  /** Bookings as the leads themselves report them — the number that grows
   *  whenever a meeting is scheduled, whether or not any question was
   *  answered. Null in test mode and when the leads query fails, same as
   *  every other leads-derived figure. */
  bookedLeads: number | null;
  /** Leads who answered every question. */
  completedQuestionnaires: number | null;

  /** Count of appointment_completed events (deduplicated by event id). Reported separately — never summed with inquiries (decision 7). */
  appointmentsScheduled: number;

  /** Deduplicated page_view event count for the range. */
  pageviews: number;
  /** Distinct sid count for the range. Sessions/visits, never "unique visitors" or "people" (that is `visitors`). */
  sessions: number;
  /**
   * Distinct browser visitor ids in range (unique visitors). One browser, not
   * one person: a phone and a laptop are two, and clearing storage starts a
   * new one. Null when no event in range carries an id, i.e. the range is
   * before visitor tracking began — never a fabricated zero.
   */
  visitors: number | null;
  visitorBreakdown: VisitorBreakdown;
  /** Sessions with at least one 'engagement' event, over total sessions, as a 0-100 percentage. Replaces bounce rate (decision 2). Null when there are no sessions. */
  engagedVisitPct: number | null;
  /** Sessions that viewed exactly one page and recorded no engagement, CTA click or booking event. */
  bouncedSessions: number;
  /** bouncedSessions over sessions, 0-100. Null when there are no sessions. */
  bounceRatePct: number | null;
  /** page_view events over sessions. Null when there are no sessions. */
  pagesPerSession: number | null;
  sessionDuration: SessionDurationInfo;

  dailyTrend: DailyTrendPoint[];
  sources: SourceRow[];
  /** Per-route page_view aggregation, sorted by pageviews desc. No engagement column: 'engagement' is a session-level event with no route of its own. */
  pages: PageRow[];
  ctaClicks: CtaRow[];
  funnel: BookingFunnel;

  /** Rolling 60 minutes ending now, independent of `range` (decision 3: "alongside", not a day bucket). */
  live: LiveTile;

  /** Distinct email addresses across leads, captures and time requests in range. Null when leads were not read. */
  distinctContacts?: number | null;
  /** Emails with more than one questionnaire submission in range — for review, never auto-classified. */
  repeatContactEmails?: number | null;
  /** Booking availability, alternate-time requests and email contact (plan 017). */
  bookingAvailability?: BookingAvailabilitySection;
  /** Sessions worth a human look (several bookings, bursts of email taps). Never auto-classified. */
  reviewFlags?: ReviewFlag[];
  /** Before/after counts around BOOKING_AVAILABILITY_CHANGED_AT, when it is configured. */
  availabilityChange?: AvailabilityComparison;
}

// ---- Internal stored-event shape ------------------------------------------
// Deliberately NOT the wire AnalyticsEvent type: the ingestion route
// (app/api/track/route.ts) stores the client clock as an advisory `clientTs`
// and never persists `ts` at all (receivedAt is the sole ordering authority —
// see that route's storeOneEvent comment). Reporting has no use for either
// timestamp, so this shape simply omits it rather than fabricating one.

export interface StoredAnalyticsEvent {
  event: EventName;
  id: string;
  sid: string;
  route: TrackedRoute | null;
  cta?: CtaId;
  step?: BookingStep;
  src?: SourceKind;
  ref?: string;
  camp?: CampaignSlug;
  vid?: string;
  vr?: VisitorKind;
  mode?: 'test';
  td?: string;
  bookingRef?: string;
  reason?: AltRequestFailureReason;
  /** Server receipt time, ISO-8601 UTC — the reporting authority per the plan. */
  receivedAt: string;
}

// Matches Date.prototype.toISOString() exactly. Used to reject any document
// whose receivedAt isn't in the exact lexicographically-sortable shape the
// range queries depend on, rather than guessing at a looser format.
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Re-validates a raw Firestore document field-by-field, using the same
 * allowlist guards events.ts exports for the wire contract (isEventName,
 * isOpaqueId, etc.) rather than its validateEvent() — that function requires
 * a numeric `ts`, which stored documents do not have (see StoredAnalyticsEvent
 * above). Rejects (returns null) rather than repairs: a malformed stored doc
 * is not worth guessing at, and a silently "fixed" event would corrupt
 * reporting quietly.
 */
function toStoredEvent(raw: Record<string, unknown>): StoredAnalyticsEvent | null {
  if (!isEventName(raw.event)) return null;
  if (!isOpaqueId(raw.id) || !isOpaqueId(raw.sid)) return null;
  if (typeof raw.receivedAt !== 'string' || !ISO_UTC_RE.test(raw.receivedAt)) return null;

  const route = raw.route === null || raw.route === undefined ? null : isTrackedRoute(raw.route) ? raw.route : null;

  const out: StoredAnalyticsEvent = { event: raw.event, id: raw.id, sid: raw.sid, route, receivedAt: raw.receivedAt };
  if (isOpaqueId(raw.vid)) out.vid = raw.vid;

  // Same per-event-type gating as the wire validator, so a corrupted document
  // cannot attach e.g. a cta to a page_view and skew the CTA click table.
  if (raw.event === 'cta_click' && isCtaId(raw.cta)) out.cta = raw.cta;
  if (raw.event === 'booking_step' && isBookingStep(raw.step)) out.step = raw.step;

  if (raw.src === 'campaign' || raw.src === 'referral' || raw.src === 'direct') {
    out.src = raw.src;
    if (raw.src === 'campaign' && isCampaignSlug(raw.camp)) out.camp = raw.camp;
    if (raw.src === 'referral' && typeof raw.ref === 'string') out.ref = raw.ref;
    if (isVisitorKind(raw.vr)) out.vr = raw.vr;
  }

  if (raw.mode === 'test') out.mode = 'test';
  if (isOpaqueId(raw.td)) out.td = raw.td;
  if (raw.event === 'appointment_completed' && typeof raw.bookingRef === 'string' && /^[a-f0-9]{32}$/.test(raw.bookingRef)) {
    out.bookingRef = raw.bookingRef;
  }
  if (raw.event === 'alt_time_request_failed' && isAltRequestFailureReason(raw.reason)) out.reason = raw.reason;

  return out;
}

/** Deduplicates by client event id. Duplicate delivery (retries, double-fires) must never inflate a count. */
function dedupeById(items: StoredAnalyticsEvent[]): StoredAnalyticsEvent[] {
  const seen = new Set<string>();
  const out: StoredAnalyticsEvent[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

// ---- New York calendar-day boundaries --------------------------------------
// Mirrors the technique lib/leads/stats.ts uses for day LABELS, but this file
// also needs the actual UTC instant boundaries (to bound Firestore queries),
// so it goes one step further and converts an NY calendar date back to the
// UTC instant of that date's local midnight, DST-correctly.

function isoDateInTZ(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(date); // en-CA gives YYYY-MM-DD directly
}

/** Pure calendar-date arithmetic on a YYYY-MM-DD label — no timezone conversion happens here. */
function shiftLabel(label: string, days: number): string {
  const d = new Date(`${label}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** NY UTC offset (minutes, e.g. -300 for EST, -240 for EDT) in effect at the given instant. */
function nyOffsetMinutesAt(utcMs: number): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Reinterpret the NY wall-clock reading as if it were itself a UTC instant;
  // the delta from the real instant is exactly the zone's offset.
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return (asIfUtc - utcMs) / 60_000;
}

/**
 * The UTC instant for local midnight (00:00:00.000) of the given NY calendar
 * date. Two passes: the offset near a DST transition can differ between the
 * naive guess and the corrected instant, and the offset only ever takes one
 * of two values, so a second pass is guaranteed to converge.
 */
function nyMidnightUtc(dateLabel: string): Date {
  const naiveMs = Date.parse(`${dateLabel}T00:00:00.000Z`);
  const offset1 = nyOffsetMinutesAt(naiveMs);
  const corrected1 = naiveMs - offset1 * 60_000;
  const offset2 = nyOffsetMinutesAt(corrected1);
  const finalMs = offset2 === offset1 ? corrected1 : naiveMs - offset2 * 60_000;
  return new Date(finalMs);
}

const RANGE_DAYS: Record<ReportRange, number> = { today: 1, '7d': 7, '30d': 30 };

export interface ResolvedWindow {
  window: RangeWindow;
  /** First NY calendar date the daily trend covers. */
  startLabel: string;
  /** Row ceiling for the bounded event read; hitting it flags eventsTruncated. */
  eventsLimit: number;
}

/**
 * The half-open UTC bounds for a spec. Calendar ranges (today/7d/30d and
 * custom dates) run from NY midnight to NY midnight; '24h' is the rolling
 * 24 hours ending at `now`, so its daily trend covers the (usually two)
 * NY dates it touches, each holding only the in-window part of that day.
 */
export function resolveReportWindow(spec: ReportSpec, now: Date): ResolvedWindow {
  if (spec === '24h') {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startLabel = isoDateInTZ(start, TZ);
    const days = daysBetweenLabels(startLabel, isoDateInTZ(now, TZ)) + 1;
    return {
      window: { key: '24h', startIso: start.toISOString(), endIso: now.toISOString(), days, timezone: TZ },
      startLabel,
      eventsLimit: EVENTS_QUERY_LIMIT.today,
    };
  }
  let startLabel: string;
  let endLabel: string;
  if (typeof spec === 'string') {
    endLabel = isoDateInTZ(now, TZ);
    startLabel = shiftLabel(endLabel, -(RANGE_DAYS[spec] - 1));
  } else {
    startLabel = spec.from;
    endLabel = spec.to;
  }
  const days = daysBetweenLabels(startLabel, endLabel) + 1;
  const eventsLimit = typeof spec === 'string' ? EVENTS_QUERY_LIMIT[spec] : days <= 1 ? EVENTS_QUERY_LIMIT.today : days <= 7 ? EVENTS_QUERY_LIMIT['7d'] : days <= 30 ? EVENTS_QUERY_LIMIT['30d'] : CUSTOM_LONG_QUERY_LIMIT;
  return {
    window: {
      key: reportKeyOf(spec),
      startIso: nyMidnightUtc(startLabel).toISOString(),
      endIso: nyMidnightUtc(shiftLabel(endLabel, 1)).toISOString(), // NY midnight after the last day — half-open upper bound
      days,
      timezone: TZ,
    },
    startLabel,
    eventsLimit,
  };
}

interface DayWindow {
  date: string;
  startIso: string;
  endIso: string;
}

function buildDayWindows(startLabel: string, days: number): DayWindow[] {
  const out: DayWindow[] = [];
  for (let i = 0; i < days; i++) {
    const label = shiftLabel(startLabel, i);
    const nextLabel = shiftLabel(label, 1);
    out.push({ date: label, startIso: nyMidnightUtc(label).toISOString(), endIso: nyMidnightUtc(nextLabel).toISOString() });
  }
  return out;
}

// ---- Bounded event fetch/filter --------------------------------------------
// Every one of these ceilings is a hard, finite limit on top of an already
// date-bounded query — never an unbounded scan. Sized generously for "under
// ~100 visits/day" (decision 5) plus headroom, not tuned to the exact number.
const EVENTS_QUERY_LIMIT: Record<ReportRange, number> = { today: 3000, '7d': 10_000, '30d': 20_000 };
/** Custom spans of 31-90 days. */
const CUSTOM_LONG_QUERY_LIMIT = 40_000;
const LIVE_QUERY_LIMIT = 1000;
const EARLIEST_SAMPLE_LIMIT = 100;
const EARLIEST_MAX_PAGES = 5;

function filterMode(events: StoredAnalyticsEvent[], includeTest: boolean): StoredAnalyticsEvent[] {
  // mode:'test' traffic (preview/acceptance, decision 10) is excluded from
  // real business numbers by default; includeTest flips this to inspect test
  // data in isolation. The two views are never blended.
  return events.filter((e) => (includeTest ? e.mode === 'test' : e.mode !== 'test'));
}

/**
 * Fetches one date-bounded window of events, ascending by receivedAt. The
 * ascending order is relied on downstream (buildSourceTable) to find each
 * session's genuinely-first event without a second sort.
 */
export async function fetchRangeEvents(
  startIso: string,
  endIso: string,
  limit: number,
  includeTest: boolean
): Promise<{ events: StoredAnalyticsEvent[]; truncated: boolean }> {
  const { events, truncated } = await fetchRangeEventsRaw(startIso, endIso, limit);
  return { events: filterMode(events, includeTest), truncated };
}

/** Same read, unclassified: the main report classifies test activity itself
 *  (lib/testing/classification.ts), which needs the leads/requests read first. */
async function fetchRangeEventsRaw(
  startIso: string,
  endIso: string,
  limit: number,
): Promise<{ events: StoredAnalyticsEvent[]; truncated: boolean }> {
  const raw = await fsQueryRange(EVENTS_COLLECTION, 'receivedAt', startIso, endIso, limit, 'ASCENDING');
  const truncated = raw.length >= limit;
  const stored = dedupeById(raw.map(toStoredEvent).filter((e): e is StoredAnalyticsEvent => e !== null));
  return { events: stored, truncated };
}

/** Confirmed-test classification (lib/testing/classification.ts) for one view. */
function classifyView(events: StoredAnalyticsEvent[], ctx: TestContext, view: TestView): StoredAnalyticsEvent[] {
  return events.filter((e) => keepForView(isTestEvent(e, ctx), view));
}

async function fetchLiveRaw(now: Date): Promise<StoredAnalyticsEvent[]> {
  const windowMs = 60 * 60 * 1000;
  const startIso = new Date(now.getTime() - windowMs).toISOString();
  const endIso = now.toISOString();
  const raw = await fsQueryRange(EVENTS_COLLECTION, 'receivedAt', startIso, endIso, LIVE_QUERY_LIMIT, 'ASCENDING');
  return dedupeById(raw.map(toStoredEvent).filter((e): e is StoredAnalyticsEvent => e !== null));
}

function buildLive(stored: StoredAnalyticsEvent[], now: Date): LiveTile {
  const windowMs = 60 * 60 * 1000;
  const startIso = new Date(now.getTime() - windowMs).toISOString();
  const endIso = now.toISOString();
  return {
    windowMinutes: 60,
    startIso,
    endIso,
    pageviews: stored.filter((e) => e.event === 'page_view').length,
    sessions: new Set(stored.map((e) => e.sid)).size,
    visitors: distinctVisitorIds(stored).size,
  };
}

const EPOCH_ISO = '1970-01-01T00:00:00.000Z';
const FAR_FUTURE_ISO = '9999-12-31T23:59:59.999Z';

/**
 * Earliest event ever recorded, in the requested mode — powers "Tracking
 * starts on [date]" so the UI never implies traffic history before
 * collection began.
 *
 * Mode cannot be filtered inside the Firestore query without a new index:
 * real events carry no `mode` field at all (a `!= 'test'` filter would drop
 * every one of them), and `mode == 'test'` plus an ordered `receivedAt` range
 * needs a composite index this repo does not define. So the mode split stays
 * in code, but the read is no longer one fixed page: it walks forward in
 * bounded pages (each page starts at the last receivedAt seen) until a
 * matching event turns up, capped at EARLIEST_MAX_PAGES. Limitation: if the
 * oldest EARLIEST_SAMPLE_LIMIT * EARLIEST_MAX_PAGES events are all the other
 * mode, this reports null (the UI then omits the date) rather than guessing.
 */
async function fetchTrackingStartDate(includeTest: boolean): Promise<string | null> {
  let start = EPOCH_ISO;
  for (let page = 0; page < EARLIEST_MAX_PAGES; page++) {
    const raw = await fsQueryRange(EVENTS_COLLECTION, 'receivedAt', start, FAR_FUTURE_ISO, EARLIEST_SAMPLE_LIMIT, 'ASCENDING');
    const stored = dedupeById(raw.map(toStoredEvent).filter((e): e is StoredAnalyticsEvent => e !== null));
    const match = filterMode(stored, includeTest);
    if (match.length > 0) return match[0].receivedAt;
    if (raw.length < EARLIEST_SAMPLE_LIMIT || stored.length === 0) return null; // collection exhausted
    const next = stored[stored.length - 1].receivedAt;
    if (next <= start) return null; // a full page at one instant cannot advance
    start = next;
  }
  return null;
}

// ---- Metric builders --------------------------------------------------------

function distinctVisitorIds(events: StoredAnalyticsEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const e of events) if (e.vid) ids.add(e.vid);
  return ids;
}

function buildVisitorBreakdown(events: StoredAnalyticsEvent[]): VisitorBreakdown {
  const ids = distinctVisitorIds(events);
  const newIds = new Set<string>();
  const sidsWithVid = new Set<string>();
  for (const e of events) {
    if (!e.vid) continue;
    sidsWithVid.add(e.sid);
    if (e.vr === 'new') newIds.add(e.vid);
  }
  const unique = ids.size;
  const measured = unique > 0;
  return {
    newVisitors: measured ? newIds.size : null,
    returningVisitors: measured ? unique - newIds.size : null,
    sessionsWithVisitorId: sidsWithVid.size,
    sessionsPerVisitor: measured ? sidsWithVid.size / unique : null,
    note: 'A visitor is one browser (a random id kept in its local storage), not a person: the same person on a phone and a laptop is two visitors, and clearing browser storage makes them new again. Counted only from when visitor tracking began; null means no visitor ids exist in this range.',
  };
}

function bucketDailyTrend(events: StoredAnalyticsEvent[], windows: DayWindow[]): DailyTrendPoint[] {
  return windows.map((w) => {
    const dayEvents = events.filter((e) => e.receivedAt >= w.startIso && e.receivedAt < w.endIso);
    const engagedSids = new Set(dayEvents.filter((e) => e.event === 'engagement').map((e) => e.sid));
    const dayVisitors = distinctVisitorIds(dayEvents).size;
    return {
      date: w.date,
      pageviews: dayEvents.filter((e) => e.event === 'page_view').length,
      sessions: new Set(dayEvents.map((e) => e.sid)).size,
      visitors: dayVisitors === 0 && dayEvents.length > 0 ? null : dayVisitors,
      engagedSessions: engagedSids.size,
      leadSaved: dayEvents.filter((e) => e.event === 'lead_saved').length,
    };
  });
}

/**
 * Session entry attribution (decision 8), fixed at session start: only a
 * session's chronologically-first event ever carries `src` (see events.ts).
 * Requires `events` in ascending receivedAt order, which fetchRangeEvents
 * guarantees.
 */
function buildSourceTable(events: StoredAnalyticsEvent[]): SourceRow[] {
  const seenSessions = new Set<string>();
  const counts = new Map<string, number>();
  for (const e of events) {
    if (seenSessions.has(e.sid)) continue;
    seenSessions.add(e.sid);
    let source: string;
    if (e.src === 'campaign' && e.camp) source = `campaign:${e.camp}`;
    else if (e.src === 'referral' && e.ref) source = `referral:${e.ref}`;
    else source = 'direct'; // explicit src:'direct', a missing src, or a referral whose host was withheld
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([source, sessions]) => ({ source, sessions }))
    .sort((a, b) => b.sessions - a.sessions || a.source.localeCompare(b.source));
}

/**
 * Which pages were actually read, from page_view events only. Events stored
 * with route null (a path outside TRACKED_ROUTES — see events.ts) are skipped
 * rather than bucketed into an "other" row: the route was never recorded, so
 * there is nothing truthful to label such a row with.
 *
 * Unlike the source table there is no engagement column here — 'engagement'
 * is a session-level event and carries no per-page meaning.
 */
function buildPageTable(events: StoredAnalyticsEvent[]): PageRow[] {
  const pageviews = new Map<string, number>();
  const sessionsByRoute = new Map<string, Set<string>>();

  for (const e of events) {
    if (e.event !== 'page_view' || e.route === null) continue;
    pageviews.set(e.route, (pageviews.get(e.route) ?? 0) + 1);
    const sids = sessionsByRoute.get(e.route) ?? new Set<string>();
    sids.add(e.sid);
    sessionsByRoute.set(e.route, sids);
  }

  return Array.from(pageviews.entries())
    .map(([route, views]) => ({ route, pageviews: views, sessions: sessionsByRoute.get(route)?.size ?? 0 }))
    .sort((a, b) => b.pageviews - a.pageviews || a.route.localeCompare(b.route));
}

function buildCtaTable(events: StoredAnalyticsEvent[]): CtaRow[] {
  const counts = new Map<CtaId, number>(CTA_IDS.map((id) => [id, 0]));
  for (const e of events) {
    if (e.event === 'cta_click' && e.cta) counts.set(e.cta, (counts.get(e.cta) ?? 0) + 1);
  }
  // Zero-filled for every known CTA id (a table that only ever grows rows on
  // click would make "no clicks yet" indistinguishable from "no such CTA").
  return CTA_IDS.map((cta) => ({ cta, clicks: counts.get(cta) ?? 0 })).sort((a, b) => b.clicks - a.clicks);
}

function buildFunnel(events: StoredAnalyticsEvent[]): BookingFunnel {
  const formStarts = events.filter((e) => e.event === 'booking_form_start').length;

  const stepSids = new Map<BookingStep, Set<string>>(BOOKING_STEPS.map((s) => [s, new Set<string>()]));
  for (const e of events) {
    if (e.event === 'booking_step' && e.step) stepSids.get(e.step)!.add(e.sid);
  }
  const steps: FunnelStepRow[] = BOOKING_STEPS.map((step) => ({ step, sessions: stepSids.get(step)!.size }));

  const dialogOpenedSids = new Set(events.filter((e) => e.event === 'scheduling_dialog_opened').map((e) => e.sid));
  const leadSavedSids = new Set(events.filter((e) => e.event === 'lead_saved').map((e) => e.sid));
  const appointmentCompletedSids = new Set(events.filter((e) => e.event === 'appointment_completed').map((e) => e.sid));

  let savedSchedulerNotOpened = 0;
  for (const sid of leadSavedSids) if (!dialogOpenedSids.has(sid)) savedSchedulerNotOpened++;

  let calendlyScheduled = 0;
  for (const sid of dialogOpenedSids) if (appointmentCompletedSids.has(sid)) calendlyScheduled++;

  // Furthest step per session (-1 = form opened, no step yet), then keep only
  // sessions that never saved a lead or booked.
  const furthest = new Map<string, number>();
  for (const e of events) {
    if (e.event === 'booking_form_start' && !furthest.has(e.sid)) furthest.set(e.sid, -1);
    if (e.event === 'booking_step' && e.step) {
      furthest.set(e.sid, Math.max(furthest.get(e.sid) ?? -1, BOOKING_STEPS.indexOf(e.step)));
    }
  }
  const abandonedAt = new Array<number>(BOOKING_STEPS.length + 1).fill(0);
  for (const [sid, idx] of furthest) {
    if (leadSavedSids.has(sid) || appointmentCompletedSids.has(sid)) continue;
    abandonedAt[idx + 1] += 1;
  }
  const abandonment: BookingFunnel['abandonment'] = [
    { lastStep: 'started', sessions: abandonedAt[0] },
    ...BOOKING_STEPS.map((step, i) => ({ lastStep: step, sessions: abandonedAt[i + 1] })),
  ];

  return { formStarts, steps, dialogOpened: dialogOpenedSids.size, savedSchedulerNotOpened, calendlyScheduled, abandonment };
}

/** Groups events by session, keeping each session's events in receivedAt order (input is ascending). */
export function groupBySession(events: StoredAnalyticsEvent[]): Map<string, StoredAnalyticsEvent[]> {
  const out = new Map<string, StoredAnalyticsEvent[]>();
  for (const e of events) {
    const list = out.get(e.sid);
    if (list) list.push(e);
    else out.set(e.sid, [e]);
  }
  return out;
}

const INTERACTION_EVENTS: ReadonlySet<EventName> = new Set<EventName>([
  'engagement',
  'cta_click',
  'booking_form_start',
  'booking_step',
  'lead_saved',
  'scheduling_dialog_opened',
  'appointment_completed',
]);

/** A bounce: exactly one page_view in range and nothing that shows interaction. */
export function isBouncedSession(sessionEvents: StoredAnalyticsEvent[]): boolean {
  let views = 0;
  for (const e of sessionEvents) {
    if (INTERACTION_EVENTS.has(e.event)) return false;
    if (e.event === 'page_view') views += 1;
  }
  return views === 1;
}

/** Seconds from a session's first to last event in range. A floor: time on the last page is never seen. */
export function sessionSpanSeconds(sessionEvents: StoredAnalyticsEvent[]): number {
  if (sessionEvents.length < 2) return 0;
  return Math.round((Date.parse(sessionEvents[sessionEvents.length - 1].receivedAt) - Date.parse(sessionEvents[0].receivedAt)) / 1000);
}

function buildSessionDuration(bySession: Map<string, StoredAnalyticsEvent[]>): SessionDurationInfo {
  const spans: number[] = [];
  for (const list of bySession.values()) if (list.length >= 2) spans.push(sessionSpanSeconds(list));
  spans.sort((a, b) => a - b);
  const n = spans.length;
  const median = n === 0 ? null : n % 2 === 1 ? spans[(n - 1) / 2] : Math.round((spans[n / 2 - 1] + spans[n / 2]) / 2);
  const mean = n === 0 ? null : Math.round(spans.reduce((s, v) => s + v, 0) / n);
  return {
    measuredSessions: n,
    medianSeconds: median,
    meanSeconds: mean,
    note: 'Time between a session\'s first and last tracked event. A minimum: time spent on the last page is not recorded, and single-event sessions are left out.',
  };
}

// ---- Entry point -------------------------------------------------------------

export interface GetAnalyticsReportOptions {
  /** View test/preview traffic (mode:'test') in isolation instead of real business data. Defaults to false. */
  includeTest?: boolean;
  /** The dashboard's "Include test activity" toggle: real AND confirmed-test records together. Ignored when includeTest is set. */
  includeTestActivity?: boolean;
  /** Injectable clock for tests; defaults to `new Date()`. */
  now?: Date;
  /** Injectable env for the availability-change setting; defaults to process.env. */
  env?: Record<string, string | undefined>;
}

interface LeadsCount {
  /** Completed questionnaires — the authoritative inquiry total. */
  inquiries: number;
  /** Email-only captures still waiting on answers. Never an inquiry. */
  outstandingCaptures: number;
  /** People whose browser reported a booking, whether or not they went on to
   *  answer anything. Counted from the leads themselves rather than from the
   *  analytics event, which only exists when Calendly's message reaches the
   *  page and passes its origin check — a real booking can happen without it. */
  bookedLeads: number;
  /** Leads who answered every question on the questionnaire. */
  completedQuestionnaires: number;
  distinctContacts: number;
  repeatContactEmails: number;
  excludedTestLeads: number;
}

/** How many lead documents one window may hold before the count is no longer
 *  trustworthy. Orders of magnitude above this business's real volume. */
const LEADS_QUERY_LIMIT = 5000;

const REQUESTS_QUERY_LIMIT = 2000;
/** How far before the range a "saved without scheduler" session's browser is
 *  searched for an earlier booking. */
const SAVED_LINKAGE_LOOKBACK_DAYS = 30;
const COMPARISON_QUERY_LIMIT = 20_000;

async function readLeadsInWindow(startIso: string, endIso: string): Promise<Record<string, unknown>[]> {
  const rows = await fsQueryRange('leads', 'submittedAt', startIso, endIso, LEADS_QUERY_LIMIT);
  if (rows.length >= LEADS_QUERY_LIMIT) {
    // Refuse to report a number that is quietly capped.
    throw new Error('leads window exceeded the read cap');
  }
  return rows;
}

async function readRequestsInWindow(startIso: string, endIso: string): Promise<Record<string, unknown>[]> {
  const rows = await fsQueryRange(ALT_TIME_COLLECTION, 'createdAt', startIso, endIso, REQUESTS_QUERY_LIMIT);
  if (rows.length >= REQUESTS_QUERY_LIMIT) throw new Error('requests window exceeded the read cap');
  return rows;
}

function countLeads(rows: Record<string, unknown>[], excludedTestLeads: number, requestEmails: string[]): LeadsCount {
  const contacts = new Set<string>(requestEmails);
  const submissionsByEmail = new Map<string, number>();
  let inquiries = 0;
  let outstandingCaptures = 0;
  let bookedLeads = 0;
  let completedQuestionnaires = 0;
  for (const row of rows) {
    const email = typeof row.email === 'string' && row.email ? normalizeEmail(row.email) : '';
    if (email) contacts.add(email);
    if (row.bookedSelfReported === true) bookedLeads += 1;
    if (measureLeadCompleteness(row as Partial<LeadRecord>).complete) completedQuestionnaires += 1;
    if (row.type === 'capture') {
      // A capture whose person later completed the questionnaire is counted
      // by their full lead instead, never twice.
      if (row.status !== 'converted') outstandingCaptures += 1;
      continue;
    }
    // Everything else in this collection is a real submitted lead, including
    // historical documents written before `type` existed.
    inquiries += 1;
    if (email) submissionsByEmail.set(email, (submissionsByEmail.get(email) ?? 0) + 1);
  }
  const repeatContactEmails = [...submissionsByEmail.values()].filter((n) => n > 1).length;
  return { inquiries, outstandingCaptures, bookedLeads, completedQuestionnaires, distinctContacts: contacts.size, repeatContactEmails, excludedTestLeads };
}

function toReportEvents(events: StoredAnalyticsEvent[]): ReportEvent[] {
  return events.map((e) => ({
    event: e.event,
    id: e.id,
    sid: e.sid,
    receivedAt: e.receivedAt,
    cta: e.cta,
    vid: e.vid,
    bookingRef: e.bookingRef,
    reason: e.reason,
  }));
}

export async function getAnalyticsReport(range: ReportSpec, options: GetAnalyticsReportOptions = {}): Promise<AnalyticsReport> {
  const includeTest = options.includeTest ?? false;
  const view: TestView = includeTest ? 'test_only' : options.includeTestActivity ? 'with_test' : 'real';
  const now = options.now ?? new Date();
  const { window, startLabel, eventsLimit } = resolveReportWindow(range, now);

  // Leads (authoritative inquiries) and events (everything else) are
  // independent dependencies. One failing must not blank out the other —
  // that is what meta.degraded communicates instead of a bare 500.
  // The leads collection has no mode field: every lead in it is real
  // business data. A test-mode report therefore does not query it at all and
  // reports `inquiries`/`outstandingCaptures` as null (= not measured),
  // rather than putting the real business totals on a page labelled "not
  // real business data".
  //
  // One bounded read of the window, counted in memory, rather than two
  // filtered aggregation queries. A `type == ...` or `status == ...` filter
  // combined with the submittedAt range is a compound query, which Firestore
  // will not serve without a composite index — and until that index exists it
  // answers FAILED_PRECONDITION, which would have degraded the owner's single
  // most trusted number to "—" the moment this shipped. A plain range on one
  // field needs no index at all.
  //
  // Affordable because this collection is small: leads arrive a few a week,
  // and the cap below is far above any 30-day window this business produces.
  // If a window ever did exceed it the count would silently be low, so
  // hitting the cap is reported as a degraded leads dependency instead.
  //
  // Test activity: leads, requests and events confirmed as test (a marked test
  // device or session, or a record marked by an admin) are excluded from the
  // default view, included in the with-test view. Raw records are untouched.
  const [contextResult, leadsResult, requestsResult, eventsResult, liveResult, earliestResult] = await Promise.allSettled([
    loadTestContext(),
    includeTest ? Promise.resolve(null) : readLeadsInWindow(window.startIso, window.endIso),
    readRequestsInWindow(window.startIso, window.endIso),
    fetchRangeEventsRaw(window.startIso, window.endIso, eventsLimit),
    fetchLiveRaw(now),
    fetchTrackingStartDate(includeTest),
  ]);

  const degraded: Array<'leads' | 'events'> = [];

  // Test markers unavailable → fall back to build-time mode only, and say so.
  const ctx: TestContext = contextResult.status === 'fulfilled' ? contextResult.value : emptyTestContext();
  const testClassification: 'ok' | 'unavailable' = contextResult.status === 'fulfilled' ? 'ok' : 'unavailable';

  const leadRows = leadsResult.status === 'fulfilled' ? leadsResult.value : null;
  if (leadsResult.status === 'rejected') degraded.push('leads');
  const requestRows = requestsResult.status === 'fulfilled' ? requestsResult.value : null;

  // A lead or request confirmed as test makes its own analytics session a
  // test session, so the visit that produced it drops out with it.
  for (const row of [...(leadRows ?? []), ...(requestRows ?? [])]) {
    if (typeof row.sid === 'string' && isTestRecord(row, ctx)) ctx.sessionIds.add(row.sid);
  }

  let visibleRequests: RequestRow[] | null = null;
  let excludedTestRequests: number | null = null;
  if (requestRows) {
    visibleRequests = requestRows.filter((r) => keepForView(isTestRecord(r, ctx), view));
    excludedTestRequests = view === 'real' ? requestRows.length - visibleRequests.length : 0;
  }
  let leadsValue: LeadsCount | null = null;
  if (leadRows) {
    const visibleLeads = leadRows.filter((r) => keepForView(isTestRecord(r, ctx), view));
    const requestEmails = (visibleRequests ?? [])
      .map((r) => (typeof r.email === 'string' ? normalizeEmail(r.email) : ''))
      .filter(Boolean);
    leadsValue = countLeads(visibleLeads, view === 'real' ? leadRows.length - visibleLeads.length : 0, requestEmails);
  }
  const inquiries = leadsValue?.inquiries ?? null;
  const bookedLeads = leadsValue?.bookedLeads ?? null;
  const completedQuestionnaires = leadsValue?.completedQuestionnaires ?? null;
  const outstandingCaptures = leadsValue?.outstandingCaptures ?? null;

  const rawEvents = eventsResult.status === 'fulfilled' ? eventsResult.value.events : [];
  const events = classifyView(rawEvents, ctx, view);
  const eventsTruncated = eventsResult.status === 'fulfilled' ? eventsResult.value.truncated : false;
  if (eventsResult.status === 'rejected') degraded.push('events');

  if (degraded.includes('leads') && degraded.includes('events')) {
    const leadsReason = leadsResult.status === 'rejected' ? String(leadsResult.reason) : '';
    const eventsReason = eventsResult.status === 'rejected' ? String(eventsResult.reason) : '';
    throw new ServiceError(`analytics report: both leads and events queries failed (${leadsReason}; ${eventsReason})`);
  }

  const unavailable: Array<'live' | 'trackingStart'> = [];
  if (liveResult.status === 'rejected') unavailable.push('live');
  if (earliestResult.status === 'rejected') unavailable.push('trackingStart');

  const live = liveResult.status === 'fulfilled' ? buildLive(classifyView(liveResult.value, ctx, view), now) : { windowMinutes: 60 as const, startIso: '', endIso: '', pageviews: 0, sessions: 0, visitors: 0 };
  const trackingStartDate = earliestResult.status === 'fulfilled' ? earliestResult.value : null;

  const pageviews = events.filter((e) => e.event === 'page_view').length;
  const visitorCount = distinctVisitorIds(events).size;
  const sessionIds = new Set(events.map((e) => e.sid));
  const sessions = sessionIds.size;
  const engagedSids = new Set(events.filter((e) => e.event === 'engagement').map((e) => e.sid));
  const engagedVisitPct = sessions > 0 ? (engagedSids.size / sessions) * 100 : null;
  const bySession = groupBySession(events);
  let bouncedSessions = 0;
  for (const list of bySession.values()) if (isBouncedSession(list)) bouncedSessions += 1;
  const bounceRatePct = sessions > 0 ? (bouncedSessions / sessions) * 100 : null;
  const pagesPerSession = sessions > 0 ? pageviews / sessions : null;

  const appointmentsScheduled = events.filter((e) => e.event === 'appointment_completed').length;

  // Inquiry rate deliberately uses only the tracked cohort on BOTH sides —
  // never the authoritative `inquiries` total (which includes untracked
  // visitors) over a partial tracked-session denominator. See InquiryRateInfo.
  const trackedLeadSaved = events.filter((e) => e.event === 'lead_saved').length;
  const inquiryRate: InquiryRateInfo = {
    rate: sessions > 0 ? trackedLeadSaved / sessions : null,
    trackedLeadSaved,
    trackedSessions: sessions,
    note: 'Tracked-session cohort only: lead_saved events divided by distinct tracked sessions in range. Not the same as inquiries/sessions, since tracking can be blocked and inquiries is the authoritative, untracked-inclusive total.',
  };

  const dayWindows = buildDayWindows(startLabel, window.days);
  const dailyTrend = bucketDailyTrend(events, dayWindows);

  // Order matters. The range's own events decide 'ok' BEFORE trackingStartDate
  // is consulted, so the status can never contradict the numbers on screen:
  // trackingStartDate comes from a small earliest-events sample that is
  // filtered by mode after it is read (fsQueryRange takes no equality filter),
  // so it can come back null while this mode plainly has events in range —
  // which used to render "no events have ever been recorded" above non-zero
  // tiles. Events in range now always mean 'ok'.
  let status: ReportStatus;
  if (degraded.length > 0 || unavailable.length > 0) status = 'partial_failure';
  else if (events.length > 0) status = 'ok';
  else if (trackingStartDate === null) status = 'no_data_yet';
  else status = 'zero_activity';

  // ---- Booking availability (plan 017) ----
  const reportEvents = toReportEvents(events);
  const excludedEvents = view === 'real' ? rawEvents.filter((e) => isTestEvent(e, ctx)) : [];
  const bookingAvailability = buildBookingSection(reportEvents, visibleRequests, {
    events: excludedEvents.length,
    sessions: new Set(excludedEvents.map((e) => e.sid)).size,
    leads: leadsValue ? leadsValue.excludedTestLeads : null,
    requests: excludedTestRequests,
  });

  // "Saved without scheduler": was there an earlier booking we can link?
  const leadSidsBookedFirst = new Set(
    (leadRows ?? [])
      .filter((r) => r.type !== 'capture' && r.bookedSelfReported === true && typeof r.sid === 'string')
      .map((r) => r.sid as string),
  );
  let earlierBookings: ReportEvent[] = [];
  const unresolvedVids = unresolvedSavedBrowserIds(reportEvents, leadSidsBookedFirst);
  if (unresolvedVids.size > 0) {
    try {
      const lookbackStart = new Date(Date.parse(window.startIso) - SAVED_LINKAGE_LOOKBACK_DAYS * 86_400_000).toISOString();
      const { events: before } = await fetchRangeEventsRaw(lookbackStart, window.startIso, COMPARISON_QUERY_LIMIT);
      earlierBookings = toReportEvents(
        classifyView(before, ctx, view).filter((e) => e.event === 'appointment_completed' && e.vid && unresolvedVids.has(e.vid)),
      );
    } catch {
      earlierBookings = []; // unresolved sessions simply stay "unknown"
    }
  }
  const funnel = buildFunnel(events);
  funnel.savedLinkage = buildSavedLinkage(reportEvents, earlierBookings, leadSidsBookedFirst);

  const testEventIds = new Set(rawEvents.filter((e) => isTestEvent(e, ctx)).map((e) => e.id));
  const reviewFlags = buildReviewFlags(toReportEvents(rawEvents), (e) => testEventIds.has(e.id));

  const availabilityChange = await buildAvailabilityChange(options.env ?? process.env, now, window.days, ctx, view, trackingStartDate);

  return {
    meta: {
      status,
      generatedAt: now.toISOString(),
      trackingStartDate,
      testMode: includeTest,
      testView: view,
      testClassification,
      degraded,
      unavailable,
      eventsTruncated,
    },
    range: window,
    inquiries,
    outstandingCaptures,
    bookedLeads,
    completedQuestionnaires,
    inquiryRate,
    appointmentsScheduled,
    pageviews,
    sessions,
    visitors: visitorCount > 0 ? visitorCount : null,
    visitorBreakdown: buildVisitorBreakdown(events),
    engagedVisitPct,
    bouncedSessions,
    bounceRatePct,
    pagesPerSession,
    sessionDuration: buildSessionDuration(bySession),
    dailyTrend,
    sources: buildSourceTable(events),
    pages: buildPageTable(events),
    ctaClicks: buildCtaTable(events),
    funnel,
    live,
    distinctContacts: leadsValue?.distinctContacts ?? null,
    repeatContactEmails: leadsValue?.repeatContactEmails ?? null,
    bookingAvailability,
    reviewFlags,
    availabilityChange,
  };
}

/**
 * Equal-length windows either side of the explicitly configured change
 * instant (BOOKING_AVAILABILITY_CHANGED_AT), each as long as the selected
 * range. Counts only — no conversion rate, because requests and bookings in a
 * window are not the same people and can fall on different dates.
 */
async function buildAvailabilityChange(
  env: Record<string, string | undefined>,
  now: Date,
  days: number,
  ctx: TestContext,
  view: TestView,
  trackingStartDate: string | null,
): Promise<AvailabilityComparison> {
  const setting = readAvailabilityChange(env);
  if (!setting.ok) return { configured: false, envVar: AVAILABILITY_CHANGE_ENV, reason: setting.reason };
  const changedAt = setting.changedAt;
  const changedIso = changedAt.toISOString();
  if (changedAt.getTime() > now.getTime()) {
    return { configured: true, changedAt: changedIso, pending: true, before: null, after: null, trackingStartDate, truncated: false };
  }
  const span = days * 86_400_000;
  const beforeStart = new Date(changedAt.getTime() - span).toISOString();
  const afterEnd = new Date(Math.min(changedAt.getTime() + span, now.getTime())).toISOString();
  try {
    const [{ events, truncated }, requests] = await Promise.all([
      fetchRangeEventsRaw(beforeStart, afterEnd, COMPARISON_QUERY_LIMIT),
      readRequestsInWindow(beforeStart, afterEnd).catch(() => null),
    ]);
    const kept = toReportEvents(classifyView(events, ctx, view));
    const keptRequests = requests ? requests.filter((r) => keepForView(isTestRecord(r, ctx), view)) : null;
    return {
      configured: true,
      changedAt: changedIso,
      pending: false,
      before: buildPeriodCounts(kept, keptRequests, beforeStart, changedIso),
      after: buildPeriodCounts(kept, keptRequests, changedIso, afterEnd),
      trackingStartDate,
      truncated,
    };
  } catch {
    return { configured: true, changedAt: changedIso, pending: false, before: null, after: null, trackingStartDate, truncated: false };
  }
}
