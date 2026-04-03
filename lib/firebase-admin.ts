import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function parsePrivateKey(raw: string): string {
  return raw
    .replace(/^"|"$/g, '')   // strip surrounding quotes
    .replace(/\\n/g, '\n');  // literal \n → real newlines
}

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId   = (process.env.FIREBASE_ADMIN_PROJECT_ID ?? '').trim();
  const clientEmail = (process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? '').trim();
  const privateKey  = parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '');

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminApp  = initAdmin();
export const adminAuth = getAuth(adminApp);
