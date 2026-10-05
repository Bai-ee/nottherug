import { NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { storageDelete, storageUploadPrivate } from '@/lib/server/firebaseStorage';
import { FirestorePreconditionError, withOptimisticRetry } from '@/lib/server/firestoreRest';
import { BENCH_RESUME_PREFIX, RESUME_MAX_BYTES, RESUME_TYPES } from '@/lib/bench/contract';
import { detectResumeKind } from '@/lib/bench/resume';
import { getBenchPersonWithMeta, isBenchPersonId, mergeBenchPerson } from '@/lib/server/bench';
import { checkBenchRateLimit, clientIp, hashResumeToken } from '@/lib/server/benchIntake';

/**
 * Resume upload for a just-submitted application. Kept off the JSON apply
 * route so a multi-megabyte file never rides in that body. Authorized only by
 * the single-use token the apply route returned, which expires in 30 minutes.
 * Files land under private/, which storage.rules denies to every client; Luis
 * reads them only through the admin resume route.
 *
 * Order of operations (plans/013 P1, F03):
 *   1. validate the file (size, signature)           nothing written
 *   2. claim the token: one conditional write that clears the token hash and
 *      records resumeAttemptId. Exactly one concurrent request wins; a loser
 *      sees no token and gets the same 403 as an already-used link.
 *   3. only the winner uploads to private storage
 *   4. finalize: write ONLY resumePath/resumeKind/updatedAt, conditional on the
 *      attempt still being ours
 * A failure after the claim does NOT re-open the token: the application stays
 * on file and the applicant is told to email the resume (the form already shows
 * that fallback for any non-OK response). Only the object this attempt wrote is
 * ever deleted. Never auto-retried: an upload or finalize that timed out is
 * ambiguous.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

// Multipart framing adds a little over the file itself.
const MAX_REQUEST_BYTES = RESUME_MAX_BYTES + 64 * 1024;

function errorJson(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function tokensMatch(expectedHash: string, token: string): boolean {
  const actual = Buffer.from(hashResumeToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// maxDuration is 30 s. Leave a margin for the response, and give each step a
// slice that still reserves time for the steps after it.
const ROUTE_BUDGET_MS = 27_000;
const CLAIM_RESERVE_MS = 20_000; // upload + finalize + cleanup still need to fit
const UPLOAD_CAP_MS = 15_000;
const UPLOAD_RESERVE_MS = 8_000; // finalize + cleanup
const FINALIZE_RESERVE_MS = 3_000; // cleanup
const STEP_CAP_MS = 5_000;
const MIN_STEP_MS = 1_000;

const FAILED_SAVE = 'Could not save your resume. Your application is still on file.';
const EXPIRED_LINK = 'This upload link has expired. Email your resume to us instead.';

/** The token is missing, expired, wrong, or already claimed. */
class TokenRejectedError extends Error {}
/** Another attempt owns the record now; this one must not finalize. */
class AttemptLostError extends Error {}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const slice = (cap: number, reserve = 0) =>
    Math.max(MIN_STEP_MS, Math.min(cap, ROUTE_BUDGET_MS - (Date.now() - startedAt) - reserve));

  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > MAX_REQUEST_BYTES) return errorJson(413, 'Resume must be 4MB or smaller.');

  if (!(await checkBenchRateLimit(clientIp(req), 'resume', 5))) {
    return errorJson(429, 'Too many requests. Please try again later.');
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorJson(400, 'Invalid upload');
  }

  const personId = form.get('personId');
  const token = form.get('token');
  const file = form.get('file');
  if (typeof personId !== 'string' || !isBenchPersonId(personId) || typeof token !== 'string' || !token) {
    return errorJson(400, 'Invalid upload');
  }
  if (!(file instanceof Blob)) return errorJson(400, 'No file provided');
  if (file.size > RESUME_MAX_BYTES) return errorJson(413, 'Resume must be 4MB or smaller.');

  // Validate the file before the token is spent: a bad file must not burn the link.
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectResumeKind(buffer);
  if (!kind) return errorJson(415, 'Resume must be a PDF or Word (.docx) file.');

  const path = `${BENCH_RESUME_PREFIX}/${personId}.${kind}`;
  const attemptId = randomBytes(16).toString('hex');

  // Step 2: claim. Re-reads and re-validates on every attempt, so an admin edit
  // between the read and the write only costs a retry, never the token.
  let priorResumePath: string | null | undefined;
  try {
    await withOptimisticRetry(async () => {
      const stepMs = slice(STEP_CAP_MS, CLAIM_RESERVE_MS);
      const { person, updateTime } = await getBenchPersonWithMeta(personId, { timeoutMs: stepMs });
      const expiresAt = person?.resumeUploadExpiresAt ? Date.parse(person.resumeUploadExpiresAt) : 0;
      if (!person?.resumeUploadTokenHash || !(expiresAt >= Date.now()) || !tokensMatch(person.resumeUploadTokenHash, token)) {
        throw new TokenRejectedError();
      }
      // Tokens are only issued at application creation (resumePath null), so this never fires today;
      // it guarantees an upload can never overwrite a stored resume if a token is ever re-issued.
      if (person.resumePath) throw new TokenRejectedError();
      if (!updateTime) throw new Error('Person read returned no updateTime');
      priorResumePath = person.resumePath;
      const nowIso = new Date().toISOString();
      await mergeBenchPerson(
        personId,
        { resumeUploadTokenHash: null, resumeUploadExpiresAt: null, resumeAttemptId: attemptId, resumeAttemptAt: nowIso },
        { precondition: { updateTime }, timeoutMs: stepMs },
      );
    });
  } catch (err) {
    if (err instanceof TokenRejectedError) return errorJson(403, EXPIRED_LINK);
    // Includes a record that stayed busy past the retry limit: the token is untouched, so the link still works.
    console.error('[bench:resume] claim failed', errorLabel(err));
    return errorJson(503, 'Could not save your resume right now. Your application is still on file.');
  }

  // Step 3: only the claim winner reaches storage.
  try {
    await storageUploadPrivate(path, buffer, RESUME_TYPES[kind], { timeoutMs: slice(UPLOAD_CAP_MS, UPLOAD_RESERVE_MS) });
  } catch (err) {
    console.error('[bench:resume] upload failed', errorLabel(err));
    await removeOwnObject(path, priorResumePath, slice(STEP_CAP_MS));
    return errorJson(500, FAILED_SAVE);
  }

  // Step 4: finalize resume-owned fields only, while the attempt is still ours.
  try {
    await withOptimisticRetry(async () => {
      const stepMs = slice(STEP_CAP_MS, FINALIZE_RESERVE_MS);
      const { person, updateTime } = await getBenchPersonWithMeta(personId, { timeoutMs: stepMs });
      if (!person || person.resumeAttemptId !== attemptId) throw new AttemptLostError();
      if (!updateTime) throw new Error('Person read returned no updateTime');
      await mergeBenchPerson(
        personId,
        { resumePath: path, resumeKind: kind, updatedAt: new Date().toISOString() },
        { precondition: { updateTime }, timeoutMs: stepMs },
      );
    });
  } catch (err) {
    console.error('[bench:resume] finalize failed', errorLabel(err));
    // A timed-out write is ambiguous: it may have landed. Decide from a fresh read.
    if (!(err instanceof AttemptLostError)) {
      const finalized = await finalizedByThisAttempt(personId, attemptId, path);
      if (finalized === true) return NextResponse.json({ ok: true });
      if (finalized === false) await removeOwnObject(path, priorResumePath, slice(STEP_CAP_MS));
    }
    return errorJson(500, FAILED_SAVE);
  }

  return NextResponse.json({ ok: true });
}

function errorLabel(err: unknown): string {
  if (err instanceof FirestorePreconditionError) return 'record kept changing';
  return err instanceof Error ? err.message : 'unknown';
}

/** true: our finalize landed; false: it did not; null: could not tell. */
async function finalizedByThisAttempt(personId: string, attemptId: string, path: string): Promise<boolean | null> {
  try {
    const { person } = await getBenchPersonWithMeta(personId, { timeoutMs: MIN_STEP_MS * 2 });
    if (!person) return null;
    return person.resumeAttemptId === attemptId && person.resumePath === path;
  } catch {
    return null;
  }
}

/** Best effort. Skipped when the same path already held a finalized resume, which this attempt must not delete. */
async function removeOwnObject(path: string, priorResumePath: string | null | undefined, timeoutMs: number): Promise<void> {
  if (priorResumePath === path) return;
  try {
    await storageDelete(path, { timeoutMs });
  } catch (err) {
    console.error('[bench:resume] cleanup failed', errorLabel(err));
  }
}
