import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Firestore } from '@google-cloud/firestore';

function parsePrivateKey(raw: string): string {
  return raw
    .replace(/^"|"$/g, '')   // strip surrounding quotes
    .replace(/\\n/g, '\n');  // literal \n → real newlines
}

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
  const privateKey  = parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '');

  console.log('[admin] projectId:', projectId);
  console.log('[admin] clientEmail:', clientEmail);
  console.log('[admin] key length:', privateKey.length);
  console.log('[admin] key starts:', privateKey.slice(0, 27));
  console.log('[admin] has newlines:', privateKey.includes('\n'));

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminApp  = initAdmin();
export const adminAuth = getAuth(adminApp);

// Instantiate Firestore directly with explicit credentials so the
// gRPC channel authenticates correctly in serverless environments.
export const adminDb = new Firestore({
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
  credentials: {
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    private_key:  parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? ''),
  },
});
