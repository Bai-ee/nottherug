'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';
import { isAnalyticsEnabled } from '@/lib/analytics/track';
import type { AnalyticsReport, ReportRange } from '@/lib/analytics/report';
import { RangeSelector } from '@/components/admin/analytics/RangeSelector';
import { DataModeToggle } from '@/components/admin/analytics/DataModeToggle';
import { InquiryHeadline } from '@/components/admin/analytics/InquiryHeadline';
import { LiveTile } from '@/components/admin/analytics/LiveTile';
import { TrendSparkline } from '@/components/admin/analytics/TrendSparkline';
import { EngagedVisitStat } from '@/components/admin/analytics/EngagedVisitStat';
import { AppointmentsStat } from '@/components/admin/analytics/AppointmentsStat';
import { VisitsStat } from '@/components/admin/analytics/VisitsStat';
import { SourceTable } from '@/components/admin/analytics/SourceTable';
import { PageTable } from '@/components/admin/analytics/PageTable';
import { CtaTable } from '@/components/admin/analytics/CtaTable';
import { FunnelPanel } from '@/components/admin/analytics/FunnelPanel';
import { TrackingDisabledBanner, LoadingBanner, ErrorBanner, ReportMetaBanner } from '@/components/admin/analytics/StatusBanner';
import { buildEmptyReport } from '@/components/admin/analytics/emptyReport';
import {
  buildDashboardRequestKey,
  deriveDashboardRequestState,
  type DashboardErrorState,
} from '@/lib/analytics/dashboardRequestState';

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
  testMode,
  onTestModeChange,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
  /** True when the URL carries ?testMode=1 — show test/preview traffic only, never blended with real data. */
  testMode: boolean;
  onTestModeChange: (testMode: boolean) => void;
}) {
  const [range, setRange] = useState<ReportRange>('7d');
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [errorState, setErrorState] = useState<DashboardErrorState>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // Bumped by the Retry button to re-run the effect below without
  // duplicating the fetch body in a second callback (see leads page for the
  // same pattern and why: an effect calling a named function that sets state
  // trips React's set-state-in-effect check).
  const [retryKey, setRetryKey] = useState(0);

  const abortSignal = useAbortSignal();

  const requestKey = buildDashboardRequestKey({ range, testMode, retryKey });
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const { loading, error } = deriveDashboardRequestState(requestKey, settledKey, errorState);

  useEffect(() => {
    // Cancellation flag: when the range or the data mode changes mid-flight,
    // the superseded request must not write any state. Without it, a late
    // response could land after the new request started and leave the page
    // with loading already false, no banner, and a fresh "last refreshed"
    // stamp above a report the render below then discards for mode mismatch —
    // a silent all-zero dashboard. Guarding every write below with `cancelled`
    // means a stale request can never mark the current requestKey settled.
    let cancelled = false;
    (async () => {
      try {
        // testMode=1 makes the API ask the report for mode:'test' events
        // instead of real ones — the server never returns both at once.
        const data = await adminFetch<AnalyticsReport>(
          `/api/admin/analytics?range=${range}${testMode ? '&testMode=1' : ''}`,
          getToken,
          { cache: 'no-store', signal: abortSignal },
        );
        if (cancelled) return;
        setReport(data);
        setLastRefreshed(new Date());
        setErrorState(null);
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        setErrorState({ key: requestKey, message: err instanceof Error ? err.message : 'Could not load analytics.' });
      } finally {
        if (!cancelled) setSettledKey(requestKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, testMode, getToken, abortSignal, requestKey]);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  const trackingEnabled = isAnalyticsEnabled();

  // Always render the full dashboard, even with nothing to show. Before the
  // first fetch resolves — and when it fails outright — fall back to a
  // zero-filled report so every tile, table and funnel row is still visible.
  // Hiding the page behind a banner left the owner unable to tell "not synced
  // yet" from "broken", and unable to see the layout at all until tracking was
  // switched on. The banners above still say why the numbers are zero; these
  // zeros are never presented as measurements.
  //
  // A report is also discarded here the moment it no longer matches the
  // requested data mode: while a real→test switch is in flight the previous
  // mode's numbers must not sit under test-mode chrome (or vice versa). Real
  // and test data never appear together, not even for one render.
  const syncedReport = report !== null && report.meta.testMode === testMode ? report : null;
  const view = syncedReport ?? buildEmptyReport(range);
  const synced = syncedReport !== null;
  const degradedLeads = !!syncedReport?.meta.degraded.includes('leads');

  return (
    <AdminShell
      title="Site Performance"
      email={email}
      onSignOut={signOut}
      lastRefreshed={lastRefreshed}
    >
      {/* Restyled onto the marketing design system (see app/admin/admin.css)
          — every panel below is a paper card; #admin-analytics-dashboard-grid
          is the only layout plumbing standing in for the old .analytics-page. */}
      <div id="admin-analytics-dashboard-grid" data-data-mode={testMode ? 'test' : 'real'}>

        {!trackingEnabled ? <TrackingDisabledBanner /> : null}

        {loading && !synced ? <LoadingBanner /> : null}
        {error ? <ErrorBanner message={error} onRetry={retry} /> : null}

        {synced ? <ReportMetaBanner meta={view.meta} /> : null}

        <InquiryHeadline
          inquiries={view.inquiries}
          inquiryRate={view.inquiryRate}
          degraded={degradedLeads}
          testMode={testMode}
        />

        <LiveTile live={view.live} />

        <div id="admin-analytics-controls-row">
          <RangeSelector value={range} onChange={setRange} disabled={loading} />
          <DataModeToggle testMode={testMode} onChange={onTestModeChange} disabled={loading} />
        </div>

        <TrendSparkline points={view.dailyTrend} />

        {/* Three range-scoped stat cards side by side, homepage grid-3. */}
        <div id="admin-analytics-stats-row" className="grid-3">
          <VisitsStat pageviews={view.pageviews} sessions={view.sessions} range={range} />
          <EngagedVisitStat engagedVisitPct={view.engagedVisitPct} sessions={view.sessions} />
          <AppointmentsStat appointmentsScheduled={view.appointmentsScheduled} />
        </div>

        {/* Traffic sources and pages viewed side by side, homepage grid-2. */}
        <div id="admin-analytics-tables-row" className="grid-2">
          <SourceTable sources={view.sources} />
          <PageTable pages={view.pages} />
        </div>

        <CtaTable ctaClicks={view.ctaClicks} />

        <FunnelPanel funnel={view.funnel} />

      </div>
    </AdminShell>
  );
}

/**
 * Owns the one piece of dashboard state that lives in the URL: ?testMode=1.
 * Keeping it in the URL (rather than component state) means a reload or a
 * shared link reopens the same data mode, so nobody reads test traffic as
 * real business numbers after a refresh.
 *
 * Split out from the default export purely so useSearchParams sits below a
 * <Suspense> boundary, as next/navigation requires — see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md.
 * Nav links elsewhere in the admin chrome are plain hrefs and never carry
 * this param.
 */
function AdminAnalyticsDashboardRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const testMode = searchParams.get('testMode') === '1';

  const setTestMode = useCallback(
    (next: boolean) => {
      // scroll: false keeps the owner where they were; the page content is
      // replaced in place, not navigated to.
      router.replace(next ? `${pathname}?testMode=1` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return (
    <AdminSessionProvider>
      <AdminGuard>
        {(session) => (
          <AdminAnalyticsDashboardContent
            email={session.email}
            getToken={session.getToken}
            signOut={session.signOut}
            testMode={testMode}
            onTestModeChange={setTestMode}
          />
        )}
      </AdminGuard>
    </AdminSessionProvider>
  );
}

export default function AdminAnalyticsDashboardPage() {
  return (
    <Suspense fallback={<LoadingBanner />}>
      <AdminAnalyticsDashboardRoute />
    </Suspense>
  );
}
