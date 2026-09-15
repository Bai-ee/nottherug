/**
 * Coverage for components/admin/adminFetch.ts, the shared authenticated
 * request helper every admin page now uses instead of its own fetch/token
 * boilerplate. Runs in vitest's node environment: no DOM/React harness is
 * configured in this repo (vitest.config.mts sets environment: 'node' and no
 * @testing-library/react is installed), so this covers the helper's request
 * and error-typing contract directly rather than mounting a page component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  adminFetch,
  isAbortError,
  readBodyStringField,
  AdminUnauthorizedError,
  AdminForbiddenError,
  AdminServiceError,
  AdminRequestError,
} from '@/components/admin/adminFetch';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const getToken = vi.fn(async () => 'fake-token');

describe('adminFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches a bearer token from getToken and returns the parsed body on 200', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer fake-token');
      return jsonResponse(200, { ok: true, leads: [] });
    });
    vi.stubGlobal('fetch', fetchMock);

    const body = await adminFetch<{ ok: boolean }>('/admin/leads', getToken);
    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws AdminUnauthorizedError, not a generic error, on 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: 'Authentication required.' })));
    await expect(adminFetch('/x', getToken)).rejects.toBeInstanceOf(AdminUnauthorizedError);
  });

  it('throws AdminForbiddenError, distinct from unauthorized, on 403', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { error: 'You are not authorized for this resource.' })));
    const err = await adminFetch('/x', getToken).catch((e) => e);
    expect(err).toBeInstanceOf(AdminForbiddenError);
    expect(err).not.toBeInstanceOf(AdminUnauthorizedError);
  });

  it('throws AdminServiceError, distinct from unauthorized/forbidden, on 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(502, { ok: false, status: 'pending_cleanup', error: 'Storage deletion failed; the record was kept so you can retry.' })));
    const err = await adminFetch('/x', getToken).catch((e) => e);
    expect(err).toBeInstanceOf(AdminServiceError);
    expect(err).not.toBeInstanceOf(AdminForbiddenError);
    // The route's human-readable `error` field survives as the thrown message —
    // this is what lets the photos/generator pages show a truthful reason.
    expect((err as Error).message).toBe('Storage deletion failed; the record was kept so you can retry.');
  });

  it('keeps the parsed error body on the thrown error so callers can read extra fields (e.g. `cleanup`)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { error: 'Metadata write failed', cleanup: 'failed' })));
    const err = await adminFetch('/x', getToken).catch((e) => e);
    expect(err).toBeInstanceOf(AdminRequestError);
    expect(readBodyStringField((err as AdminRequestError).body, 'cleanup')).toBe('failed');
  });

  it('propagates an aborted request as-is, recognizable via isAbortError', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError');
    vi.stubGlobal('fetch', vi.fn(async () => { throw abortError; }));
    const err = await adminFetch('/x', getToken, { signal: new AbortController().signal }).catch((e) => e);
    expect(isAbortError(err)).toBe(true);
  });

  it('does not misclassify an ordinary network failure as an abort', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const err = await adminFetch('/x', getToken).catch((e) => e);
    expect(isAbortError(err)).toBe(false);
  });

  it('resolves a successful delete (ok: true) without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: true, status: 'deleted' })));
    const body = await adminFetch<{ ok: true; status: string }>('/api/admin/photos/delete', getToken, { method: 'DELETE' });
    expect(body).toEqual({ ok: true, status: 'deleted' });
  });
});
