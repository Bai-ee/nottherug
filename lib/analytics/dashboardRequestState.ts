import type { ReportRange } from '@/lib/analytics/report';

/** One in-flight/settled fetch attempt for the analytics dashboard. */
export type DashboardRequestKeyParts = {
  range: ReportRange;
  testMode: boolean;
  retryKey: number;
};

/** An error captured for a specific request attempt, so a stale error never outlives its request. */
export type DashboardErrorState = { key: string; message: string } | null;

/**
 * Identifies "the request the page currently wants": range + data mode +
 * retry attempt, as a single comparable string. Exported for
 * tests/unit/admin-dashboard-request-lifecycle.test.ts.
 */
export function buildDashboardRequestKey({ range, testMode, retryKey }: DashboardRequestKeyParts): string {
  return `${range}|${testMode ? 'test' : 'real'}|${retryKey}`;
}

/**
 * Derives loading/error purely from comparing the request the page currently
 * wants (`requestKey`) against the key of the most recently settled request,
 * instead of resetting them with a synchronous setState at the top of the
 * fetch effect in app/admin/dashboard/page.tsx — that pattern trips React's
 * set-state-in-effect check and can cascade renders. Whenever the owner
 * changes the range/mode or hits Retry, `requestKey` changes immediately on
 * the same render, so `loading` becomes true without the effect having to run
 * first. Exported for tests/unit/admin-dashboard-request-lifecycle.test.ts.
 */
export function deriveDashboardRequestState(
  requestKey: string,
  settledKey: string | null,
  errorState: DashboardErrorState,
): { loading: boolean; error: string } {
  return {
    loading: requestKey !== settledKey,
    error: errorState && errorState.key === requestKey ? errorState.message : '',
  };
}
