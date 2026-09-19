/**
 * Coverage for app/api/admin/analytics/route.ts: the admin auth boundary
 * (401/403/500 distinguished, never leaking internals) and that range/testMode
 * query params reach getAnalyticsReport correctly. lib/analytics/report.ts is
 * mocked here — its own behavior is covered by tests/unit/analytics-report.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyAdmin = vi.fn();
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));

const getAnalyticsReport = vi.fn();
vi.mock('@/lib/analytics/report', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics/report')>()),
  getAnalyticsReport: (...args: unknown[]) => getAnalyticsReport(...args),
}));

function analyticsRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { headers });
}

const FAKE_REPORT = {
  meta: { status: 'ok', generatedAt: 'x', trackingStartDate: null, testMode: false, degraded: [], eventsTruncated: false },
};

describe('GET /api/admin/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 (via errorResponse), without echoing the internal message, when verifyAdmin rejects as unauthorized', async () => {
    const { UnauthorizedError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new UnauthorizedError('token verification failed: jwt malformed'));

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(analyticsRequest('http://localhost/api/admin/analytics'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain('jwt malformed');
    expect(getAnalyticsReport).not.toHaveBeenCalled();
  });

  it('returns 403 (not 401) when verifyAdmin rejects as forbidden', async () => {
    const { ForbiddenError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ForbiddenError('not on admin whitelist'));

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(analyticsRequest('http://localhost/api/admin/analytics'));

    expect(res.status).toBe(403);
    expect(getAnalyticsReport).not.toHaveBeenCalled();
  });

  it('returns 500 (not 401) with a sanitized message when the admin whitelist lookup itself fails', async () => {
    const { ServiceError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ServiceError('admin whitelist lookup failed: 503 unavailable at project my-secret-project'));

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(analyticsRequest('http://localhost/api/admin/analytics'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('my-secret-project');
  });

  it('returns a sanitized 500 (not the raw error) when the report itself throws', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    getAnalyticsReport.mockRejectedValue(new Error('Firestore RANGE analytics_events: 503 backend unavailable at project my-secret-project'));

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(analyticsRequest('http://localhost/api/admin/analytics', { Authorization: 'Bearer good-token' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('my-secret-project');
  });

  it('defaults to range=7d and testMode=false when no query params are given', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    getAnalyticsReport.mockResolvedValue(FAKE_REPORT);

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(analyticsRequest('http://localhost/api/admin/analytics', { Authorization: 'Bearer good-token' }));

    expect(res.status).toBe(200);
    expect(getAnalyticsReport).toHaveBeenCalledWith('7d', { includeTest: false });
  });

  it('passes through a valid range and testMode=1', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    getAnalyticsReport.mockResolvedValue(FAKE_REPORT);

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(
      analyticsRequest('http://localhost/api/admin/analytics?range=30d&testMode=1', { Authorization: 'Bearer good-token' })
    );

    expect(res.status).toBe(200);
    expect(getAnalyticsReport).toHaveBeenCalledWith('30d', { includeTest: true });
  });

  it('falls back to the default range for an invalid range value instead of passing it through', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    getAnalyticsReport.mockResolvedValue(FAKE_REPORT);

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(
      analyticsRequest('http://localhost/api/admin/analytics?range=all-time', { Authorization: 'Bearer good-token' })
    );

    expect(res.status).toBe(200);
    expect(getAnalyticsReport).toHaveBeenCalledWith('7d', { includeTest: false });
  });

  it('returns the report body as JSON on success', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    getAnalyticsReport.mockResolvedValue(FAKE_REPORT);

    const { GET } = await import('@/app/api/admin/analytics/route');
    const res = await GET(analyticsRequest('http://localhost/api/admin/analytics', { Authorization: 'Bearer good-token' }));
    const body = await res.json();

    expect(body).toEqual(FAKE_REPORT);
  });
});
