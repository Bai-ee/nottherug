'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

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
        <style>{fonts}</style>
        <div style={styles.page}>
          <p style={styles.loadingLabel}>CHECKING SESSION...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{fonts}</style>
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.eyebrow}>NOT THE RUG</p>
          <h1 style={styles.heading}>Admin</h1>
          <p style={styles.subtext}>Secure founder access only.</p>

          {notAuthorized ? (
            <div style={styles.deniedBlock}>
              <p style={styles.deniedTitle}>ACCESS DENIED</p>
              <p style={styles.deniedBody}>This account is not on the admin whitelist.</p>
              <button onClick={handleSignOut} style={styles.signOutLink}>
                Sign out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleSignIn}
                disabled={loading}
                style={styles.googleButton}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = '#7A9068';
                  el.style.background = 'rgba(122,144,104,0.06)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = '#4E5A42';
                  el.style.background = 'transparent';
                }}
              >
                {loading ? (
                  <span style={styles.loadingButtonText}>[SIGNING IN...]</span>
                ) : (
                  <>
                    <span style={styles.gLetter}>G</span>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              {error && (
                <p style={styles.errorText}>{error}</p>
              )}
            </>
          )}

          <p style={styles.bottomLabel}>SECURE ACCESS · NOT THE RUG</p>
        </div>
      </div>
    </>
  );
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300..700&family=Outfit:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1F2318; }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1F2318',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Outfit, sans-serif',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#232B1E',
    border: '1px solid #2E3828',
    borderRadius: '16px',
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '11px',
    letterSpacing: '0.12em',
    color: '#7A9068',
    textTransform: 'uppercase' as const,
    marginBottom: '16px',
  },
  heading: {
    fontFamily: 'Fraunces, serif',
    fontSize: '42px',
    fontWeight: 400,
    color: '#EEF4DB',
    lineHeight: 1.0,
  },
  subtext: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    color: '#7A9068',
    marginTop: '8px',
    marginBottom: '32px',
  },
  googleButton: {
    width: '100%',
    height: '48px',
    background: 'transparent',
    border: '1px solid #4E5A42',
    borderRadius: '8px',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    fontWeight: 500,
    color: '#EEF4DB',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'border-color 0.15s, background 0.15s',
  },
  gLetter: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '15px',
    fontWeight: 600,
    color: '#EEF4DB',
    lineHeight: 1,
  },
  loadingButtonText: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '12px',
    color: '#7A9068',
    letterSpacing: '0.04em',
  },
  errorText: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '12px',
    color: '#C4674B',
    textTransform: 'uppercase' as const,
    marginTop: '12px',
    lineHeight: 1.5,
  },
  deniedBlock: {
    width: '100%',
    marginBottom: '8px',
  },
  deniedTitle: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '13px',
    color: '#C4674B',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  deniedBody: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    color: '#7A9068',
    marginBottom: '16px',
  },
  signOutLink: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    color: '#7A9068',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  bottomLabel: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '11px',
    color: '#4E5A42',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginTop: '40px',
  },
  loadingLabel: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '12px',
    color: '#4E5A42',
    letterSpacing: '0.06em',
  },
};
