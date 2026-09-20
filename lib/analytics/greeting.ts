import type { AnalyticsReport } from './report';

/**
 * The line that greets the owner at the top of /admin/dashboard, in place of
 * a fixed "Site Performance" title. It is a reading of the report, not
 * decoration, so every branch below is something the numbers actually say and
 * the first true one wins — best news first.
 *
 * Deliberately at most four words: it is a greeting, not a summary. The
 * panels underneath carry the detail, and a sentence long enough to explain
 * itself would be competing with them.
 *
 * Pure and deterministic — no clock, no randomness — so the same report
 * always greets the owner the same way and the tests can pin each branch.
 */
export function buildDashboardGreeting(report: AnalyticsReport): string {
  const { meta, appointmentsScheduled, inquiries, sessions, engagedVisitPct, dailyTrend } = report;

  if (meta.status === 'partial_failure') return 'Some numbers are missing';
  if (meta.status === 'no_data_yet') return 'Nothing tracked yet';

  // Best news first: a booked walk outranks everything else on the page.
  if (appointmentsScheduled > 0) return 'A walk got booked';
  if ((inquiries ?? 0) > 0) return 'Someone asked about walks';
  if (report.inquiryRate.trackedLeadSaved > 0) return 'An inquiry came in';

  if (sessions === 0) return 'Quiet as a mouse';

  // Is the newest day beating the days before it?
  if (isClimbing(dailyTrend.map((d) => d.sessions))) return 'Traffic is picking up';

  if (engagedVisitPct !== null && engagedVisitPct >= 50) return 'Visitors are sticking around';
  if (sessions >= 25) return 'People are looking around';

  return 'Steady as she goes';
}

/** True when the last day is above the average of the days before it. */
function isClimbing(values: number[]): boolean {
  if (values.length < 3) return false;
  const last = values[values.length - 1];
  const earlier = values.slice(0, -1);
  const average = earlier.reduce((sum, v) => sum + v, 0) / earlier.length;
  return last > average;
}
