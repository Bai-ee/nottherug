'use client'; // Error boundaries must be Client Components (Next 16 docs).

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reportBoundaryError } from '@/lib/server/reportError';

/**
 * Route-segment error boundary for everything under app/admin. Mirrors the
 * admin-state-screen pattern already used for auth states (see
 * components/admin/AdminGuard.tsx) so this reads as the same product, not a
 * generic crash page. Never renders `error.message`/`error.stack` — those can
 * carry Firestore/Firebase Admin error text that names internal resources;
 * only a fixed, generic message plus the retry/sign-out affordances an admin
 * already knows from AdminGuard are shown.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    reportBoundaryError({ boundary: 'admin-error', route: pathname, error });
  }, [error, pathname]);

  return (
    <div id="admin-error-shell" className="admin-state-screen">
      <div className="card card-pad">
        <p className="stamp-label">Something went wrong.</p>
        <p className="form-note">
          This screen hit an error. Try again, or head back to sign-in if it keeps happening.
        </p>
        <div id="admin-error-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            id="admin-error-retry"
            className="btn btn-primary booking-forward-btn btn-sm btn-accent"
            onClick={() => retry()}
          >
            Try again
          </button>
          <a href="/admin" id="admin-error-signin-link" className="btn btn-primary booking-forward-btn btn-sm btn-accent">
            Back to sign in →
          </a>
        </div>
      </div>
    </div>
  );
}
