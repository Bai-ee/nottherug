import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

/**
 * Extracts the Bearer token from the request, verifies it with Firebase Auth,
 * then checks the admins/{email} Firestore whitelist.
 * Returns the admin email on success; throws on failure.
 */
export async function verifyAdmin(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: missing or malformed Authorization header');
  }

  const token = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);
  const email = decoded.email;

  if (!email) {
    throw new Error('Unauthorized: token has no email claim');
  }

  const adminDoc = await adminDb.doc(`admins/${email}`).get();
  if (!adminDoc.exists) {
    throw new Error('Forbidden: not on admin whitelist');
  }

  return email;
}
