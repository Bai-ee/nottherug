import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { fsGetDoc } from '@/lib/server/firestoreRest';
import { UnauthorizedError, ForbiddenError, ServiceError } from '@/lib/server/errors';

/**
 * Throws UnauthorizedError (401) for a missing/malformed header or a token
 * that fails verification, ForbiddenError (403) for a verified identity not
 * on the admin whitelist, and ServiceError (500) if the whitelist lookup
 * itself fails — these must stay distinct so a Firestore outage is never
 * reported to the client as "unauthorized".
 */
export async function verifyAdmin(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('missing or malformed Authorization header');
  }

  const token = authHeader.slice(7);

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (err) {
    throw new UnauthorizedError(`token verification failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const email = decoded.email;
  if (!email) {
    throw new UnauthorizedError('token has no email claim');
  }

  let adminDoc: Awaited<ReturnType<typeof fsGetDoc>>;
  try {
    adminDoc = await fsGetDoc(`admins/${email}`);
  } catch (err) {
    throw new ServiceError(`admin whitelist lookup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!adminDoc.exists) {
    throw new ForbiddenError('not on admin whitelist');
  }

  return email;
}
