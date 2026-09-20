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

import { fsQueryRange, fsQueryRangeCount } from '@/lib/server/firestoreRest';
import { ServiceError } from '@/lib/server/errors';
import {
  BOOKING_STEPS,
  CTA_IDS,
  EVENTS_COLLECTION,
  isBookingStep,
  isCampaignSlug,
  isCtaId,
  isEventName,
  isOpaqueId,
  isTrackedRoute,
  type BookingStep,
  type CampaignSlug,
  type CtaId,
  type EventName,
  type SourceKind,
  type TrackedRoute,
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

export interface RangeWindow {
  key: ReportRange;
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
   * dialog — i.e. chose the phone-consultation path. This is a completed
   * inquiry, not abandonment (decision 9 / measurement table: "Separate the
   * phone-consultation path so skipping Calendly is not reported as
   * abandonment").
   */
  phoneConsultPath: number;
  /** Distinct sessions that opened the dialog AND produced a verified appointment_completed. */
  calendlyScheduled: number;
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
}

/**
 * 'ok' — normal, has activity.
 * 'zero_activity' — tracking has recorded events before, but none in this window.
 * 'no_data_yet' — no event has ever been recorded (trackingStartDate is null); do not imply history.
 * 'partial_failure' — at least one dependency (leads or events) failed; some fields are degraded, not fabricated.
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
   * Null in exactly two cases the UI must tell apart:
   *  - the leads query failed (meta.degraded includes 'leads');
   *  - this is a test-mode report (meta.testMode). Leads carry no mode field,
   *    so real inquiries cannot be split out of a test-mode view, and showing
   *    the real total under a "not real business data" banner would be a lie.
   *    Not measured is the only honest answer there.
   */
  inquiries: number | null;
  inquiryRate: InquiryRateInfo;

  /** Count of appointment_completed events (deduplicated by event id). Reported separately — never summed with inquiries (decision 7). */
  appointmentsScheduled: number;

  /** Deduplicated page_view event count for the range. */
  pageviews: number;
  /** Distinct sid count for the range. Sessions/visits, never "unique visitors" or "people". */
  sessions: number;
  /** Sessions with at least one 'engagement' event, over total sessions, as a 0-100 percentage. Replaces bounce rate (decision 2). Null when there are no sessions. */
  engagedVisitPct: number | null;

  dailyTrend: DailyTrendPoint[];
  sources: SourceRow[];
  /** Per-route page_view aggregation, sorted by pageviews desc. No engagement column: 'engagement' is a session-level event with no route of its own. */
  pages: PageRow[];
  ctaClicks: CtaRow[];
  funnel: BookingFunnel;

  /** Rolling 60 minutes ending now, independent of `range` (decision 3: "alongside", not a day bucket). */
  live: LiveTile;
}

// ---- Internal stored-event shape ------------------------------------------
// Deliberately NOT the wire AnalyticsEvent type: the ingestion route
// (app/api/track/route.ts) stores the client clock as an advisory `clientTs`
// and never persists `ts` at all (receivedAt is the sole ordering authority —
// see that route's storeOneEvent comment). Reporting has no use for either
// timestamp, so this shape simply omits it rather than fabricating one.

interface StoredAnalyticsEvent {
  event: EventName;
  id: string;
  sid: string;
  route: TrackedRoute | null;
  cta?: CtaId;
  step?: BookingStep;
  src?: SourceKind;
  ref?: string;
  camp?: CampaignSlug;
  mode?: 'test';
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

  // Same per-event-type gating as the wire validator, so a corrupted document
  // cannot attach e.g. a cta to a page_view and skew the CTA click table.
  if (raw.event === 'cta_click' && isCtaId(raw.cta)) out.cta = raw.cta;
  if (raw.event === 'booking_step' && isBookingStep(raw.step)) out.step = raw.step;

  if (raw.src === 'campaign' || raw.src === 'referral' || raw.src === 'direct') {
    out.src = raw.src;
    if (raw.src === 'campaign' && isCampaignSlug(raw.camp)) out.camp = raw.camp;
    if (raw.src === 'referral' && typeof raw.ref === 'string') out.ref = raw.ref;
  }

  if (raw.mode === 'test') out.mode = 'test';

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

function computeRangeWindow(range: ReportRange, now: Date): RangeWindow {
  const todayLabel = isoDateInTZ(now, TZ);
  const days = RANGE_DAYS[range];
  const startLabel = shiftLabel(todayLabel, -(days - 1));
  const endExclusiveLabel = shiftLabel(todayLabel, 1); // start of "tomorrow" (NY) — half-open upper bound
  return {
    key: range,
    startIso: nyMidnightUtc(startLabel).toISOString(),
    endIso: nyMidnightUtc(endExclusiveLabel).toISOString(),
    days,
    timezone: TZ,
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
const LIVE_QUERY_LIMIT = 1000;
const EARLIEST_SAMPLE_LIMIT = 25;

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
async function fetchRangeEvents(
  startIso: string,
  endIso: string,
  limit: number,
  includeTest: boolean
): Promise<{ events: StoredAnalyticsEvent[]; truncated: boolean }> {
  const raw = await fsQueryRange(EVENTS_COLLECTION, 'receivedAt', startIso, endIso, limit, 'ASCENDING');
  const truncated = raw.length >= limit;
  const stored = dedupeById(raw.map(toStoredEvent).filter((e): e is StoredAnalyticsEvent => e !== null));
  return { events: filterMode(stored, includeTest), truncated };
}

async function fetchLive(now: Date, includeTest: boolean): Promise<LiveTile> {
  const windowMs = 60 * 60 * 1000;
  const startIso = new Date(now.getTime() - windowMs).toISOString();
  const endIso = now.toISOString();
  const raw = await fsQueryRange(EVENTS_COLLECTION, 'receivedAt', startIso, endIso, LIVE_QUERY_LIMIT, 'ASCENDING');
  const stored = filterMode(dedupeById(raw.map(toStoredEvent).filter((e): e is StoredAnalyticsEvent => e !== null)), includeTest);
  return {
    windowMinutes: 60,
    startIso,
    endIso,
    pageviews: stored.filter((e) => e.event === 'page_view').length,
    sessions: new Set(stored.map((e) => e.sid)).size,
  };
}

const EPOCH_ISO = '1970-01-01T00:00:00.000Z';
const FAR_FUTURE_ISO = '9999-12-31T23:59:59.999Z';

/**
 * Earliest event ever recorded, in the requested mode — powers "Tracking
 * starts on [date]" so the UI never implies traffic history before
 * collection began. Bounded by a small result-row ceiling (an indexed
 * ascending read), not by narrowing the date range — there is no way to know
 * where the earliest event is without asking.
 */
async function fetchTrackingStartDate(includeTest: boolean): Promise<string | null> {
  const raw = await fsQueryRange(EVENTS_COLLECTION, 'receivedAt', EPOCH_ISO, FAR_FUTURE_ISO, EARLIEST_SAMPLE_LIMIT, 'ASCENDING');
  const stored = filterMode(dedupeById(raw.map(toStoredEvent).filter((e): e is StoredAnalyticsEvent => e !== null)), includeTest);
  return stored.length > 0 ? stored[0].receivedAt : null;
}

// ---- Metric builders --------------------------------------------------------

function bucketDailyTrend(events: StoredAnalyticsEvent[], windows: DayWindow[]): DailyTrendPoint[] {
  return windows.map((w) => {
    const dayEvents = events.filter((e) => e.receivedAt >= w.startIso && e.receivedAt < w.endIso);
    const engagedSids = new Set(dayEvents.filter((e) => e.event === 'engagement').map((e) => e.sid));
    return {
      date: w.date,
      pageviews: dayEvents.filter((e) => e.event === 'page_view').length,
      sessions: new Set(dayEvents.map((e) => e.sid)).size,
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

  let phoneConsultPath = 0;
  for (const sid of leadSavedSids) if (!dialogOpenedSids.has(sid)) phoneConsultPath++;

  let calendlyScheduled = 0;
  for (const sid of dialogOpenedSids) if (appointmentCompletedSids.has(sid)) calendlyScheduled++;

  return { formStarts, steps, dialogOpened: dialogOpenedSids.size, phoneConsultPath, calendlyScheduled };
}

// ---- Entry point -------------------------------------------------------------

export interface GetAnalyticsReportOptions {
  /** View test/preview traffic (mode:'test') in isolation instead of real business data. Defaults to false. */
  includeTest?: boolean;
  /** Injectable clock for tests; defaults to `new Date()`. */
  now?: Date;
}

export async function getAnalyticsReport(range: ReportRange, options: GetAnalyticsReportOptions = {}): Promise<AnalyticsReport> {
  const includeTest = options.includeTest ?? false;
  const now = options.now ?? new Date();
  const window = computeRangeWindow(range, now);

  // Leads (authoritative inquiries) and events (everything else) are
  // independent dependencies. One failing must not blank out the other —
  // that is what meta.degraded communicates instead of a bare 500.
  // The leads collection has no mode field: every lead in it is a real
  // inquiry. A test-mode report therefore does not query it at all and
  // reports `inquiries: null` (= not measured), rather than putting the real
  // business total on a page labelled "not real business data".
  const leadsQuery = includeTest
    ? Promise.resolve<number | null>(null)
    : fsQueryRangeCount('leads', 'submittedAt', window.startIso, window.endIso);

  const [leadsResult, eventsResult, liveResult, earliestResult] = await Promise.allSettled([
    leadsQuery,
    fetchRangeEvents(window.startIso, window.endIso, EVENTS_QUERY_LIMIT[range], includeTest),
    fetchLive(now, includeTest),
    fetchTrackingStartDate(includeTest),
  ]);

  const degraded: Array<'leads' | 'events'> = [];

  const inquiries = leadsResult.status === 'fulfilled' ? leadsResult.value : null;
  if (leadsResult.status === 'rejected') degraded.push('leads');

  const events = eventsResult.status === 'fulfilled' ? eventsResult.value.events : [];
  const eventsTruncated = eventsResult.status === 'fulfilled' ? eventsResult.value.truncated : false;
  if (eventsResult.status === 'rejected') degraded.push('events');

  if (degraded.includes('leads') && degraded.includes('events')) {
    const leadsReason = leadsResult.status === 'rejected' ? String(leadsResult.reason) : '';
    const eventsReason = eventsResult.status === 'rejected' ? String(eventsResult.reason) : '';
    throw new ServiceError(`analytics report: both leads and events queries failed (${leadsReason}; ${eventsReason})`);
  }

  const live = liveResult.status === 'fulfilled' ? liveResult.value : { windowMinutes: 60 as const, startIso: '', endIso: '', pageviews: 0, sessions: 0 };
  const trackingStartDate = earliestResult.status === 'fulfilled' ? earliestResult.value : null;

  const pageviews = events.filter((e) => e.event === 'page_view').length;
  const sessionIds = new Set(events.map((e) => e.sid));
  const sessions = sessionIds.size;
  const engagedSids = new Set(events.filter((e) => e.event === 'engagement').map((e) => e.sid));
  const engagedVisitPct = sessions > 0 ? (engagedSids.size / sessions) * 100 : null;

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

  const todayLabel = isoDateInTZ(now, TZ);
  const dayWindows = buildDayWindows(shiftLabel(todayLabel, -(window.days - 1)), window.days);
  const dailyTrend = bucketDailyTrend(events, dayWindows);

  // Order matters. The range's own events decide 'ok' BEFORE trackingStartDate
  // is consulted, so the status can never contradict the numbers on screen:
  // trackingStartDate comes from a small earliest-events sample that is
  // filtered by mode after it is read (fsQueryRange takes no equality filter),
  // so it can come back null while this mode plainly has events in range —
  // which used to render "no events have ever been recorded" above non-zero
  // tiles. Events in range now always mean 'ok'.
  let status: ReportStatus;
  if (degraded.length > 0) status = 'partial_failure';
  else if (events.length > 0) status = 'ok';
  else if (trackingStartDate === null) status = 'no_data_yet';
  else status = 'zero_activity';

  return {
    meta: {
      status,
      generatedAt: now.toISOString(),
      trackingStartDate,
      testMode: includeTest,
      degraded,
      eventsTruncated,
    },
    range: window,
    inquiries,
    inquiryRate,
    appointmentsScheduled,
    pageviews,
    sessions,
    engagedVisitPct,
    dailyTrend,
    sources: buildSourceTable(events),
    pages: buildPageTable(events),
    ctaClicks: buildCtaTable(events),
    funnel: buildFunnel(events),
    live,
  };
}
