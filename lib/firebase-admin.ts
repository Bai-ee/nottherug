import * as admin from 'firebase-admin';

function initAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '';
  const privateKey = rawKey
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  console.log('[admin] projectId:', projectId);
  console.log('[admin] clientEmail:', clientEmail);
  console.log('[admin] key starts with:', privateKey.slice(0, 40));
  console.log('[admin] key ends with:', privateKey.slice(-40));
  console.log('[admin] key length:', privateKey.length);
  console.log('[admin] has real newlines:', privateKey.includes('\n'));

  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket,
    });
  }

  // Fallback: Application Default Credentials (GCP / CI environment)
  return admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket,
  });
}

export const adminApp = initAdmin();

export const adminAuth = admin.auth(adminApp);
export const adminDb = admin.firestore(adminApp);
