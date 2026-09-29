/**
 * app/api/bench/apply/route.ts and app/api/bench/apply/resume/route.ts.
 * Firestore, Storage and Resend are mocked: nothing here reaches a network
 * and no real email is sent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_BENCH_SETTINGS } from '@/lib/bench/contract';
import { applicationPayload } from './bench-fixtures';

let docs: Map<string, Record<string, unknown>>;
let rateCount: number;

const fsCreateDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  if (docs.has(path)) return { created: false };
  docs.set(path, data);
  return { created: true };
});
const fsGetDoc = vi.fn(async (path: string) => {
  const data = docs.get(path);
  return data ? { exists: true, data } : { exists: false };
});
const fsSetDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  docs.set(path, data);
});
const fsQueryCollection = vi.fn(async () => [...docs.entries()].filter(([p]) => p.startsWith('benchPeople/')).map(([, d]) => d));
const fsIncrementField = vi.fn(async () => ++rateCount);

vi.mock('@/lib/server/firestoreRest', () => ({
  fsCreateDoc,
  fsGetDoc,
  fsSetDoc,
  fsQueryCollection,
  fsIncrementField,
  fsDeleteDoc: vi.fn(),
}));

const sendEmail = vi.fn(async () => ({ data: { id: 'mock' }, error: null }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'Not The Rug <hello@nottherug.test>',
  getFounderEmail: () => 'luis@nottherug.test',
}));

const storageUploadPrivate = vi.fn(async () => {});
vi.mock('@/lib/server/firebaseStorage', () => ({ storageUploadPrivate }));

function post(body: unknown) {
  return new Request('http://localhost/api/bench/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function stored(id: string) {
  return docs.get(`benchPeople/${id}`) as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  docs = new Map();
  rateCount = 0;
  delete process.env.BENCH_AI_SUMMARIES_ENABLED;
});

describe('POST /api/bench/apply', () => {
  it('saves an application to review and sends the confirmation email', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    const res = await POST(post(applicationPayload()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.id).toMatch(/^bench_[a-f0-9]{32}$/);
    expect(body.resumeToken).toBeUndefined();

    const person = stored(body.id);
    expect(person.stage).toBe('review');
    expect(person.fullName).toBe('Sam Rivera');
    expect(person.firstName).toBe('Sam');
    expect(person.email).toBe('sam@example.test');
    expect(person.areas).toEqual(['williamsburg']);
    expect(person.confirmedAt).toEqual(expect.any(String));
    expect(person.phoneE164).toBe('+13475550101');
    expect(person.source).toBe('indeed');
    expect(person.smsConsentAt).toEqual(expect.any(String));
    expect((person.answers as Record<string, unknown>).experience).toContain('labs');
    expect((person.answers as Record<string, unknown>).scenarioCantMakeShift).toContain('reassign');
    expect(person.stageHistory).toEqual([
      expect.objectContaining({ stage: 'applied', by: 'applicant' }),
      expect.objectContaining({ stage: 'review', by: 'applicant' }),
    ]);
    expect(person.notifications).toEqual({ received: 'sent' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]).toEqual([expect.objectContaining({ to: 'sam@example.test', subject: expect.stringContaining('We got your on-call application') })]);
  });

  it('records no SMS consent unless the box was ticked', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    const body = await (await POST(post(applicationPayload({ smsConsent: false })))).json();
    expect(stored(body.id).smsConsentAt).toBeNull();
  });

  it('rejects a knockout answer with a kind email and no resume link', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    const body = await (await POST(post(applicationPayload({ willingTraining: 'no', hasResume: true })))).json();

    expect(body.ok).toBe(true);
    expect(body.resumeToken).toBeUndefined();
    const person = stored(body.id);
    expect(person.stage).toBe('rejected');
    expect(person.knockoutReason).toBe('no_training');
    expect(person.notifications).toEqual({ closed: 'sent' });
  });

  it('returns a single-use resume token only when a resume will follow', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    const body = await (await POST(post(applicationPayload({ hasResume: true })))).json();
    expect(body.resumeToken).toMatch(/^[a-f0-9]{48}$/);
    const person = stored(body.id);
    expect(person.resumeUploadTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(person.resumeUploadTokenHash).not.toBe(body.resumeToken);
  });

  it('treats the same email applying twice as one person and sends no second email', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    const first = await (await POST(post(applicationPayload()))).json();
    const second = await (await POST(post(applicationPayload({ email: 'SAM@example.test', fullName: 'Samuel Rivera' })))).json();

    expect(second).toEqual({ ok: true, id: first.id, duplicate: true });
    expect(stored(first.id).fullName).toBe('Sam Rivera');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('auto-invites only when Luis has switched it on and the applicant fills a gap', async () => {
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, autoInviteOnGap: true, shadowBookingUrl: 'https://calendly.test/shadow' });
    const { POST } = await import('@/app/api/bench/apply/route');
    const body = await (await POST(post(applicationPayload()))).json();

    const person = stored(body.id);
    expect(person.stage).toBe('shadow_invited');
    expect(person.notifications).toEqual({ shadowInvite: 'sent' });
    expect(sendEmail.mock.calls[0]).toEqual([expect.objectContaining({ text: expect.stringContaining('https://calendly.test/shadow') })]);
  });

  it('leaves auto-invite off by default', async () => {
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, shadowBookingUrl: 'https://calendly.test/shadow' });
    const { POST } = await import('@/app/api/bench/apply/route');
    const body = await (await POST(post(applicationPayload()))).json();
    expect(stored(body.id).stage).toBe('review');
  });

  it('400s a filled honeypot without writing anything', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    const res = await POST(post(applicationPayload({ website: 'http://spam.test' })));
    expect(res.status).toBe(400);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('400s malformed JSON and invalid fields', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    expect((await POST(post('{not json'))).status).toBe(400);
    const res = await POST(post(applicationPayload({ phone: '12' })));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'phone' })]));
  });

  it('413s an oversized body', async () => {
    const { POST } = await import('@/app/api/bench/apply/route');
    const res = await POST(post(applicationPayload({ experience: 'x'.repeat(25_000) })));
    expect(res.status).toBe(413);
  });

  it('429s past the per-IP rate limit', async () => {
    rateCount = 5;
    const { POST } = await import('@/app/api/bench/apply/route');
    const res = await POST(post(applicationPayload()));
    expect(res.status).toBe(429);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('still saves the application when the email provider fails', async () => {
    sendEmail.mockResolvedValueOnce({ data: null, error: { message: 'Invalid `to`: sam@example.test' } } as never);
    const { POST } = await import('@/app/api/bench/apply/route');
    const body = await (await POST(post(applicationPayload()))).json();
    expect(body.ok).toBe(true);
    expect(stored(body.id).notifications).toEqual({ received: 'failed' });
  });
});

describe('POST /api/bench/apply/resume', () => {
  async function applyWithResume() {
    const { POST } = await import('@/app/api/bench/apply/route');
    return (await (await POST(post(applicationPayload({ hasResume: true })))).json()) as { id: string; resumeToken: string };
  }

  function upload(personId: string, token: string, bytes: Buffer, name = 'resume.pdf') {
    const form = new FormData();
    form.append('personId', personId);
    form.append('token', token);
    form.append('file', new Blob([new Uint8Array(bytes)]), name);
    return new Request('http://localhost/api/bench/apply/resume', { method: 'POST', body: form });
  }

  it('stores a PDF privately and burns the token', async () => {
    const { id, resumeToken } = await applyWithResume();
    const { POST } = await import('@/app/api/bench/apply/resume/route');
    const res = await POST(upload(id, resumeToken, Buffer.from('%PDF-1.7 test')));

    expect(res.status).toBe(200);
    expect(storageUploadPrivate).toHaveBeenCalledWith(`private/bench-resumes/${id}.pdf`, expect.any(Buffer), 'application/pdf');
    const person = stored(id);
    expect(person.resumePath).toBe(`private/bench-resumes/${id}.pdf`);
    expect(person.resumeUploadTokenHash).toBeNull();

    const again = await POST(upload(id, resumeToken, Buffer.from('%PDF-1.7 test')));
    expect(again.status).toBe(403);
  });

  it('403s a wrong token', async () => {
    const { id } = await applyWithResume();
    const { POST } = await import('@/app/api/bench/apply/resume/route');
    expect((await POST(upload(id, 'f'.repeat(48), Buffer.from('%PDF-1.7')))).status).toBe(403);
    expect(storageUploadPrivate).not.toHaveBeenCalled();
  });

  it('403s an expired token', async () => {
    const { id, resumeToken } = await applyWithResume();
    stored(id).resumeUploadExpiresAt = new Date(Date.now() - 1000).toISOString();
    const { POST } = await import('@/app/api/bench/apply/resume/route');
    expect((await POST(upload(id, resumeToken, Buffer.from('%PDF-1.7')))).status).toBe(403);
  });

  it('415s a file that is not really a PDF or DOCX, whatever its name', async () => {
    const { id, resumeToken } = await applyWithResume();
    const { POST } = await import('@/app/api/bench/apply/resume/route');
    expect((await POST(upload(id, resumeToken, Buffer.from('<script>'), 'resume.pdf'))).status).toBe(415);
  });

  it('400s a malformed person id before touching Firestore', async () => {
    const { POST } = await import('@/app/api/bench/apply/resume/route');
    expect((await POST(upload('../leads/x', 'token', Buffer.from('%PDF-1.7')))).status).toBe(400);
    expect(fsGetDoc).not.toHaveBeenCalled();
  });
});
