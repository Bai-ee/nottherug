import * as admin from 'firebase-admin';

function initAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

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
