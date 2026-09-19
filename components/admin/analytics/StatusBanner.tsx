'use client';

import type { AnalyticsReportMeta } from '@/lib/analytics/report';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' });

const DEGRADED_LABEL: Record<'leads' | 'events', string> = {
  leads: 'inquiry totals',
  events: 'visit and traffic data',
};

/**
 * Tracking-off banner. Decision text (plans/003-admin-dashboard-and-tracking.md
 * A5 honesty rules): "Tracking is off unless NEXT_PUBLIC_ANALYTICS_ENABLED is
 * set. When it is off, say so plainly at the top — otherwise an owner reads
 * honest zeros as 'my website is dead.'" Always rendered when tracking is
 * off, independent of load state, because the zeros below it are honest but
 * meaningless without this context.
 */
export function TrackingDisabledBanner() {
  return (
    <div id="admin-analytics-tracking-disabled-banner" className="analytics-callout analytics-callout-warn">
      Tracking is off right now. This does not mean the website has no visitors — it means visits are not being
      recorded yet. Numbers below (if any) are from before tracking was turned off.
    </div>
  );
}

export function LoadingBanner() {
  return <div id="admin-analytics-loading-banner" className="analytics-callout">Loading analytics…</div>;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div id="admin-analytics-error-banner" className="analytics-callout analytics-callout-error">
      <span>Could not load analytics: {message}</span>
      <button type="button" className="analytics-retry-btn" onClick={onRetry}>Retry</button>
    </div>
  );
}

/**
 * Renders the report's meta.status distinctly — "no data yet" and "zero
 * visitors" must never look the same (A5 honesty rules). `ok` gets no
 * callout at all: a quiet page is the correct state when there is real
 * activity to show.
 */
export function ReportMetaBanner({ meta }: { meta: AnalyticsReportMeta }) {
  return (
    <div id="admin-analytics-meta-banner" className="analytics-meta-banner">
      {meta.trackingStartDate ? (
        <div className="analytics-note">Tracking starts on {DATE_FORMAT.format(new Date(meta.trackingStartDate))}.</div>
      ) : null}

      {meta.status === 'no_data_yet' ? (
        <div id="admin-analytics-no-data-callout" className="analytics-callout">
          Tracking has not started yet — no events have been recorded. Lead totals above may predate tracking and do
          not imply matching traffic history.
        </div>
      ) : null}

      {meta.status === 'zero_activity' ? (
        <div id="admin-analytics-zero-activity-callout" className="analytics-callout">
          No activity recorded in the selected window. Tracking is on; this window is simply quiet.
        </div>
      ) : null}

      {meta.status === 'partial_failure' ? (
        <div id="admin-analytics-partial-failure-callout" className="analytics-callout analytics-callout-warn">
          Some data could not be loaded this time ({meta.degraded.map((d) => DEGRADED_LABEL[d]).join(', ')}). Figures
          shown for the rest are real, not fabricated to fill the gap.
        </div>
      ) : null}

      {meta.eventsTruncated ? (
        <div id="admin-analytics-truncated-callout" className="analytics-callout analytics-callout-warn">
          This window hit its event read limit — the figures below are a floor, not an exact total.
        </div>
      ) : null}

      {meta.testMode ? (
        <div id="admin-analytics-test-mode-callout" className="analytics-callout">
          Showing test/preview traffic only. This is not real business data.
        </div>
      ) : null}
    </div>
  );
}
