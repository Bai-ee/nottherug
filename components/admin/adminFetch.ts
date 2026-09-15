'use client';

import { useEffect, useState } from 'react';

/**
 * Thrown for any non-2xx admin API response. Subclasses distinguish the
 * cases callers actually need to branch on (session vs. permission vs.
 * backend failure) instead of every caller re-parsing `res.status`.
 */
export class AdminRequestError extends Error {
  readonly status: number;
  /** The parsed response body, when there was one — routes like the photo
   * delete/upload endpoints carry extra structured fields (`status`,
   * `cleanup`, `thumbnailStatus`, …) on a non-2xx response that a bare
   * `message` string would throw away. */
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = 'AdminRequestError';
    this.status = status;
    this.body = body;
  }
}

/** 401 — no valid session. The caller should route back to sign-in. */
export class AdminUnauthorizedError extends AdminRequestError {
  constructor(message: string, body: unknown = null) {
    super(401, message, body);
    this.name = 'AdminUnauthorizedError';
  }
}

/** 403 — a valid session that isn't permitted for this resource. */
export class AdminForbiddenError extends AdminRequestError {
  constructor(message: string, body: unknown = null) {
    super(403, message, body);
    this.name = 'AdminForbiddenError';
  }
}

/** 5xx — the request was legitimate; a server-side dependency failed. */
export class AdminServiceError extends AdminRequestError {
  constructor(status: number, message: string, body: unknown = null) {
    super(status, message, body);
    this.name = 'AdminServiceError';
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** Reads one string field off an unknown response body (see AdminRequestError.body). */
export function readBodyStringField(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null || !(key in body)) return undefined;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function errorBodyMessage(body: unknown, fallback: string): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as Record<string, unknown>).error === 'string'
  ) {
    return (body as { error: string }).error;
  }
  return fallback;
}

export type GetIdToken = (forceRefresh?: boolean) => Promise<string>;

/**
 * Fetches an admin API route with a bearer token attached, and turns a
 * non-2xx response into a typed error instead of a bare boolean `res.ok`
 * check duplicated on every page. Pass `init.signal` (see useAbortSignal
 * below) so an unmounted page's in-flight request never sets state.
 *
 * Every admin page used to do its own copy of: get the token, build the
 * header, fetch, check res.ok, parse the error body. This is that copy,
 * written once.
 */
export async function adminFetch<T = unknown>(
  input: string,
  getToken: GetIdToken,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(input, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // No JSON body (e.g. a 204, or an upstream failure that never reached
    // our route handlers). Fall through to the status-based message below.
  }

  if (res.ok) return body as T;

  const message = errorBodyMessage(body, `Request failed (${res.status})`);
  if (res.status === 401) throw new AdminUnauthorizedError(message, body);
  if (res.status === 403) throw new AdminForbiddenError(message, body);
  if (res.status >= 500) throw new AdminServiceError(res.status, message, body);
  throw new AdminRequestError(res.status, message, body);
}

/**
 * A signal tied to the calling component's lifetime: aborted on unmount, so
 * a fetch that resolves after the page navigates away never reaches a
 * `setState` on a dead component. Use it as `signal` in adminFetch's `init`,
 * and check `isAbortError(err)` in the catch block to skip the abort itself.
 */
export function useAbortSignal(): AbortSignal {
  // useState's lazy initializer (not useRef) so the controller is available
  // during render without reading a ref's `.current` at render time.
  const [controller] = useState(() => new AbortController());
  useEffect(() => () => controller.abort(), [controller]);
  return controller.signal;
}
