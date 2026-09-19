/**
 * Coverage for app/api/admin/analytics/cleanup/route.ts: the admin auth
 * boundary (401/403/500 distinguished, never leaking internals — same
 * pattern as tests/unit/admin-analytics-route.test.ts) and that ?dryRun=1
 * reaches runAnalyticsRetentionCleanup correctly. lib/analytics/retention.ts
 * is mocked here — its own behavior is covered by
 * tests/unit/analytics-retention.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyAdmin = vi.fn();
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));

const runAnalyticsRetentionCleanup = vi.fn();
vi.mock('@/lib/analytics/retention', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics/retention')>()),
  runAnalyticsRetentionCleanup: (...args: unknown[]) => runAnalyticsRetentionCleanup(...args),
}));

function cleanupRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { method: 'POST', headers });
}

const FAKE_RESULT = {
  generatedAt: '2026-09-16T12:00:00.000Z',
  dryRun: false,
  events: { collection: 'analytics_events', examined: 3, deleted: 3, errors: 0, moreRemain: false },
  rateLimits: { collection: 'analyticsRateLimits', examined: 0, deleted: 0, errors: 0, moreRemain: false },
  moreRemain: false,
};

describe('POST /api/admin/analytics/cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an unauthenticated caller with 401, without echoing the internal message', async () => {
    const { UnauthorizedError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new UnauthorizedError('missing or malformed Authorization header'));

    const { POST } = await import('@/app/api/admin/analytics/cleanup/route');
    const res = await POST(cleanupRequest('http://localhost/api/admin/analytics/cleanup'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain('Authorization header');
    expect(runAnalyticsRetentionCleanup).not.toHaveBeenCalled();
  });

  it('rejects a non-admin caller with 403 (not 401)', async () => {
    const { ForbiddenError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ForbiddenError('not on admin whitelist'));

    const { POST } = await import('@/app/api/admin/analytics/cleanup/route');
    const res = await POST(
      cleanupRequest('http://localhost/api/admin/analytics/cleanup', { Authorization: 'Bearer some-token' })
    );

    expect(res.status).toBe(403);
    expect(runAnalyticsRetentionCleanup).not.toHaveBeenCalled();
  });

  it('returns 500 (not 401) with a sanitized message when the admin whitelist lookup itself fails', async () => {
    const { ServiceError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ServiceError('admin whitelist lookup failed: 503 unavailable at project my-secret-project'));

    const { POST } = await import('@/app/api/admin/analytics/cleanup/route');
    const res = await POST(cleanupRequest('http://localhost/api/admin/analytics/cleanup'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('my-secret-project');
  });

  it('returns a sanitized 500 (not the raw error) when cleanup itself throws', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    runAnalyticsRetentionCleanup.mockRejectedValue(
      new Error('Firestore RANGE analytics_events: 503 backend unavailable at project my-secret-project')
    );

    const { POST } = await import('@/app/api/admin/analytics/cleanup/route');
    const res = await POST(
      cleanupRequest('http://localhost/api/admin/analytics/cleanup', { Authorization: 'Bearer good-token' })
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('my-secret-project');
  });

  it('defaults to dryRun=false (the destructive path) when no query param is given', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    runAnalyticsRetentionCleanup.mockResolvedValue(FAKE_RESULT);

    const { POST } = await import('@/app/api/admin/analytics/cleanup/route');
    const res = await POST(
      cleanupRequest('http://localhost/api/admin/analytics/cleanup', { Authorization: 'Bearer good-token' })
    );

    expect(res.status).toBe(200);
    expect(runAnalyticsRetentionCleanup).toHaveBeenCalledWith(expect.any(Date), false);
  });

  it('passes dryRun=true through for ?dryRun=1', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    runAnalyticsRetentionCleanup.mockResolvedValue({ ...FAKE_RESULT, dryRun: true });

    const { POST } = await import('@/app/api/admin/analytics/cleanup/route');
    const res = await POST(
      cleanupRequest('http://localhost/api/admin/analytics/cleanup?dryRun=1', { Authorization: 'Bearer good-token' })
    );

    expect(res.status).toBe(200);
    expect(runAnalyticsRetentionCleanup).toHaveBeenCalledWith(expect.any(Date), true);
  });

  it('returns the structured cleanup result as JSON on success', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    runAnalyticsRetentionCleanup.mockResolvedValue(FAKE_RESULT);

    const { POST } = await import('@/app/api/admin/analytics/cleanup/route');
    const res = await POST(
      cleanupRequest('http://localhost/api/admin/analytics/cleanup', { Authorization: 'Bearer good-token' })
    );
    const body = await res.json();

    expect(body).toEqual(FAKE_RESULT);
  });
});
