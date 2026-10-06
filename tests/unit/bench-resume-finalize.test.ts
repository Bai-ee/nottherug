/**
 * Resume finalize outcomes (Plan 013 P5, Codex review of 8733c40).
 *
 * A finalize write that times out is ambiguous: it may already have landed, or it may land after any
 * read the route makes. The uploaded object must therefore be kept unless the write was definitely
 * rejected. Store and storage are in-memory fakes so each interleaving is exact.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { FirestorePreconditionError } from '@/lib/server/errors';

type Finalize = 'timeout-late-commit' | 'timeout-committed' | 'timeout-never' | 'precondition';

const s = vi.hoisted(() => ({
  person: {} as Record<string, unknown>,
  objects: new Set<string>(),
  finalize: 'timeout-never' as string,
  confirmFails: false,
  late: (() => {}) as () => void,
  reads: 0,
}));

vi.mock('@/lib/server/bench', () => ({
  isBenchPersonId: () => true,
  getBenchPersonWithMeta: async () => {
    s.reads += 1;
    // The claim read, the finalize read, then (on failure) the confirmation read.
    if (s.confirmFails && s.reads >= 3) throw new Error('read timed out');
    return { person: { ...s.person }, updateTime: `v${s.reads}` };
  },
  mergeBenchPerson: async (_id: string, fields: Record<string, unknown>) => {
    if (!fields.resumePath) {
      Object.assign(s.person, fields); // the claim
      return;
    }
    switch (s.finalize) {
      case 'timeout-late-commit':
        s.late = () => Object.assign(s.person, fields); // lands after the route has answered
        throw new Error('upstream timeout');
      case 'timeout-committed':
        Object.assign(s.person, fields); // landed, but the response was lost
        throw new Error('upstream timeout');
      case 'timeout-never':
        throw new Error('upstream timeout');
      case 'precondition':
        throw new FirestorePreconditionError('stale updateTime');
    }
  },
}));
vi.mock('@/lib/server/benchIntake', () => ({
  checkBenchRateLimit: async () => true,
  clientIp: () => 'test',
  hashResumeToken: (t: string) => createHash('sha256').update(t).digest('hex'),
}));
vi.mock('@/lib/server/firebaseStorage', () => ({
  storageUploadPrivate: async (path: string) => {
    s.objects.add(path);
  },
  storageDelete: vi.fn(async (path: string) => {
    s.objects.delete(path);
  }),
}));

const ID = `bench_${'a'.repeat(32)}`;

async function upload(finalize: Finalize, opts: { confirmFails?: boolean } = {}) {
  s.finalize = finalize;
  s.confirmFails = opts.confirmFails ?? false;
  const { POST } = await import('@/app/api/bench/apply/resume/route');
  const form = new FormData();
  form.set('personId', ID);
  form.set('token', 'token');
  form.set('file', new Blob(['%PDF-1.4 test']), 'test.pdf');
  return POST(new Request('https://example.test', { method: 'POST', body: form }));
}

beforeEach(() => {
  s.person = {
    resumePath: null,
    resumeUploadTokenHash: createHash('sha256').update('token').digest('hex'),
    resumeUploadExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  s.objects.clear();
  s.late = () => {};
  s.reads = 0;
});

describe('resume finalize outcomes', () => {
  it('keeps the uploaded file when a timed-out finalize commits after the negative read', async () => {
    const res = await upload('timeout-late-commit');
    expect(res.status).toBe(500);
    s.late();
    expect(s.person.resumePath).toBeTruthy();
    expect(s.objects.has(s.person.resumePath as string)).toBe(true);
  });

  it('keeps the uploaded file when the confirmation read itself fails', async () => {
    const res = await upload('timeout-never', { confirmFails: true });
    expect(res.status).toBe(500);
    expect(s.objects.size).toBe(1);
    expect(s.person.resumePath).toBeNull();
    expect(s.person.resumeUploadTokenHash).toBeNull(); // token stays used
  });

  it('answers success when the timed-out finalize had in fact committed', async () => {
    const res = await upload('timeout-committed');
    expect(res.status).toBe(200);
    expect(s.objects.has(s.person.resumePath as string)).toBe(true);
  });

  it('deletes the uploaded file only on a definite rejection', async () => {
    const res = await upload('precondition');
    expect(res.status).toBe(500);
    expect(s.objects.size).toBe(0);
    expect(s.person.resumePath).toBeNull();
  });
});
