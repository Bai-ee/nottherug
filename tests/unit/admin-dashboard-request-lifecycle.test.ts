/**
 * Coverage for lib/analytics/dashboardRequestState.ts, used by
 * app/admin/dashboard/page.tsx: buildDashboardRequestKey and
 * deriveDashboardRequestState. These replaced a synchronous setLoading(true)
 * at the top of the dashboard's fetch effect (flagged by
 * react-hooks/set-state-in-effect) with loading/error derived purely from
 * comparing "the request the page currently wants" against "the last request
 * that settled". Kept in their own module (not imported from the page
 * directly) so this test never pulls in the page's client-only import graph
 * (Firebase client config, admin session context, etc.).
 */
import { describe, it, expect } from 'vitest';

describe('buildDashboardRequestKey', () => {
  it('changes when the range changes', async () => {
    const { buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const a = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 0 });
    const b = buildDashboardRequestKey({ range: '30d', testMode: false, retryKey: 0 });
    expect(a).not.toBe(b);
  });

  it('changes when the data mode changes', async () => {
    const { buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const real = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 0 });
    const test = buildDashboardRequestKey({ range: '7d', testMode: true, retryKey: 0 });
    expect(real).not.toBe(test);
  });

  it('changes when the retry key changes', async () => {
    const { buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const first = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 0 });
    const retried = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 1 });
    expect(first).not.toBe(retried);
  });

  it('is stable for identical inputs', async () => {
    const { buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const params = { range: '7d' as const, testMode: false, retryKey: 2 };
    expect(buildDashboardRequestKey(params)).toBe(buildDashboardRequestKey({ ...params }));
  });
});

describe('deriveDashboardRequestState', () => {
  it('reports loading before any request has settled (initial mount)', async () => {
    const { deriveDashboardRequestState, buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const requestKey = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 0 });
    const { loading, error } = deriveDashboardRequestState(requestKey, null, null);
    expect(loading).toBe(true);
    expect(error).toBe('');
  });

  it('reports not-loading and no error once the matching request settles cleanly', async () => {
    const { deriveDashboardRequestState, buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const requestKey = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 0 });
    const { loading, error } = deriveDashboardRequestState(requestKey, requestKey, null);
    expect(loading).toBe(false);
    expect(error).toBe('');
  });

  it('surfaces the error message when it belongs to the current request key', async () => {
    const { deriveDashboardRequestState, buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const requestKey = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 0 });
    const { loading, error } = deriveDashboardRequestState(requestKey, requestKey, {
      key: requestKey,
      message: 'Could not load analytics.',
    });
    expect(loading).toBe(false);
    expect(error).toBe('Could not load analytics.');
  });

  it('goes back to loading, and hides the stale error, as soon as the range/mode/retry changes', async () => {
    const { deriveDashboardRequestState, buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const staleKey = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 0 });
    const nextKey = buildDashboardRequestKey({ range: '30d', testMode: false, retryKey: 0 });
    // The previous request settled with an error, but the owner has since
    // changed the range — the stale error must not leak into the new attempt.
    const { loading, error } = deriveDashboardRequestState(nextKey, staleKey, {
      key: staleKey,
      message: 'Could not load analytics.',
    });
    expect(loading).toBe(true);
    expect(error).toBe('');
  });

  it('ignores a stale, superseded settlement that never matches the current key', async () => {
    const { deriveDashboardRequestState, buildDashboardRequestKey } = await import('@/lib/analytics/dashboardRequestState');
    const currentKey = buildDashboardRequestKey({ range: '7d', testMode: true, retryKey: 3 });
    const otherSettledKey = buildDashboardRequestKey({ range: '7d', testMode: false, retryKey: 3 });
    const { loading } = deriveDashboardRequestState(currentKey, otherSettledKey, null);
    expect(loading).toBe(true);
  });
});
