// Per-session paths for the server-to-server stats API (app/api/stats/sessions).
// Reads the same bounded raw-event window as lib/analytics/report.ts and
// replays each session's events in order: where it came from, which pages and
// CTAs it touched, how far into booking it got. A session is one browser tab
// (lib/analytics/session.ts), never a person: there is no visitor id, so two
// sessions can be the same visitor and nothing here can say otherwise.

import {
  fetchRangeEvents,
  groupBySession,
  isBouncedSession,
  resolveReportWindow,
  sessionSpanSeconds,
  type RangeWindow,
  type ReportSpec,
  type StoredAnalyticsEvent,
} from '@/lib/analytics/report';
import { BOOKING_STEPS, type BookingStep } from '@/lib/analytics/events';

export const SESSIONS_DEFAULT_LIMIT = 25;
export const SESSIONS_MAX_LIMIT = 100;
/** Per-session trail cap; a longer trail is cut and flagged, never silently. */
const MAX_TRAIL_EVENTS = 40;

export interface SessionTrailStep {
  at: string;
  event: StoredAnalyticsEvent['event'];
  route: string | null;
  cta?: string;
  step?: BookingStep;
}

export interface SessionPath {
  sid: string;
  startedAt: string;
  endedAt: string;
  /** Seconds between first and last event in range; a floor (see report.ts sessionSpanSeconds). */
  durationSeconds: number;
  /** 'campaign:<slug>' | 'referral:<host>' | 'direct', or null when the session began before the window. */
  source: string | null;
  /** True when the session's attribution event is not in range, so its start (and source) are outside the window. */
  startedBeforeWindow: boolean;
  entryRoute: string | null;
  exitRoute: string | null;
  pageviews: number;
  engaged: boolean;
  bounced: boolean;
  outcome: {
    furthestBookingStep: 'started' | BookingStep | null;
    leadSaved: boolean;
    schedulerOpened: boolean;
    appointmentCompleted: boolean;
  };
  trail: SessionTrailStep[];
  trailTruncated: boolean;
}

export interface SessionPathsResult {
  site: 'nottherug.com';
  generatedAt: string;
  range: RangeWindow;
  /** Distinct sessions with any event in range. */
  totalSessions: number;
  /** Sessions in `sessions` (newest start first, up to the limit). */
  returned: number;
  sessions: SessionPath[];
  /** The bounded event read hit its ceiling: totals are floors and older sessions may be missing events. */
  eventsTruncated: boolean;
  note: string;
}

function sourceOf(first: StoredAnalyticsEvent): string | null {
  if (!first.src) return null;
  if (first.src === 'campaign' && first.camp) return `campaign:${first.camp}`;
  if (first.src === 'referral' && first.ref) return `referral:${first.ref}`;
  return 'direct';
}

function toPath(sid: string, list: StoredAnalyticsEvent[]): SessionPath {
  const views = list.filter((e) => e.event === 'page_view');
  let furthest = -2; // -2 = never touched booking, -1 = form opened only
  for (const e of list) {
    if (e.event === 'booking_form_start') furthest = Math.max(furthest, -1);
    if (e.event === 'booking_step' && e.step) furthest = Math.max(furthest, BOOKING_STEPS.indexOf(e.step));
  }
  const has = (name: StoredAnalyticsEvent['event']) => list.some((e) => e.event === name);
  const trail = list.slice(0, MAX_TRAIL_EVENTS).map((e) => {
    const step: SessionTrailStep = { at: e.receivedAt, event: e.event, route: e.route };
    if (e.cta) step.cta = e.cta;
    if (e.step) step.step = e.step;
    return step;
  });
  const source = sourceOf(list[0]);
  return {
    sid,
    startedAt: list[0].receivedAt,
    endedAt: list[list.length - 1].receivedAt,
    durationSeconds: sessionSpanSeconds(list),
    source,
    startedBeforeWindow: source === null,
    entryRoute: views[0]?.route ?? null,
    exitRoute: views[views.length - 1]?.route ?? null,
    pageviews: views.length,
    engaged: has('engagement'),
    bounced: isBouncedSession(list),
    outcome: {
      furthestBookingStep: furthest === -2 ? null : furthest === -1 ? 'started' : BOOKING_STEPS[furthest],
      leadSaved: has('lead_saved'),
      schedulerOpened: has('scheduling_dialog_opened'),
      appointmentCompleted: has('appointment_completed'),
    },
    trail,
    trailTruncated: list.length > MAX_TRAIL_EVENTS,
  };
}

export async function getSessionPaths(
  spec: ReportSpec,
  options: { limit?: number; now?: Date } = {}
): Promise<SessionPathsResult> {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? SESSIONS_DEFAULT_LIMIT, 1), SESSIONS_MAX_LIMIT);
  const { window, eventsLimit } = resolveReportWindow(spec, now);
  // Real business traffic only; test/preview sessions never reach this API.
  const { events, truncated } = await fetchRangeEvents(window.startIso, window.endIso, eventsLimit, false);
  const bySession = groupBySession(events);
  const paths = Array.from(bySession, ([sid, list]) => toPath(sid, list))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0))
    .slice(0, limit);
  return {
    site: 'nottherug.com',
    generatedAt: now.toISOString(),
    range: window,
    totalSessions: bySession.size,
    returned: paths.length,
    sessions: paths,
    eventsTruncated: truncated,
    note: 'A session is one browser tab, ending after 30 minutes idle. It is not a person: the same visitor on two tabs or two days is two sessions, and visitors cannot be told apart or linked to leads.',
  };
}
