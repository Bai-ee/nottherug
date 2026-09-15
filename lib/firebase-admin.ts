import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminConfig, readOptionalEnv } from '@/lib/server/env';

function parsePrivateKey(raw: string): string {
  return raw
    .replace(/^"|"$/g, '')   // strip surrounding quotes
    .replace(/\\n/g, '\n');  // literal \n → real newlines
}

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const { projectId, clientEmail, privateKey } = getFirebaseAdminConfig();

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: parsePrivateKey(privateKey) }),
    // Optional here: the Admin SDK's storage client is unused (see
    // lib/server/firebaseStorage.ts), so a missing bucket must not block
    // routes — like admin auth — that never touch Storage.
    storageBucket: readOptionalEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  });
}

export const adminApp  = initAdmin();
export const adminAuth = getAuth(adminApp);
