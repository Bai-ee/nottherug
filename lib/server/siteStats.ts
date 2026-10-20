import { getAnalyticsReport, type AnalyticsReport, type ReportRange } from '@/lib/analytics/report';
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
  range: ReportRange;
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
  /** Which dependency failed and was replaced with zeros, if any. */
  degraded: Array<'analytics' | 'leads' | 'applicants'>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function emptyStages(): Record<BenchStage, number> {
  return Object.fromEntries(BENCH_STAGES.map((s) => [s, 0])) as Record<BenchStage, number>;
}

export async function getSiteStats(range: ReportRange, now = new Date()): Promise<SiteStats> {
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

  return { site: 'nottherug.com', generatedAt: now.toISOString(), range, analytics, leads, applicants, degraded };
}
