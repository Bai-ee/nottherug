'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import SiteNav from '@/components/SiteNav';

/**
 * Client Access sign-in (the admin door; founder-only for now). Presentation
 * runs on the marketing design system in
 * app/globals.css — paper page, taped card, stamp label, .btn-primary paper
 * ticket — so this screen reads as the same site as the home page. Its rules
 * live in the #admin-signin-* block at the end of globals.css; nothing here
 * carries inline styles or its own font import any more.
 *
 * The auth flow is unchanged: Google popup -> `admins/{email}` lookup ->
 * /admin/dashboard, with a denied panel for accounts off the whitelist.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [notAuthorized, setNotAuthorized] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user && user.email) {
          const ref = doc(db, 'admins', user.email);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            router.push('/admin/dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('[admin] Firestore check failed:', err);
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  async function handleSignIn() {
    setLoading(true);
    setError('');
    setNotAuthorized(false);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!user.email) {
        setError('NO EMAIL ASSOCIATED WITH THIS ACCOUNT.');
        setLoading(false);
        return;
      }
      const ref = doc(db, 'admins', user.email);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        router.push('/admin/dashboard');
      } else {
        setNotAuthorized(true);
        await signOut(auth);
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'SIGN IN FAILED.';
      setError(msg.toUpperCase());
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setNotAuthorized(false);
    setError('');
  }

  if (checking) {
    return (
      <>
        <SiteNav />
        <div id="admin-signin-page">
          <p className="stamp-label">Checking session…</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Same bar as the marketing pages. Off the home route SiteNav's
          "Book a Walk" navigates to /book instead of popping the welcome
          modal, which this page does not mount. */}
      <SiteNav />

      <div id="admin-signin-page">
      <div id="admin-signin-card" className="card card-pad">
        <div id="admin-signin-header">
          {/* Same stamped form label the home page uses over its sections. */}
          <div className="stamp-label stamp-label-heading">Form 00 · Sign In</div>
          <h1>Client Access</h1>
          <p id="admin-signin-subtext">Secure founder access only.</p>
        </div>

        {notAuthorized ? (
          <div id="admin-signin-denied-panel">
            <p id="admin-signin-denied-title">Access denied</p>
            <p id="admin-signin-denied-body">This account is not on the admin whitelist.</p>
            <button type="button" id="admin-signin-denied-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <>
            {/* .booking-forward-btn keeps the paper ticket upright, the same
                way the booking form's forward action drops the tilt. */}
            <button
              type="button"
              id="admin-signin-google-btn"
              className="btn btn-primary booking-forward-btn"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in with Google'}
            </button>

            {error && <p id="admin-signin-error">{error}</p>}
          </>
        )}
      </div>
      </div>
    </>
  );
}
