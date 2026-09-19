/**
 * Sanitized logging boundary for route error/global-error components (see
 * plans/010-production-final-mile-optimization.md P5). Deliberately isomorphic
 * (no `server-only` import, no Node APIs) because error.tsx/global-error.tsx
 * are Client Components — this same call site needs to work whether the
 * bundler puts it in a server or client chunk.
 *
 * It logs only enough to locate the failure in server logs: which boundary
 * caught it, which route, the error's constructor name, and Next's
 * auto-generated `digest` (the id that matches server-side logs — see
 * node_modules/next/dist/docs .../file-conventions/error.md). It never logs
 * `error.message` or `.stack`: in production those can carry a thrown
 * provider payload, form text, or other request content, and in the browser
 * console that would be visible to anyone with devtools open on a real
 * customer's machine. Route handlers should keep using lib/server/errors.ts
 * (errorResponse/AppError) for their own logging; this helper is for the
 * render-time boundaries only.
 */

export type BoundaryName = 'global-error' | 'marketing-error' | 'admin-error' | (string & {});

export interface ReportableError {
  name?: string;
  digest?: string;
}

export interface ReportBoundaryErrorInput {
  /** Which error.tsx/global-error.tsx caught this. */
  boundary: BoundaryName;
  /**
   * Pathname only (e.g. from `usePathname()`) — never a full URL. Query
   * strings can carry prefilled form values or tracking params that count as
   * customer content, so callers must strip them before passing this in.
   */
  route?: string;
  error: (Error & { digest?: string }) | ReportableError | unknown;
}

/** Best-effort constructor/name extraction without touching `.message`. */
function errorClassOf(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error && typeof (error as { name?: unknown }).name === 'string') {
    return (error as { name: string }).name || 'Error';
  }
  return 'Error';
}

function digestOf(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'digest' in error) {
    const digest = (error as { digest?: unknown }).digest;
    return typeof digest === 'string' && digest.length > 0 ? digest : undefined;
  }
  return undefined;
}

/**
 * Logs `[boundary:<name>] route=<path> class=<ErrorName> digest=<id>` via
 * console.error and nothing else. Safe to call from every error.tsx and
 * global-error.tsx in the app; never throws.
 */
export function reportBoundaryError({ boundary, route, error }: ReportBoundaryErrorInput): void {
  try {
    const parts = [`[boundary:${boundary}]`];
    if (route) parts.push(`route=${route}`);
    parts.push(`class=${errorClassOf(error)}`);
    const digest = digestOf(error);
    if (digest) parts.push(`digest=${digest}`);
    console.error(parts.join(' '));
  } catch {
    // Reporting must never itself crash the error boundary it's called from.
  }
}
