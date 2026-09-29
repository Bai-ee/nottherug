import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { storageUploadPrivate } from '@/lib/server/firebaseStorage';
import { BENCH_RESUME_PREFIX, RESUME_MAX_BYTES, RESUME_TYPES } from '@/lib/bench/contract';
import { detectResumeKind } from '@/lib/bench/resume';
import { getBenchPerson, isBenchPersonId, saveBenchPerson } from '@/lib/server/bench';
import { checkBenchRateLimit, clientIp, hashResumeToken } from '@/lib/server/benchIntake';

/**
 * Resume upload for a just-submitted application. Kept off the JSON apply
 * route so a multi-megabyte file never rides in that body. Authorized only by
 * the single-use token the apply route returned, which expires in 30 minutes.
 * Files land under private/, which storage.rules denies to every client; Luis
 * reads them only through the admin resume route.
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

export async function POST(req: Request) {
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

  const person = await getBenchPerson(personId).catch(() => null);
  const expiresAt = person?.resumeUploadExpiresAt ? Date.parse(person.resumeUploadExpiresAt) : 0;
  if (!person?.resumeUploadTokenHash || expiresAt < Date.now() || !tokensMatch(person.resumeUploadTokenHash, token)) {
    return errorJson(403, 'This upload link has expired. Email your resume to us instead.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectResumeKind(buffer);
  if (!kind) return errorJson(415, 'Resume must be a PDF or Word (.docx) file.');

  const path = `${BENCH_RESUME_PREFIX}/${personId}.${kind}`;
  try {
    await storageUploadPrivate(path, buffer, RESUME_TYPES[kind]);
    await saveBenchPerson({
      ...person,
      resumePath: path,
      resumeKind: kind,
      resumeUploadTokenHash: null,
      resumeUploadExpiresAt: null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[bench:resume] upload failed', err instanceof Error ? err.message : 'unknown');
    return errorJson(500, 'Could not save your resume. Your application is still on file.');
  }

  return NextResponse.json({ ok: true });
}
