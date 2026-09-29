/**
 * The admin bench routes under app/api/admin/bench/**: auth on every handler,
 * settings validation, stage actions and what leaves the server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DEFAULT_BENCH_SETTINGS } from '@/lib/bench/contract';

const verifyAdmin = vi.fn(async () => 'luis@nottherug.test');
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));

let docs: Map<string, Record<string, unknown>>;
vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc: vi.fn(async (path: string) => {
    const data = docs.get(path);
    return data ? { exists: true, data } : { exists: false };
  }),
  fsSetDoc: vi.fn(async (path: string, data: Record<string, unknown>) => {
    docs.set(path, data);
  }),
  fsQueryCollection: vi.fn(async () => [...docs.entries()].filter(([p]) => p.startsWith('benchPeople/')).map(([, d]) => d)),
  fsCreateDoc: vi.fn(),
  fsIncrementField: vi.fn(),
  fsDeleteDoc: vi.fn(),
}));

const sendEmail = vi.fn(async () => ({ data: { id: 'mock' }, error: null }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'hello@nottherug.test',
  getFounderEmail: () => 'luis@nottherug.test',
}));

const storageDownload = vi.fn(async () => Buffer.from('%PDF-1.7'));
vi.mock('@/lib/server/firebaseStorage', () => ({ storageDownload }));

const PERSON_ID = `bench_${'a'.repeat(32)}`;

function person(overrides: Record<string, unknown> = {}) {
  return {
    id: PERSON_ID,
    fullName: 'Sam Rivera',
    firstName: 'Sam',
    email: 'sam@example.test',
    phoneE164: '+13475550101',
    stage: 'review',
    stageHistory: [{ stage: 'review', at: '2026-09-28T12:00:00Z', by: 'applicant' }],
    onHold: false,
    areas: ['williamsburg'],
    availability: [{ weekday: 1, block: 'morning' }],
    smsOptedOut: false,
    tier: null,
    tierPinned: false,
    notes: '',
    resumePath: null,
    resumeUploadTokenHash: 'secret-hash',
    resumeUploadExpiresAt: '2026-09-28T12:30:00Z',
    createdAt: '2026-09-28T12:00:00Z',
    updatedAt: '2026-09-28T12:00:00Z',
    ...overrides,
  };
}

function req(url: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(url, {
    method: init.method ?? 'GET',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const params = { params: Promise.resolve({ id: PERSON_ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  docs = new Map([[`benchPeople/${PERSON_ID}`, person()]]);
});

describe('auth on every admin bench route', () => {
  const calls: Array<[string, () => Promise<Response>]> = [
    ['GET settings', async () => (await import('@/app/api/admin/bench/settings/route')).GET(req('http://localhost/api/admin/bench/settings'))],
    ['PUT settings', async () => (await import('@/app/api/admin/bench/settings/route')).PUT(req('http://localhost/api/admin/bench/settings', { method: 'PUT', body: DEFAULT_BENCH_SETTINGS }))],
    ['GET people', async () => (await import('@/app/api/admin/bench/people/route')).GET(req('http://localhost/api/admin/bench/people'))],
    ['POST action', async () => (await import('@/app/api/admin/bench/people/[id]/route')).POST(req(`http://localhost/api/admin/bench/people/${PERSON_ID}`, { method: 'POST', body: { action: 'hold' } }), params)],
    ['GET resume', async () => (await import('@/app/api/admin/bench/people/[id]/resume/route')).GET(req(`http://localhost/api/admin/bench/people/${PERSON_ID}/resume`), params)],
  ];

  it.each(calls)('%s → 401 without a valid token', async (_name, call) => {
    const { UnauthorizedError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValueOnce(new UnauthorizedError('jwt malformed'));
    const res = await call();
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain('jwt malformed');
  });

  it.each(calls)('%s → 403 for a non-admin', async (_name, call) => {
    const { ForbiddenError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValueOnce(new ForbiddenError('not on admin whitelist'));
    expect((await call()).status).toBe(403);
  });
});

describe('GET /api/admin/bench/people', () => {
  it('returns people with coverage fit and never the resume upload token', async () => {
    const { GET } = await import('@/app/api/admin/bench/people/route');
    const body = await (await GET(req('http://localhost/api/admin/bench/people'))).json();
    expect(body.people).toHaveLength(1);
    expect(body.people[0].gapSlots).toBe(1);
    expect(body.people[0]).not.toHaveProperty('resumeUploadTokenHash');
    expect(body.people[0]).not.toHaveProperty('resumeUploadExpiresAt');
    expect(body.settings.areas).toEqual(DEFAULT_BENCH_SETTINGS.areas);
    expect(body.underTargetSlots).toBe(42);
  });
});

describe('PUT /api/admin/bench/settings', () => {
  it('saves valid settings with who changed them', async () => {
    const { PUT } = await import('@/app/api/admin/bench/settings/route');
    const res = await PUT(req('http://localhost/api/admin/bench/settings', { method: 'PUT', body: { ...DEFAULT_BENCH_SETTINGS, targetDepth: 4 } }));
    expect(res.status).toBe(200);
    expect(docs.get('benchSettings/config')).toEqual(expect.objectContaining({ targetDepth: 4, updatedBy: 'luis@nottherug.test' }));
  });

  it('400s invalid settings without saving', async () => {
    const { PUT } = await import('@/app/api/admin/bench/settings/route');
    const res = await PUT(req('http://localhost/api/admin/bench/settings', { method: 'PUT', body: { ...DEFAULT_BENCH_SETTINGS, areas: [] } }));
    expect(res.status).toBe(400);
    expect(docs.has('benchSettings/config')).toBe(false);
  });
});

describe('POST /api/admin/bench/people/[id]', () => {
  async function act(body: unknown) {
    const { POST } = await import('@/app/api/admin/bench/people/[id]/route');
    return POST(req(`http://localhost/api/admin/bench/people/${PERSON_ID}`, { method: 'POST', body }), params);
  }

  it('invites to shadow: moves the stage, logs who did it and emails the applicant', async () => {
    docs.set('benchSettings/config', { ...DEFAULT_BENCH_SETTINGS, shadowBookingUrl: 'https://calendly.test/shadow' });
    const res = await act({ action: 'invite_shadow' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.person.stage).toBe('shadow_invited');
    expect(body.person.stageHistory.at(-1)).toEqual(expect.objectContaining({ stage: 'shadow_invited', by: 'luis@nottherug.test' }));
    expect(body.notifications).toEqual({ shadowInvite: 'sent' });
    expect(body.person).not.toHaveProperty('resumeUploadTokenHash');
    expect(sendEmail.mock.calls[0]).toEqual([expect.objectContaining({ to: 'sam@example.test', text: expect.stringContaining('https://calendly.test/shadow') })]);
  });

  it('409s an action the stage does not allow', async () => {
    const res = await act({ action: 'mark_background_clear' });
    expect(res.status).toBe(409);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('puts a cleared person on the bench at tier B', async () => {
    docs.set(`benchPeople/${PERSON_ID}`, person({ stage: 'offer_conditional' }));
    const body = await (await act({ action: 'mark_background_clear' })).json();
    expect(body.person.stage).toBe('bench');
    expect(body.person.tier).toBe('B');
  });

  it('never overwrites a pinned tier', async () => {
    docs.set(`benchPeople/${PERSON_ID}`, person({ stage: 'offer_conditional', tier: 'A', tierPinned: true }));
    const body = await (await act({ action: 'mark_background_clear' })).json();
    expect(body.person.tier).toBe('A');
  });

  it('records a shadow rating and validates it', async () => {
    docs.set(`benchPeople/${PERSON_ID}`, person({ stage: 'shadow_scheduled' }));
    expect((await act({ action: 'mark_shadow_done', rating: 9 })).status).toBe(400);
    const body = await (await act({ action: 'mark_shadow_done', rating: 4 })).json();
    expect(body.person.shadowRating).toBe(4);
  });

  it('holds and saves notes without changing the stage', async () => {
    expect((await (await act({ action: 'hold' })).json()).person.onHold).toBe(true);
    const body = await (await act({ action: 'save_notes', notes: 'Great with the doodles.' })).json();
    expect(body.person.stage).toBe('review');
    expect(body.person.notes).toBe('Great with the doodles.');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('400s an unknown action and 404s an unknown person', async () => {
    expect((await act({ action: 'delete_everyone' })).status).toBe(400);
    docs.clear();
    expect((await act({ action: 'hold' })).status).toBe(404);
  });

  it('404s a malformed id before reading Firestore', async () => {
    const { POST } = await import('@/app/api/admin/bench/people/[id]/route');
    const res = await POST(req('http://localhost/api/admin/bench/people/x', { method: 'POST', body: { action: 'hold' } }), { params: Promise.resolve({ id: '../admins/x' }) });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/admin/bench/people/[id]/resume', () => {
  it('streams the resume to a verified admin, uncached', async () => {
    docs.set(`benchPeople/${PERSON_ID}`, person({ resumePath: `private/bench-resumes/${PERSON_ID}.pdf`, resumeKind: 'pdf' }));
    const { GET } = await import('@/app/api/admin/bench/people/[id]/resume/route');
    const res = await GET(req(`http://localhost/api/admin/bench/people/${PERSON_ID}/resume`), params);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('404s when there is no resume', async () => {
    const { GET } = await import('@/app/api/admin/bench/people/[id]/resume/route');
    expect((await GET(req(`http://localhost/api/admin/bench/people/${PERSON_ID}/resume`), params)).status).toBe(404);
  });
});
