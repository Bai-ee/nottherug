'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  getIdToken as firebaseGetIdToken,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { GetIdToken } from './adminFetch';

/**
 * Every admin page repeated: onAuthStateChanged -> read admins/{email} from
 * the client SDK -> getIdToken -> build headers -> fetch. This provider is
 * that check, run once per admin session. It is a UX convenience only —
 * verifyAdmin() still runs server-side on every protected route, and a
 * client bypass of this provider proves nothing to the server.
 */
export type AdminSessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'forbidden'; email: string }
  | { status: 'expired' }
  | { status: 'network-error'; message: string }
  | { status: 'ready'; user: User; email: string };

type AdminSessionContextValue = {
  state: AdminSessionState;
  /** Forces a token refresh by default — admin routes always want a fresh token. */
  getToken: GetIdToken;
  /** Re-runs the admins/{email} whitelist check after a network-error state. */
  retry: () => void;
  signOut: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminSessionState>({ status: 'loading' });
  const [retryTick, setRetryTick] = useState(0);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      userRef.current = firebaseUser;
      if (!firebaseUser?.email) {
        setState({ status: 'signed-out' });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
        if (!snap.exists()) {
          setState({ status: 'forbidden', email: firebaseUser.email });
          return;
        }
        setState({ status: 'ready', user: firebaseUser, email: firebaseUser.email });
      } catch (err) {
        setState({
          status: 'network-error',
          message: err instanceof Error ? err.message : 'Could not verify admin access.',
        });
      }
    });
    return () => unsub();
    // retryTick intentionally re-subscribes to re-run the whitelist check.
  }, [retryTick]);

  const getToken = useCallback<GetIdToken>(async (forceRefresh = true) => {
    const user = userRef.current ?? auth.currentUser;
    if (!user) throw new Error('No signed-in user.');
    try {
      return await firebaseGetIdToken(user, forceRefresh);
    } catch (err) {
      // A refresh-token failure mid-session (revoked, expired) is distinct
      // from never having signed in — surface it so the UI can say so.
      setState({ status: 'expired' });
      throw err;
    }
  }, []);

  const retry = useCallback(() => {
    // Set loading before the effect re-subscribes below, rather than inside
    // the effect itself — an effect that unconditionally calls setState as
    // its first synchronous action triggers cascading renders.
    setState({ status: 'loading' });
    setRetryTick((t) => t + 1);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setState({ status: 'signed-out' });
  }, []);

  return (
    <AdminSessionContext.Provider value={{ state, getToken, retry, signOut }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used within an AdminSessionProvider');
  return ctx;
}
