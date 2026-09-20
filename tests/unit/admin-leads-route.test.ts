/**
 * Coverage for app/admin/leads/route.ts. Before this fix the catch block did
 * `NextResponse.json({ error: err.message }, { status: 401 })` unconditionally —
 * a Firestore outage was reported to the client as "unauthorized" and leaked
 * the raw error message. Both are asserted fixed below.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyAdmin = vi.fn();
const fsQueryCollection = vi.fn();

vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));
vi.mock('@/lib/server/firestoreRest', () => ({
  fsQueryCollection,
  fsGetDoc: vi.fn(),
  fsSetDoc: vi.fn(),
  fsCreateDoc: vi.fn(),
  fsDeleteDoc: vi.fn(),
  fsIncrementField: vi.fn(),
}));

function leadsRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/admin/leads', { headers });
}

describe('GET /admin/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 (via errorResponse) when verifyAdmin rejects as unauthorized, without echoing the internal message', async () => {
    const { UnauthorizedError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new UnauthorizedError('token verification failed: jwt malformed'));

    const { GET } = await import('@/app/admin/leads/route');
    const res = await GET(leadsRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).not.toContain('jwt malformed');
    expect(fsQueryCollection).not.toHaveBeenCalled();
  });

  it('returns 403 (not 401) when verifyAdmin rejects as forbidden', async () => {
    const { ForbiddenError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ForbiddenError('not on admin whitelist'));

    const { GET } = await import('@/app/admin/leads/route');
    const res = await GET(leadsRequest());

    expect(res.status).toBe(403);
    expect(fsQueryCollection).not.toHaveBeenCalled();
  });

  it('returns 500 (not 401) when the admin whitelist lookup itself fails', async () => {
    const { ServiceError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ServiceError('admin whitelist lookup failed: 503 unavailable'));

    const { GET } = await import('@/app/admin/leads/route');
    const res = await GET(leadsRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('503 unavailable');
  });

  it('returns 500 and a safe message (not the raw Firestore error) when the lead query itself fails', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    fsQueryCollection.mockRejectedValue(new Error('Firestore GET leads: 503 backend unavailable at project my-secret-project'));

    const { GET } = await import('@/app/admin/leads/route');
    const res = await GET(leadsRequest({ Authorization: 'Bearer good-token' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('my-secret-project');
  });

  it('returns the leads and a truthful cap on success', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    fsQueryCollection.mockResolvedValue([{ id: 'a' }]);

    const { GET } = await import('@/app/admin/leads/route');
    const res = await GET(leadsRequest({ Authorization: 'Bearer good-token' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.leads).toEqual([{ id: 'a' }]);
    expect(typeof body.cap).toBe('number');
    expect(fsQueryCollection).toHaveBeenCalledWith('leads', 'submittedAt', 'DESCENDING', body.cap);
  });

  it('excludes a capture row already converted to a full lead, but keeps outstanding captures and meetgreet leads', async () => {
    verifyAdmin.mockResolvedValue('admin@example.test');
    fsQueryCollection.mockResolvedValue([
      { id: 'capture_converted', type: 'capture', status: 'converted', email: 'done@example.test', submittedAt: '2026-01-03T00:00:00.000Z', convertedLeadId: 'meetgreet_1' },
      { id: 'capture_outstanding', type: 'capture', status: 'partial', email: 'waiting@example.test', submittedAt: '2026-01-02T00:00:00.000Z' },
      { id: 'meetgreet_1', type: 'meetgreet', email: 'done@example.test', submittedAt: '2026-01-01T00:00:00.000Z' },
    ]);

    const { GET } = await import('@/app/admin/leads/route');
    const res = await GET(leadsRequest({ Authorization: 'Bearer good-token' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.leads.map((l: { id: string }) => l.id)).toEqual(['capture_outstanding', 'meetgreet_1']);
  });
});
