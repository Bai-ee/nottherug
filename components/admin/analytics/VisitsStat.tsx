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
 *
 * Presentation: one of three stat cards in #admin-analytics-stats-row
 * (homepage .grid-3), numbers in the shared hero-stat-item row.
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
    <section id="admin-analytics-visits-panel" className="card card-pad">
      <div className="stamp-label">Visits in Range</div>
      <div id="admin-analytics-visits-stat-row" className="admin-analytics-hero-stats-row">
        <div className="hero-stat-item">
          <div className="hero-stat-num">{sessions.toLocaleString('en-US')}</div>
          <div className="hero-stat-label">Visits</div>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat-item">
          <div className="hero-stat-num">{pageviews.toLocaleString('en-US')}</div>
          <div className="hero-stat-label">Page Views</div>
        </div>
      </div>
      <p className="form-note">
        Totals for {RANGE_LABELS[range]} · a visit is one browsing session, not one person — the same person returning
        counts again
      </p>
    </section>
  );
}
