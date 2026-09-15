import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyIdToken = vi.fn();
const fsGetDoc = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: { verifyIdToken },
  adminApp: { options: { credential: { getAccessToken: vi.fn() } } },
}));

vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc,
  fsSetDoc: vi.fn(),
  fsCreateDoc: vi.fn(),
  fsIncrementField: vi.fn(),
  fsDeleteDoc: vi.fn(),
  fsQueryCollection: vi.fn(),
}));

function requestWith(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/admin/photos/list', { headers });
}

describe('verifyAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing Authorization header as unauthorized (401 via errorResponse)', async () => {
    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { UnauthorizedError, errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith()).catch((e) => e);
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(errorResponse(error).status).toBe(401);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects a malformed Authorization header as unauthorized', async () => {
    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { UnauthorizedError } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith({ Authorization: 'Basic abc123' })).catch((e) => e);
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a token that fails verification as unauthorized', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid token signature'));
    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { UnauthorizedError } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith({ Authorization: 'Bearer bad-token' })).catch((e) => e);
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a valid token not on the admin whitelist as forbidden (403, not 401)', async () => {
    verifyIdToken.mockResolvedValue({ email: 'not-admin@example.test' });
    fsGetDoc.mockResolvedValue({ exists: false });

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { ForbiddenError, errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith({ Authorization: 'Bearer good-token' })).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(errorResponse(error).status).toBe(403);
  });

  it('surfaces a whitelist lookup failure as a service error (500, not 401)', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test' });
    fsGetDoc.mockRejectedValue(new Error('Firestore GET admins/admin@example.test: 503 unavailable'));

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { ServiceError, errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith({ Authorization: 'Bearer good-token' })).catch((e) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect(errorResponse(error).status).toBe(500);
  });

  it('resolves with the admin email once the token verifies and the whitelist lookup succeeds', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test' });
    fsGetDoc.mockResolvedValue({ exists: true, data: {} });

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    await expect(verifyAdmin(requestWith({ Authorization: 'Bearer good-token' }))).resolves.toBe(
      'admin@example.test',
    );
  });

  it('never echoes internal error detail in the client-facing errorResponse body', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test' });
    fsGetDoc.mockRejectedValue(new Error('service account key rejected by project my-secret-project-123'));

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith({ Authorization: 'Bearer good-token' })).catch((e) => e);
    const res = errorResponse(error);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('my-secret-project-123');
  });
});
