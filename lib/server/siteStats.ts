import { getAnalyticsReport, reportKeyOf, type AnalyticsReport, type ReportKey, type ReportSpec } from '@/lib/analytics/report';
import { getLeadStats } from '@/lib/leads/stats';
import { listBenchPeople } from '@/lib/server/bench';
import { BENCH_STAGES, type BenchStage } from '@/lib/bench/contract';

/**
 * One read-only snapshot of the business numbers for an outside reader
 * (the HITLOOP client MCP). Counts and trends only: no names, emails,
 * phones or free text leave the site through this shape.
 */
export interface SiteStats {
  site: 'nottherug.com';
  generatedAt: string;
  /** today | 7d | 30d | 24h (rolling, ending now) | custom (from/to dates; exact bounds in analytics.range). */
  range: ReportKey;
  /** The admin analytics report for the range (traffic, sources, pages, CTAs, booking funnel); null when it failed. */
  analytics: AnalyticsReport | null;
  leads: {
    timezone: string;
    today: number;
    yesterday: number;
    last7Days: number;
    last30Days: number;
    /** Open email-only captures, kept out of the lead counts above. */
    emailsCaptured: { yesterday: number; last7Days: number; last30Days: number };
    byDay: Array<{ date: string; count: number }>;
    bySource: Record<string, number>;
  };
  applicants: {
    total: number;
    byStage: Record<BenchStage, number>;
    last7Days: number;
    last30Days: number;
    onHold: number;
  };
  /** Plain-English meaning of each booking/lead metric. The numbers are different measures and are not expected to match. */
  definitions: typeof STAT_DEFINITIONS;
  /** Which dependency failed and was replaced with zeros, if any. */
  degraded: Array<'analytics' | 'leads' | 'applicants'>;
}

/**
 * What each booking/lead number counts. Booking figures come from four
 * different sources (lead documents vs. analytics events vs. per-session
 * funnel rows), so they legitimately differ; an outside reader should quote
 * them with these definitions rather than reconcile them.
 */
export const STAT_DEFINITIONS = {
  note: 'The booking and lead numbers measure different things from different sources, so they are not expected to match each other.',
  bookedLeads: 'Lead records whose visitor reported (self-reported, via their browser) that they booked a Meet & Greet; counts people, whether or not they finished the questionnaire.',
  appointmentsScheduled: 'Number of appointment_completed analytics events, fired only when a verified Calendly booking message reaches the page; can miss a real booking if that message never arrives.',
  calendlyScheduled: 'Sessions that both opened the scheduling dialog and recorded an appointment_completed event (per-session, from the funnel).',
  funnelScheduleStep: 'Sessions that reached the "schedule" booking step, meaning the scheduler was shown after the questionnaire or from the welcome modal; this step was not reported from the welcome modal before this fix, so older ranges undercount it and it is not a count of bookings.',
  inquiries: 'Completed questionnaires (leads who answered every question); the authoritative inquiry total, excluding email-only captures.',
  outstandingCaptures: 'Email-only captures still waiting on questionnaire answers; never counted as inquiries.',
  completedQuestionnaires: 'Leads who answered every question on the questionnaire.',
  leadsToday: 'Leads submitted today in the site timezone (leads.timezone), excluding email-only captures.',
  sessions: 'Distinct browser-tab sessions with any tracked event in range. A session ends after 30 minutes idle. One visitor can have many sessions; see visitors.',
  visitors: 'Unique visitors: distinct browsers in range, each identified by a random id kept in its local storage (no cookie, nothing personal). A browser, not a person: the same person on a phone and a laptop counts twice, and clearing browser storage makes them new. Counted only from when visitor tracking began; null for ranges before that, and a range that straddles the start counts only the later part (compare sessionsWithVisitorId to sessions).',
  visitorBreakdown: 'New visitors had their first-ever session in this range; returning visitors had visited before their first session in range.',
  sessionsPerVisitor: 'Sessions with a visitor id divided by unique visitors in range.',
  bounceRate: 'Sessions that viewed exactly one page and recorded no engagement (15 seconds on page or half the page scrolled), CTA click or booking event, as a percentage of sessions.',
  pagesPerSession: 'Page views divided by sessions in range.',
  sessionDuration: 'Time between a session\'s first and last tracked event; a minimum, since time on the last page is not recorded. Single-event sessions are left out of the median and mean.',
  abandonment: 'Sessions that opened the booking form but neither saved a lead nor booked, by the furthest step reached (started = form opened, no step completed).',
  rollingRange: 'range 24h is the 24 hours ending at generatedAt; its daily trend shows only the in-window part of each date. Custom ranges are whole New York calendar dates, at most 90 days, within the 13-month event retention.',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function emptyStages(): Record<BenchStage, number> {
  return Object.fromEntries(BENCH_STAGES.map((s) => [s, 0])) as Record<BenchStage, number>;
}

export async function getSiteStats(range: ReportSpec, now = new Date()): Promise<SiteStats> {
  const degraded: SiteStats['degraded'] = [];
  const [analyticsResult, leadsResult, peopleResult] = await Promise.allSettled([
    getAnalyticsReport(range, { now }),
    getLeadStats(30),
    listBenchPeople(),
  ]);

  let analytics: AnalyticsReport | null = null;
  if (analyticsResult.status === 'fulfilled') {
    analytics = analyticsResult.value;
  } else {
    console.error('[stats] analytics report failed', analyticsResult.reason instanceof Error ? analyticsResult.reason.message : 'unknown');
    degraded.push('analytics');
  }

  let leads: SiteStats['leads'];
  if (leadsResult.status === 'fulfilled') {
    const s = leadsResult.value;
    leads = {
      timezone: s.timezone,
      today: s.today.count,
      yesterday: s.yesterday.count,
      last7Days: s.totals.last7Days,
      last30Days: s.totals.last30Days,
      emailsCaptured: s.emailsCaptured,
      byDay: s.byDay,
      bySource: s.bySource,
    };
  } else {
    console.error('[stats] lead stats failed', leadsResult.reason instanceof Error ? leadsResult.reason.message : 'unknown');
    degraded.push('leads');
    leads = {
      timezone: 'America/New_York',
      today: 0,
      yesterday: 0,
      last7Days: 0,
      last30Days: 0,
      emailsCaptured: { yesterday: 0, last7Days: 0, last30Days: 0 },
      byDay: [],
      bySource: {},
    };
  }

  const applicants: SiteStats['applicants'] = { total: 0, byStage: emptyStages(), last7Days: 0, last30Days: 0, onHold: 0 };
  if (peopleResult.status === 'fulfilled') {
    const cutoff7 = now.getTime() - 7 * DAY_MS;
    const cutoff30 = now.getTime() - 30 * DAY_MS;
    for (const p of peopleResult.value) {
      applicants.total += 1;
      if (p.stage in applicants.byStage) applicants.byStage[p.stage] += 1;
      if (p.onHold) applicants.onHold += 1;
      const created = Date.parse(p.createdAt);
      if (created >= cutoff7) applicants.last7Days += 1;
      if (created >= cutoff30) applicants.last30Days += 1;
    }
  } else {
    console.error('[stats] applicants read failed', peopleResult.reason instanceof Error ? peopleResult.reason.message : 'unknown');
    degraded.push('applicants');
  }

  return { site: 'nottherug.com', generatedAt: now.toISOString(), range: reportKeyOf(range), analytics, leads, applicants, definitions: STAT_DEFINITIONS, degraded };
}
