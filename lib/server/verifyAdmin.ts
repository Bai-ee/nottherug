import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { fsGetDoc } from '@/lib/server/firestoreRest';
import { UnauthorizedError, ForbiddenError, ServiceError } from '@/lib/server/errors';

/** Budget for the admins/{email} lookup; the admin routes' own limits are far larger. */
const WHITELIST_TIMEOUT_MS = 5_000;

/**
 * Firebase Admin error codes that mean "this credential is not acceptable":
 * malformed/invalid/expired token, a revoked session, a disabled or deleted
 * user. Everything else thrown by verifyIdToken (Auth backend outage during
 * the revocation check, credential/network errors, non-Firebase errors) is a
 * backend failure and must surface as 500, never as "unauthorized".
 *
 * Known exception: firebase-admin reports a failure to fetch Google's signing
 * keys as `auth/argument-error`, the same code as a malformed token, so that
 * case is answered 401 (as it was before this check existed).
 */
const REJECTED_CREDENTIAL_CODES = new Set([
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/user-disabled',
  'auth/user-not-found',
]);

function errorCode(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

function detailOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Throws UnauthorizedError (401) for a missing/malformed header or a token
 * that is invalid, expired, revoked, or belongs to a disabled/deleted user;
 * ForbiddenError (403) for a verified token whose email is unverified (a
 * re-sign-in cannot fix it, so the client must not loop back to sign-in) or
 * is not on the admin whitelist; and ServiceError (500) if the revocation
 * check or the whitelist lookup itself fails — these must stay distinct so a
 * Firebase/Firestore outage is never reported as "unauthorized".
 *
 * The whitelist key is the token's email exactly as issued: the client reads
 * admins/{user.email} and firestore.rules compares token.email to the doc id
 * unchanged, so normalizing here would make server and rules disagree.
 */
export async function verifyAdmin(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('missing or malformed Authorization header');
  }

  const token = authHeader.slice(7);

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
  try {
    // checkRevoked=true also rejects disabled users (extra Auth backend call).
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch (err) {
    const code = errorCode(err);
    if (code && REJECTED_CREDENTIAL_CODES.has(code)) {
      throw new UnauthorizedError(`token rejected (${code}): ${detailOf(err)}`);
    }
    throw new ServiceError(`token verification backend failure: ${detailOf(err)}`);
  }

  const email = decoded.email;
  if (!email) {
    throw new UnauthorizedError('token has no email claim');
  }
  if (decoded.email_verified !== true) {
    throw new ForbiddenError('email address is not verified');
  }

  let adminDoc: Awaited<ReturnType<typeof fsGetDoc>>;
  try {
    adminDoc = await fsGetDoc(`admins/${email}`, { timeoutMs: WHITELIST_TIMEOUT_MS });
  } catch (err) {
    throw new ServiceError(`admin whitelist lookup failed: ${detailOf(err)}`);
  }

  if (!adminDoc.exists) {
    throw new ForbiddenError('not on admin whitelist');
  }

  return email;
}
