'use client';

import type { User } from 'firebase/auth';
import { useAdminSession } from './AdminSession';
import type { GetIdToken } from './adminFetch';

type ReadySession = { user: User; email: string; getToken: GetIdToken; signOut: () => Promise<void> };

/**
 * Renders one of the distinct admin session states (loading, signed out,
 * forbidden, expired, network error, ready) and only calls `children` once
 * the session is verified client-side. This is a UX gate, not a security
 * boundary — every route this gate protects must still call verifyAdmin().
 */
export function AdminGuard({ children }: { children: (session: ReadySession) => React.ReactNode }) {
  const { state, retry, signOut, getToken } = useAdminSession();

  switch (state.status) {
    case 'loading':
      // Deliberately not a screen. Verifying an existing session is usually
      // instant, and a full-page card in front of the dashboard made every
      // visit feel like signing in again. This is a small corner indicator
      // that CSS holds back for a moment, so a session that resolves quickly
      // shows nothing at all.
      return (
        <div id="admin-session-checking-indicator" role="status" aria-live="polite">
          <span className="stamp-label">Checking session…</span>
        </div>
      );

    case 'signed-out':
      return (
        <AdminStateScreen id="admin-session-signed-out-shell" label="You're signed out.">
          <a href="/admin" id="admin-session-signed-out-link" className="btn btn-primary booking-forward-btn btn-sm btn-accent">
            Go to sign in →
          </a>
        </AdminStateScreen>
      );

    case 'expired':
      return (
        <AdminStateScreen id="admin-session-expired-shell" label="Your session expired.">
          <p className="form-note">Sign in again to keep working.</p>
          <a href="/admin" id="admin-session-expired-link" className="btn btn-primary booking-forward-btn btn-sm btn-accent">
            Sign in again →
          </a>
        </AdminStateScreen>
      );

    case 'forbidden':
      return (
        <AdminStateScreen id="admin-session-forbidden-shell" label="Access denied.">
          <p className="form-note">{state.email} is not on the admin whitelist.</p>
          <button id="admin-session-forbidden-signout" className="btn btn-primary booking-forward-btn btn-sm btn-accent" onClick={() => void signOut()}>
            Sign out
          </button>
        </AdminStateScreen>
      );

    case 'network-error':
      return (
        <AdminStateScreen id="admin-session-network-error-shell" label="Could not verify admin access.">
          <p className="form-note">{state.message}</p>
          <button id="admin-session-network-error-retry" className="btn btn-primary booking-forward-btn btn-sm btn-accent" onClick={retry}>
            Retry
          </button>
        </AdminStateScreen>
      );

    case 'ready':
      return <>{children({ user: state.user, email: state.email, getToken, signOut })}</>;
  }
}

function AdminStateScreen({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div id={id} className="admin-state-screen">
      <div className="card card-pad">
        <p className="stamp-label">{label}</p>
        {children}
      </div>
    </div>
  );
}

