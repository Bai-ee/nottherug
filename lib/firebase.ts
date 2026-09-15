import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Fail with a clear, name-only message instead of Firebase's opaque
// "invalid options" error when a NEXT_PUBLIC_FIREBASE_* build var is unset.
const REQUIRED_CLIENT_CONFIG_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingClientConfigKeys = REQUIRED_CLIENT_CONFIG_KEYS.filter((key) => !firebaseConfig[key]);
if (missingClientConfigKeys.length > 0) {
  throw new Error(`Missing required Firebase client config: ${missingClientConfigKeys.join(', ')}`);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
