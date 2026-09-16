import { BOOKING_STEPS, LIVE_CTA_IDS } from '@/lib/analytics/events';
import type { AnalyticsReport, ReportRange } from '@/lib/analytics/report';

const RANGE_DAYS: Record<ReportRange, number> = { today: 1, '7d': 7, '30d': 30 };

/**
 * A fully-shaped report with every number at zero.
 *
 * The dashboard renders this whenever it has no real report — before the first
 * fetch resolves, and when the request fails. The alternative (rendering
 * nothing until data arrives) meant the owner saw a lone banner sitting in an
 * empty page and could not tell a broken dashboard from an un-synced one, or
 * see what the page will even look like once tracking is on.
 *
 * This is NOT fabricated data and must never become it: every value here is a
 * real zero or an empty list, and the caller is responsible for rendering the
 * banner that says why the page is not synced. Zeros with a visible "not
 * synced" explanation are honest; zeros presented as measurements are not.
 */
export function buildEmptyReport(range: ReportRange, nowIso = new Date().toISOString()): AnalyticsReport {
  return {
    meta: {
      // 'no_data_yet' is the accurate status for a page that has never
      // received a report: it is what the reporting service itself returns
      // when no events exist, and it renders as "tracking has not started"
      // rather than "we measured nothing".
      status: 'no_data_yet',
      generatedAt: nowIso,
      trackingStartDate: null,
      testMode: false,
      degraded: [],
      eventsTruncated: false,
    },
    range: {
      key: range,
      startIso: nowIso,
      endIso: nowIso,
      days: RANGE_DAYS[range],
      timezone: 'America/New_York',
    },

    inquiries: 0,
    inquiryRate: {
      rate: null,
      trackedLeadSaved: 0,
      trackedSessions: 0,
      note: 'No tracked sessions yet, so a rate cannot be calculated.',
    },
    appointmentsScheduled: 0,

    pageviews: 0,
    sessions: 0,
    engagedVisitPct: null,

    dailyTrend: [],
    sources: [],

    // Zero-filled for every live CTA id, matching what the reporting service
    // returns for a quiet period. As of the locked 16-id contract, CTA_IDS and
    // LIVE_CTA_IDS are the same list (lib/analytics/events.ts) — the nine
    // stale "reserved" ids that used to need filtering out here were removed
    // from the contract entirely, not just excluded from this zero-fill.
    ctaClicks: LIVE_CTA_IDS.map((cta) => ({ cta, clicks: 0 })),

    funnel: {
      formStarts: 0,
      steps: BOOKING_STEPS.map((step) => ({ step, sessions: 0 })),
      dialogOpened: 0,
      phoneConsultPath: 0,
      calendlyScheduled: 0,
    },

    live: {
      windowMinutes: 60,
      startIso: nowIso,
      endIso: nowIso,
      pageviews: 0,
      sessions: 0,
    },
  };
}
