import { createHash, randomBytes } from 'node:crypto';
import { fsIncrementField } from '@/lib/server/firestoreRest';
import { BENCH_COLLECTIONS } from '@/lib/bench/contract';

/**
 * Guards shared by the public bench routes (apply, resume upload), copied
 * from app/api/leads/meetgreet/route.ts's trust model.
 */

/** Trusts the first x-forwarded-for entry, which Vercel's edge overwrites rather than appends to. */
export function clientIp(req: Request): string {
  const first = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (first) return first;
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Durable per-IP limit backed by Firestore (an in-memory Map resets on every
 * cold start). Fails open: a limiter outage must not block real applicants.
 */
export async function checkBenchRateLimit(
  ip: string,
  scope: string,
  maxPerWindow: number,
  windowMs = 15 * 60 * 1000,
): Promise<boolean> {
  try {
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const count = await fsIncrementField(
      `${BENCH_COLLECTIONS.rateLimits}/${scope}_${ipHash}_${windowStart}`,
      'count',
      1,
      { windowStart, expiresAt: new Date(windowStart + windowMs * 2) },
    );
    return count <= maxPerWindow;
  } catch (err) {
    console.error(`[bench:${scope}] rate limit check failed`, err instanceof Error ? err.message : 'unknown');
    return true;
  }
}

export async function readCappedText(req: Request, maxBytes: number): Promise<string | null> {
  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) return null;
  if (!req.body) {
    const text = await req.text();
    return Buffer.byteLength(text, 'utf8') > maxBytes ? null : text;
  }
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

/** One row per address: re-applying finds the existing person instead of stacking a duplicate. */
export function benchPersonIdForEmail(email: string): string {
  return `bench_${createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)}`;
}

/** A single-use token that lets the applicant's browser attach a resume to the record it just created. */
export function newResumeToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('hex');
  return { token, hash: hashResumeToken(token) };
}

export function hashResumeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
