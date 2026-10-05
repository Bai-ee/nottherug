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

  const AUTH = { Authorization: 'Bearer some-token' };
  const fbError = (code: string, message = code) => Object.assign(new Error(message), { code });

  it.each([
    ['invalid token', 'auth/argument-error'],
    ['malformed id token', 'auth/invalid-id-token'],
    ['expired token', 'auth/id-token-expired'],
    ['revoked token', 'auth/id-token-revoked'],
    ['disabled user', 'auth/user-disabled'],
    ['deleted user', 'auth/user-not-found'],
  ])('rejects a %s (%s) as unauthorized (401), without touching the whitelist', async (_label, code) => {
    verifyIdToken.mockRejectedValue(fbError(code));
    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { UnauthorizedError, errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith(AUTH)).catch((e) => e);
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(errorResponse(error).status).toBe(401);
    expect(fsGetDoc).not.toHaveBeenCalled();
  });

  it('verifies with revocation checking enabled', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test', email_verified: true });
    fsGetDoc.mockResolvedValue({ exists: true });
    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    await verifyAdmin(requestWith(AUTH));
    expect(verifyIdToken).toHaveBeenCalledWith('some-token', true);
  });

  it.each([
    ['Auth backend internal error', fbError('auth/internal-error')],
    ['network error', fbError('app/network-error')],
    ['credential error', fbError('app/invalid-credential')],
    ['non-Firebase error', new Error('socket hang up')],
  ])('surfaces a revocation-check backend failure (%s) as a service error (500, never 401)', async (_label, err) => {
    verifyIdToken.mockRejectedValue(err);
    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { ServiceError, errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith(AUTH)).catch((e) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect(errorResponse(error).status).toBe(500);
    expect(fsGetDoc).not.toHaveBeenCalled();
  });

  it('rejects an unverified email as forbidden (403) before the whitelist lookup', async () => {
    for (const claims of [
      { email: 'admin@example.test', email_verified: false },
      { email: 'admin@example.test' },
    ]) {
      verifyIdToken.mockResolvedValue(claims);
      const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
      const { ForbiddenError, errorResponse } = await import('@/lib/server/errors');

      const error = await verifyAdmin(requestWith(AUTH)).catch((e) => e);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(errorResponse(error).status).toBe(403);
    }
    expect(fsGetDoc).not.toHaveBeenCalled();
  });

  it('rejects a token with no email claim as unauthorized', async () => {
    verifyIdToken.mockResolvedValue({ email_verified: true });
    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { UnauthorizedError } = await import('@/lib/server/errors');
    expect(await verifyAdmin(requestWith(AUTH)).catch((e) => e)).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a verified token not on the admin whitelist as forbidden (403, not 401)', async () => {
    verifyIdToken.mockResolvedValue({ email: 'not-admin@example.test', email_verified: true });
    fsGetDoc.mockResolvedValue({ exists: false });

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { ForbiddenError, errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith(AUTH)).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(errorResponse(error).status).toBe(403);
  });

  it('surfaces a whitelist lookup failure as a service error (500, not 401)', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test', email_verified: true });
    fsGetDoc.mockRejectedValue(new Error('Firestore GET admins/admin@example.test: 503 unavailable'));

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { ServiceError, errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith(AUTH)).catch((e) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect(errorResponse(error).status).toBe(500);
  });

  it('bounds the whitelist lookup and reports a timeout as a service error (500)', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test', email_verified: true });
    const { UpstreamTimeoutError } = await import('@/lib/server/errors');
    fsGetDoc.mockRejectedValue(new UpstreamTimeoutError('firestore', 'GET admins/admin@example.test', 5000));

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { ServiceError } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith(AUTH)).catch((e) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect(fsGetDoc).toHaveBeenCalledWith('admins/admin@example.test', { timeoutMs: 5000 });
  });

  it('resolves with the admin email for a verified, whitelisted identity (key used as issued)', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test', email_verified: true });
    fsGetDoc.mockResolvedValue({ exists: true, data: {} });

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    await expect(verifyAdmin(requestWith(AUTH))).resolves.toBe('admin@example.test');
    expect(fsGetDoc).toHaveBeenCalledWith('admins/admin@example.test', expect.any(Object));
  });

  it('never echoes internal error detail in the client-facing errorResponse body', async () => {
    verifyIdToken.mockResolvedValue({ email: 'admin@example.test', email_verified: true });
    fsGetDoc.mockRejectedValue(new Error('service account key rejected by project my-secret-project-123'));

    const { verifyAdmin } = await import('@/lib/server/verifyAdmin');
    const { errorResponse } = await import('@/lib/server/errors');

    const error = await verifyAdmin(requestWith({ Authorization: 'Bearer good-token' })).catch((e) => e);
    const res = errorResponse(error);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('my-secret-project-123');
  });
});
