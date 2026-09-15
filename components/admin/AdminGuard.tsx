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
      return <AdminStateScreen id="admin-session-loading-shell" label="Checking session…" />;

    case 'signed-out':
      return (
        <AdminStateScreen id="admin-session-signed-out-shell" label="You're signed out.">
          <a href="/admin" id="admin-session-signed-out-link" style={styles.link}>
            Go to sign in →
          </a>
        </AdminStateScreen>
      );

    case 'expired':
      return (
        <AdminStateScreen id="admin-session-expired-shell" label="Your session expired.">
          <p style={styles.body}>Sign in again to keep working.</p>
          <a href="/admin" id="admin-session-expired-link" style={styles.link}>
            Sign in again →
          </a>
        </AdminStateScreen>
      );

    case 'forbidden':
      return (
        <AdminStateScreen id="admin-session-forbidden-shell" label="Access denied.">
          <p style={styles.body}>{state.email} is not on the admin whitelist.</p>
          <button id="admin-session-forbidden-signout" onClick={() => void signOut()} style={styles.button}>
            Sign out
          </button>
        </AdminStateScreen>
      );

    case 'network-error':
      return (
        <AdminStateScreen id="admin-session-network-error-shell" label="Could not verify admin access.">
          <p style={styles.body}>{state.message}</p>
          <button id="admin-session-network-error-retry" onClick={retry} style={styles.button}>
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
    <div id={id} style={styles.shell}>
      <div style={styles.card}>
        <p style={styles.label}>{label}</p>
        {children}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: '#1F2318',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    maxWidth: 380,
  },
  label: {
    fontFamily: '"Space Mono", monospace',
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#EEF4DB',
  },
  body: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 14,
    color: '#7A9068',
    lineHeight: 1.5,
  },
  link: {
    fontFamily: '"Space Mono", monospace',
    fontSize: 12,
    color: '#B4C89E',
    textDecoration: 'underline',
  },
  button: {
    fontFamily: '"Space Mono", monospace',
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#1F2318',
    background: '#B4C89E',
    border: 'none',
    borderRadius: 6,
    padding: '10px 18px',
    cursor: 'pointer',
  },
};
