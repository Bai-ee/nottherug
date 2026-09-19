'use client';

import type { ReportRange } from '@/lib/analytics/report';

const RANGE_LABELS: Record<ReportRange, string> = {
  today: 'today',
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
};

/**
 * Range totals for visits and page views. Both numbers already existed on the
 * report (AnalyticsReport.pageviews / .sessions, computed once over the whole
 * window) and were only visible inside the trend chart and the engaged-visit
 * denominator — this shows them plainly.
 *
 * Wording is deliberate: a session is a visit, not a person. The same person
 * visiting twice is two visits, so this is never labelled "visitors".
 */
export function VisitsStat({
  pageviews,
  sessions,
  range,
}: {
  pageviews: number;
  sessions: number;
  range: ReportRange;
}) {
  return (
    <section id="admin-analytics-visits-panel" className="analytics-panel analytics-stat-panel">
      <div className="analytics-label">Visits in Range</div>
      <div className="analytics-stat-row">
        <div>
          <div className="analytics-secondary-number">{sessions.toLocaleString('en-US')}</div>
          <div className="analytics-note">visits</div>
        </div>
        <div>
          <div className="analytics-secondary-number">{pageviews.toLocaleString('en-US')}</div>
          <div className="analytics-note">page views</div>
        </div>
      </div>
      <div className="analytics-note">
        Totals for {RANGE_LABELS[range]} · a visit is one browsing session, not one person — the same person returning
        counts again
      </div>
    </section>
  );
}
