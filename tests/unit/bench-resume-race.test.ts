/**
 * Audit F03 reproduction, inverted (docs/audits/2026-10-01-evidence/resume-repro.test.ts.txt).
 * The original asserted the bug: one token authorised two concurrent uploads and a
 * stale whole-record save erased an admin's note. These assert the fix.
 * Firestore is an in-memory fake of the conditional-write contract; the same
 * scenarios run against the real emulator in bench-resume-emulator.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

let docs: Map<string, Record<string, unknown>>;
const state = { uploads: 0, hold: false, release: () => {} };

vi.mock('@/lib/server/firestoreRest', async () => ({
  ...(await import('./bench-fs-fake')).firestoreContractFake(() => docs),
}));
vi.mock('@/lib/server/benchIntake', () => ({
  checkBenchRateLimit: async () => true,
  clientIp: () => '192.0.2.1',
  hashResumeToken: (token: string) => createHash('sha256').update(token).digest('hex'),
}));
vi.mock('@/lib/server/firebaseStorage', () => ({
  storageDelete: vi.fn(async () => {}),
  storageUploadPrivate: vi.fn(async () => {
    state.uploads++;
    // The admin edits notes while the (first) upload is in flight.
    const person = docs.get('benchPeople/bench_' + 'a'.repeat(32))!;
    person.notes = 'New note from concurrent admin edit';
    if (state.hold) await new Promise<void>((r) => { state.release = r; });
  }),
}));

const ID = `bench_${'a'.repeat(32)}`;
const token = 'synthetic-token';

function request() {
  const f = new FormData();
  f.set('personId', ID);
  f.set('token', token);
  f.set('file', new Blob(['%PDF-1.4 synthetic audit file'], { type: 'application/pdf' }), 'audit.pdf');
  return new Request('https://example.test/api/bench/apply/resume', { method: 'POST', body: f });
}

beforeEach(() => {
  state.uploads = 0;
  state.hold = false;
  docs = new Map([
    [
      `benchPeople/${ID}`,
      {
        id: ID,
        notes: 'Original note',
        resumePath: null,
        resumeUploadTokenHash: createHash('sha256').update(token).digest('hex'),
        resumeUploadExpiresAt: new Date(Date.now() + 300_000).toISOString(),
      },
    ],
  ]);
});

describe('resume token under concurrency (F03)', () => {
  it('lets one token authorise exactly one upload when two requests arrive together', async () => {
    const { POST } = await import('@/app/api/bench/apply/resume/route');
    const responses = await Promise.all([POST(request()), POST(request())]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 403]);
    expect(state.uploads).toBe(1);
    const person = docs.get(`benchPeople/${ID}`)!;
    expect(person.notes).toBe('New note from concurrent admin edit');
    expect(person.resumePath).toBe(`private/bench-resumes/${ID}.pdf`);
    expect(person.resumeUploadTokenHash).toBeNull();
    expect(person.resumeAttemptId).toEqual(expect.any(String));
  });

  it('refuses a replay while the first upload is still in flight, and keeps the admin note', async () => {
    state.hold = true;
    const { POST } = await import('@/app/api/bench/apply/resume/route');
    const first = POST(request());
    await vi.waitFor(() => expect(state.uploads).toBe(1));

    const replay = await POST(request());
    expect(replay.status).toBe(403);
    expect(state.uploads).toBe(1);

    state.release();
    expect((await first).status).toBe(200);
    const person = docs.get(`benchPeople/${ID}`)!;
    expect(person.notes).toBe('New note from concurrent admin edit');
    expect(person.resumePath).toBe(`private/bench-resumes/${ID}.pdf`);
  });
});
