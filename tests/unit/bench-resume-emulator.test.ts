/**
 * Plan 013 P1 / audit F03: resume token claim and field-scoped bench writers,
 * against the real Firestore emulator. Real routes and the real Firestore REST
 * helpers; only admin auth, email, the AI provider and private object storage
 * are stubbed (the Storage REST helper has no emulator mode, so storage is an
 * in-memory object map with fault injection).
 *
 * Run: PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH firebase emulators:exec \
 *   --config firebase.worker.json --only firestore,storage --project demo-not-the-rug \
 *   "npx vitest run tests/unit/bench-resume-emulator.test.ts"
 * Skips with a reason when the emulator is not reachable; a skip is not a pass.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { applicationPayload } from './bench-fixtures';
import { DEFAULT_BENCH_SETTINGS } from '@/lib/bench/contract';
import { FIRESTORE_EMULATOR_HOST as EMULATOR, firestoreEmulatorReachable } from '../support/emulatorGate';

const PROJECT = 'demo-not-the-rug';
process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT;

const objects = new Map<string, Buffer>();
const storage = {
  failUpload: false,
  onUpload: null as null | (() => Promise<void>),
};
const storageUploadPrivate = vi.fn(async (path: string, buffer: Buffer) => {
  if (storage.failUpload) throw new Error('Private storage upload failed (503)');
  objects.set(path, buffer);
  if (storage.onUpload) await storage.onUpload();
});
const storageDelete = vi.fn(async (path: string) => {
  objects.delete(path);
});
vi.mock('@/lib/server/firebaseStorage', () => ({ storageUploadPrivate, storageDelete }));

vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin: vi.fn(async () => 'luis@nottherug.test') }));

let duringEmail: null | (() => Promise<void>) = null;
const sendEmail = vi.fn(async () => {
  if (duringEmail) await duringEmail();
  return { data: { id: 'mock' }, error: null };
});
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'hello@nottherug.test',
  getFounderEmail: () => 'luis@nottherug.test',
}));

const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Run this file under \`firebase emulators:exec\` ` +
  `(see the header). A skip here is not a pass.`;
let reachable = false;
const realFetch = globalThis.fetch;
let ipCounter = 0;
const PDF = Buffer.from('%PDF-1.7 synthetic resume');

beforeAll(async () => {
  reachable = await firestoreEmulatorReachable();
});

beforeEach(async () => {
  vi.clearAllMocks();
  objects.clear();
  storage.failUpload = false;
  storage.onUpload = null;
  duringEmail = null;
  delete process.env.BENCH_AI_SUMMARIES_ENABLED;
  if (!reachable) return;
  await realFetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function ip() {
  return `198.51.100.${(ipCounter++ % 250) + 1}`;
}

async function apply(overrides: Record<string, unknown> = {}) {
  const { POST } = await import('@/app/api/bench/apply/route');
  const res = await POST(
    new Request('http://localhost/api/bench/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip() },
      body: JSON.stringify(applicationPayload({ hasResume: true, ...overrides })),
    }),
  );
  return (await res.json()) as { id: string; resumeToken?: string; duplicate?: boolean };
}

function uploadRequest(personId: string, token: string, bytes: Buffer = PDF) {
  const form = new FormData();
  form.append('personId', personId);
  form.append('token', token);
  form.append('file', new Blob([new Uint8Array(bytes)]), 'resume.pdf');
  return new Request('http://localhost/api/bench/apply/resume', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip() },
    body: form,
  });
}

async function upload(personId: string, token: string, bytes?: Buffer) {
  const { POST } = await import('@/app/api/bench/apply/resume/route');
  return POST(uploadRequest(personId, token, bytes));
}

async function adminAct(id: string, body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/admin/bench/people/[id]/route');
  return POST(
    new NextRequest(`http://localhost/api/admin/bench/people/${id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function person(id: string) {
  const { fsGetDoc } = await import('@/lib/server/firestoreRest');
  return (await fsGetDoc(`benchPeople/${id}`)).data as Record<string, unknown>;
}

const resumePath = (id: string) => `private/bench-resumes/${id}.pdf`;

describe('resume upload token (emulator)', () => {
  it('stores a resume, consumes the token and records the attempt', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    const res = await upload(id, resumeToken!);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const p = await person(id);
    expect(p).toMatchObject({ resumePath: resumePath(id), resumeKind: 'pdf', resumeUploadTokenHash: null, resumeUploadExpiresAt: null });
    expect(p.resumeAttemptId).toEqual(expect.any(String));
    expect(p.resumeAttemptAt).toEqual(expect.any(String));
    expect(objects.has(resumePath(id))).toBe(true);
  });

  it('lets exactly one of several simultaneous requests with one token upload', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    const responses = await Promise.all([1, 2, 3, 4].map(() => upload(id, resumeToken!)));
    expect(responses.map((r) => r.status).sort()).toEqual([200, 403, 403, 403]);
    expect(storageUploadPrivate).toHaveBeenCalledTimes(1);
    expect((await person(id)).resumePath).toBe(resumePath(id));
  });

  it('403s a replay of a used token without uploading again', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    expect((await upload(id, resumeToken!)).status).toBe(200);
    const again = await upload(id, resumeToken!);
    expect(again.status).toBe(403);
    expect(storageUploadPrivate).toHaveBeenCalledTimes(1);
  });

  it('keeps an admin note edited while the upload is in flight', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    storage.onUpload = async () => {
      expect((await adminAct(id, { action: 'save_notes', notes: 'Edited during upload' })).status).toBe(200);
    };
    expect((await upload(id, resumeToken!)).status).toBe(200);
    const p = await person(id);
    expect(p.notes).toBe('Edited during upload');
    expect(p.resumePath).toBe(resumePath(id));
    expect(p.stage).toBe('review');
  });

  it('403s an expired token and leaves it untouched', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    const { fsMergeDoc } = await import('@/lib/server/firestoreRest');
    await fsMergeDoc(`benchPeople/${id}`, { resumeUploadExpiresAt: new Date(Date.now() - 1000).toISOString() });
    expect((await upload(id, resumeToken!)).status).toBe(403);
    expect(storageUploadPrivate).not.toHaveBeenCalled();
    expect((await person(id)).resumeAttemptId).toBeUndefined();
  });

  it('refuses to claim when a resume is already stored, so it can never be overwritten', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    const { fsMergeDoc } = await import('@/lib/server/firestoreRest');
    await fsMergeDoc(`benchPeople/${id}`, { resumePath: resumePath(id), resumeKind: 'pdf' });
    expect((await upload(id, resumeToken!)).status).toBe(403);
    expect(storageUploadPrivate).not.toHaveBeenCalled();
  });

  it('403s a wrong token without consuming the real one', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    expect((await upload(id, 'f'.repeat(48))).status).toBe(403);
    expect((await upload(id, resumeToken!)).status).toBe(200);
  });

  it('rejects a bad file before the token is spent', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    expect((await upload(id, resumeToken!, Buffer.from('<script>'))).status).toBe(415);
    const p = await person(id);
    expect(p.resumeUploadTokenHash).toEqual(expect.any(String));
    expect(p.resumeAttemptId).toBeUndefined();
    expect((await upload(id, resumeToken!)).status).toBe(200);
  });

  it('on a storage failure keeps the application, leaves the token consumed, and cleans only its own object', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    storage.failUpload = true;
    const res = await upload(id, resumeToken!);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Could not save your resume. Your application is still on file.');

    const p = await person(id);
    expect(p).toMatchObject({ fullName: 'Sam Rivera', stage: 'review', resumePath: null, resumeUploadTokenHash: null });
    expect(p.resumeAttemptId).toEqual(expect.any(String));
    expect(storageDelete).toHaveBeenCalledWith(resumePath(id), expect.anything());

    // Documented behaviour: the link is not re-opened. The applicant emails the resume instead.
    storage.failUpload = false;
    expect((await upload(id, resumeToken!)).status).toBe(403);
    expect(storageUploadPrivate).toHaveBeenCalledTimes(1);
  });

  it('on a finalization failure keeps the application and deletes the object it uploaded', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    storage.onUpload = async () => {
      // From here every Firestore write fails, as if the database dropped after the upload.
      vi.stubGlobal('fetch', (url: string | URL | Request, init?: RequestInit) =>
        (init?.method === 'PATCH' || String(url).includes(':commit')) && String(url).includes('/documents')
          ? Promise.resolve(new Response('unavailable', { status: 503 }))
          : realFetch(url, init),
      );
    };
    const res = await upload(id, resumeToken!);
    vi.unstubAllGlobals();

    expect(res.status).toBe(500);
    expect(storageDelete).toHaveBeenCalledWith(resumePath(id), expect.anything());
    expect(objects.has(resumePath(id))).toBe(false);
    const p = await person(id);
    expect(p).toMatchObject({ fullName: 'Sam Rivera', resumePath: null });
    expect(p.resumeAttemptId).toEqual(expect.any(String));
  });

  it('does not finalize, or delete anything, when another attempt owns the record', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    storage.onUpload = async () => {
      const { fsMergeDoc } = await import('@/lib/server/firestoreRest');
      await fsMergeDoc(`benchPeople/${id}`, { resumeAttemptId: 'someone-else' });
    };
    const res = await upload(id, resumeToken!);
    expect(res.status).toBe(500);
    const p = await person(id);
    expect(p.resumePath).toBeNull();
    expect(p.resumeAttemptId).toBe('someone-else');
    expect(storageDelete).not.toHaveBeenCalled();
  });
});

describe('other bench writers stay field-scoped (emulator)', () => {
  it('an apply submitted twice is one person, one email and one token', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const first = await apply();
    const second = await apply({ email: 'SAM@example.test', fullName: 'Samuel Rivera' });
    expect(second).toEqual({ ok: true, id: first.id, duplicate: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((await person(first.id)).fullName).toBe('Sam Rivera');
    expect((await upload(first.id, first.resumeToken!)).status).toBe(200);
  });

  it('records the notification outcome without overwriting an admin edit made during the send', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    duringEmail = async () => {
      const { id } = (await (await import('@/lib/server/bench')).listBenchPeople())[0];
      expect((await adminAct(id, { action: 'save_notes', notes: 'Call after 5pm' })).status).toBe(200);
      expect((await adminAct(id, { action: 'hold' })).status).toBe(200);
    };
    const { id } = await apply({ hasResume: false });
    const p = await person(id);
    expect(p.notes).toBe('Call after 5pm');
    expect(p.onHold).toBe(true);
    expect(p.notifications).toEqual({ received: 'sent' });
  });

  it('auto-invite stores the stage before the invite email, and sends it exactly once', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc } = await import('@/lib/server/firestoreRest');
    await fsSetDoc('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, autoInviteOnGap: true, shadowBookingUrl: 'https://calendly.test/shadow' });
    const { benchPersonIdForEmail } = await import('@/lib/server/benchIntake');
    const expectedId = benchPersonIdForEmail('sam@example.test');
    let stageAtSend: unknown;
    duringEmail = async () => {
      stageAtSend = (await person(expectedId)).stage;
    };
    const { id } = await apply({ hasResume: false });
    expect(stageAtSend).toBe('shadow_invited');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]).toEqual([expect.objectContaining({ text: expect.stringContaining('https://calendly.test/shadow') })]);
    const p = await person(id);
    expect(p.stage).toBe('shadow_invited');
    expect(p.notifications).toEqual({ shadowInvite: 'sent' });
    expect((p.stageHistory as Array<{ by: string }>).at(-1)?.by).toBe('auto-invite');
  });

  it('confirms an auto-invite stage write whose acknowledgement was lost, then sends the invite once', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc } = await import('@/lib/server/firestoreRest');
    await fsSetDoc('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, autoInviteOnGap: true, shadowBookingUrl: 'https://calendly.test/shadow' });
    let dropped = 0;
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      const res = await realFetch(url, init);
      // Only the conditional write of benchPeople stage (not the rate-limit increment, not the outcome save).
      if (String(url).includes(':commit') && typeof init?.body === 'string') {
        const body = JSON.parse(init.body) as { writes?: Array<{ update?: { name?: string }; updateMask?: { fieldPaths?: string[] }; currentDocument?: unknown }> };
        const isStageWrite = body.writes?.some(
          (w) => w.currentDocument && w.update?.name?.includes('/benchPeople/') && w.updateMask?.fieldPaths?.includes('stage'),
        );
        if (isStageWrite) {
          dropped++; // the write reached the emulator and committed; the caller sees a network failure
          throw new Error('socket hang up');
        }
      }
      return res;
    });
    const { id } = await apply({ hasResume: false });
    vi.unstubAllGlobals();
    expect(dropped).toBe(1);
    expect((await person(id)).stage).toBe('shadow_invited');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]).toEqual([expect.objectContaining({ text: expect.stringContaining('https://calendly.test/shadow') })]);
  });

  it('sends no invite when an admin moved the person out of review first (admin state wins)', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc } = await import('@/lib/server/firestoreRest');
    await fsSetDoc('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, autoInviteOnGap: true, shadowBookingUrl: 'https://calendly.test/shadow' });
    const { benchPersonIdForEmail } = await import('@/lib/server/benchIntake');
    const expectedId = benchPersonIdForEmail('sam@example.test');
    // The admin acts between the application being created and the auto-invite stage write:
    // intercept the coverage query that precedes it.
    let acted = false;
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      if (!acted && String(url).includes(':runQuery')) {
        acted = true;
        expect((await adminAct(expectedId, { action: 'reject' })).status).toBe(200);
      }
      return realFetch(url, init);
    });
    const { id } = await apply({ hasResume: false });
    vi.unstubAllGlobals();
    expect(acted).toBe(true);
    const p = await person(id);
    expect(p.stage).toBe('rejected');
    for (const call of sendEmail.mock.calls as unknown as Array<[{ text: string }]>) {
      expect(call[0].text).not.toContain('calendly.test');
    }
  });

  it('an AI summary finishing after an admin edit adds only aiSummary', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id } = await apply({ hasResume: false });
    process.env.BENCH_AI_SUMMARIES_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      if (!String(url).includes('api.anthropic.com')) return realFetch(url, init);
      expect((await adminAct(id, { action: 'save_notes', notes: 'Edited during the model call' })).status).toBe(200);
      expect((await adminAct(id, { action: 'invite_shadow' })).status).toBe(200);
      return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Summary: neutral' }] }));
    });
    const { summarizeApplication } = await import('@/lib/server/benchSummary');
    await summarizeApplication(id, { morning: 'Morning' });
    vi.unstubAllGlobals();

    const p = await person(id);
    expect(p.aiSummary).toBe('Summary: neutral');
    expect(p.notes).toBe('Edited during the model call');
    expect(p.stage).toBe('shadow_invited');
  });

  it('an AI summary for a deleted person does not recreate the record', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id } = await apply({ hasResume: false });
    process.env.BENCH_AI_SUMMARIES_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const { fsDeleteDoc, fsGetDoc } = await import('@/lib/server/firestoreRest');
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      if (!String(url).includes('api.anthropic.com')) return realFetch(url, init);
      await fsDeleteDoc(`benchPeople/${id}`);
      return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Summary: x' }] }));
    });
    const { summarizeApplication } = await import('@/lib/server/benchSummary');
    await summarizeApplication(id, {});
    vi.unstubAllGlobals();
    expect((await fsGetDoc(`benchPeople/${id}`)).exists).toBe(false);
  });

  it('an admin note saved after a resume lands leaves the resume fields alone', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { id, resumeToken } = await apply();
    expect((await upload(id, resumeToken!)).status).toBe(200);
    expect((await adminAct(id, { action: 'save_notes', notes: 'After resume' })).status).toBe(200);
    const p = await person(id);
    expect(p.resumePath).toBe(resumePath(id));
    expect(p.resumeKind).toBe('pdf');
    expect(p.notes).toBe('After resume');
  });
});
