'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';
import { isAnalyticsEnabled } from '@/lib/analytics/track';
import type { AnalyticsReport, ReportRange } from '@/lib/analytics/report';
import { RangeSelector } from '@/components/admin/analytics/RangeSelector';
import { InquiryHeadline } from '@/components/admin/analytics/InquiryHeadline';
import { LiveTile } from '@/components/admin/analytics/LiveTile';
import { TrendSparkline } from '@/components/admin/analytics/TrendSparkline';
import { EngagedVisitStat } from '@/components/admin/analytics/EngagedVisitStat';
import { AppointmentsStat } from '@/components/admin/analytics/AppointmentsStat';
import { SourceTable } from '@/components/admin/analytics/SourceTable';
import { CtaTable } from '@/components/admin/analytics/CtaTable';
import { FunnelPanel } from '@/components/admin/analytics/FunnelPanel';
import { TrackingDisabledBanner, LoadingBanner, ErrorBanner, ReportMetaBanner } from '@/components/admin/analytics/StatusBanner';
import { buildEmptyReport } from '@/components/admin/analytics/emptyReport';

/**
 * Owner-facing site-performance dashboard — plan A5
 * (plans/003-admin-dashboard-and-tracking.md), built against the locked A0
 * decision table. Everything the former landing page did (Daily Brief
 * generation/history/preview) moved to /admin/dashboard/brief; nothing here
 * duplicates that. This page only reads app/api/admin/analytics.
 */
function AdminAnalyticsDashboardContent({
  email,
  getToken,
  signOut,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
}) {
  const [range, setRange] = useState<ReportRange>('7d');
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // Bumped by the Retry button to re-run the effect below without
  // duplicating the fetch body in a second callback (see leads page for the
  // same pattern and why: an effect calling a named function that sets state
  // trips React's set-state-in-effect check).
  const [retryKey, setRetryKey] = useState(0);

  const abortSignal = useAbortSignal();

  useEffect(() => {
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await adminFetch<AnalyticsReport>(
          `/api/admin/analytics?range=${range}`,
          getToken,
          { cache: 'no-store', signal: abortSignal },
        );
        setReport(data);
        setLastRefreshed(new Date());
      } catch (err) {
        if (isAbortError(err)) return;
        setError(err instanceof Error ? err.message : 'Could not load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, [range, getToken, abortSignal, retryKey]);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  const trackingEnabled = isAnalyticsEnabled();
  const degradedLeads = !!report?.meta.degraded.includes('leads');

  // Always render the full dashboard, even with nothing to show. Before the
  // first fetch resolves — and when it fails outright — fall back to a
  // zero-filled report so every tile, table and funnel row is still visible.
  // Hiding the page behind a banner left the owner unable to tell "not synced
  // yet" from "broken", and unable to see the layout at all until tracking was
  // switched on. The banners above still say why the numbers are zero; these
  // zeros are never presented as measurements.
  const view = report ?? buildEmptyReport(range);
  const synced = report !== null;

  return (
    <AdminShell
      title="Not The Rug · Site Performance"
      email={email}
      onSignOut={signOut}
      lastRefreshed={lastRefreshed}
    >
      <div id="admin-analytics-content" className="analytics-view">
        <div className="analytics-page">

          {!trackingEnabled ? <TrackingDisabledBanner /> : null}

          {loading && !report ? <LoadingBanner /> : null}
          {error ? <ErrorBanner message={error} onRetry={retry} /> : null}

          {synced ? <ReportMetaBanner meta={view.meta} /> : null}

          <InquiryHeadline
            inquiries={view.inquiries}
            inquiryRate={view.inquiryRate}
            degraded={degradedLeads}
          />

          <LiveTile live={view.live} />

          <RangeSelector value={range} onChange={setRange} disabled={loading} />

          <TrendSparkline points={view.dailyTrend} />

          <EngagedVisitStat engagedVisitPct={view.engagedVisitPct} sessions={view.sessions} />

          <AppointmentsStat appointmentsScheduled={view.appointmentsScheduled} />

          <SourceTable sources={view.sources} />

          <CtaTable ctaClicks={view.ctaClicks} />

          <FunnelPanel funnel={view.funnel} />

        </div>
      </div>
    </AdminShell>
  );
}

export default function AdminAnalyticsDashboardPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>
        {(session) => (
          <AdminAnalyticsDashboardContent email={session.email} getToken={session.getToken} signOut={session.signOut} />
        )}
      </AdminGuard>
    </AdminSessionProvider>
  );
}
