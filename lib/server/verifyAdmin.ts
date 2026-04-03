import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { fsGetDoc } from '@/lib/server/firestoreRest';

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

  const adminDoc = await fsGetDoc(`admins/${email}`);
  if (!adminDoc.exists) {
    throw new Error('Forbidden: not on admin whitelist');
  }

  return email;
}
