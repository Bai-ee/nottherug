import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { applicationPayload } from './bench-fixtures';
import { DEFAULT_BENCH_SETTINGS } from '@/lib/bench/contract';

const fsQueryCollection = vi.fn();
const fsGetDoc = vi.fn();
const listBenchPeople = vi.fn();
const getBenchPerson = vi.fn();
const checkBenchRateLimit = vi.fn(async () => true);

vi.mock('@/lib/server/firestoreRest', () => ({ fsQueryCollection, fsGetDoc }));
vi.mock('@/lib/server/bench', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/bench')>('@/lib/server/bench')),
  listBenchPeople,
  getBenchPerson,
  getBenchSettingsOrDefault: async () => DEFAULT_BENCH_SETTINGS,
}));
vi.mock('@/lib/server/benchIntake', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/benchIntake')>('@/lib/server/benchIntake')),
  checkBenchRateLimit,
}));

const KEY = 'test-stats-key';
const NOW = new Date('2026-10-20T18:00:00.000Z');
const ID_A = `bench_${'a'.repeat(32)}`;
const ID_B = `bench_${'b'.repeat(32)}`;
const ID_C = `bench_${'c'.repeat(32)}`;

function get(query: string, auth: string | null = `Bearer ${KEY}`) {
  return new NextRequest(new URL(`https://nottherug.com/api/stats/people?${query}`), {
    headers: auth ? { authorization: auth } : {},
  });
}

function lead(id: string, submittedAt: string, extra: Record<string, unknown> = {}) {
  return {
    id, type: 'meetgreet', schemaVersion: 2, submittedAt, email: `${id}@x.test`, ownerName: 'Pat Owner',
    phone: '555-0100', neighborhood: 'Greenpoint', dogName: 'Rex', breedAge: 'Lab, 3', serviceInterest: 'Daily Group Walks',
    vaccinations: 'Yes', walkFrequency: 'Daily', reactivity: 'Other dogs', allergies: '', phoneConsult: true,
    notes: 'Gate code 1234', source: 'website', notifications: { founder: 'sent', customer: 'sent' }, ...extra,
  };
}
function capture(id: string, submittedAt: string, status: string) {
  return { id, type: 'capture', status, email: `${id}@x.test`, source: 'booking', submittedAt, lastSeenAt: submittedAt, bookedSelfReported: true };
}
function person(id: string, stage: string, createdAt: string) {
  return {
    id, schemaVersion: 1, fullName: 'Sam Rivera', firstName: 'Sam', email: 'sam@x.test', phoneE164: '+13475550101',
    source: 'indeed', utm: { source: 'indeed' }, stage, stageHistory: [], onHold: false, areas: [],
    availability: [{ weekday: 1, block: 'morning' }], unavailableDates: [],
    answers: applicationPayload() as unknown as Record<string, unknown>, confirmedAt: createdAt, knockoutReason: null,
    resumePath: 'private/bench-resumes/secret-path.pdf', resumeKind: 'pdf', resumeUploadTokenHash: 'HASH',
    resumeUploadExpiresAt: 'x', resumeAttemptId: 'att', aiSummary: 'Strong candidate', smsConsentAt: null, smsOptedOut: false,
    employmentType: null, tier: null, tierPinned: false, notes: 'Call back', shadowRating: null,
    createdAt, updatedAt: createdAt,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ now: NOW });
  process.env.STATS_API_KEY = KEY;
  checkBenchRateLimit.mockReset().mockResolvedValue(true);
  fsQueryCollection.mockReset().mockResolvedValue([
    lead('l_today', '2026-10-20T15:00:00.000Z'),
    lead('l_3d', '2026-10-17T15:00:00.000Z'),
    lead('l_20d', '2026-10-01T15:00:00.000Z'),
    lead('l_old', '2026-06-01T15:00:00.000Z'),
    capture('capture_open', '2026-10-19T10:00:00.000Z', 'partial'),
    capture('capture_done', '2026-10-19T09:00:00.000Z', 'converted'),
  ]);
  fsGetDoc.mockReset().mockResolvedValue({ exists: false });
  listBenchPeople.mockReset().mockResolvedValue([
    person(ID_A, 'review', '2026-10-19T00:00:00.000Z'),
    person(ID_B, 'bench', '2026-10-10T00:00:00.000Z'),
    person(ID_C, 'review', '2026-08-01T00:00:00.000Z'),
  ]);
  getBenchPerson.mockReset().mockImplementation(async (id: string) => (id === ID_A ? person(ID_A, 'review', '2026-10-19T00:00:00.000Z') : null));
});

describe('GET /api/stats/people', () => {
  it('401s without the key, with a wrong key, and when the key is unset', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    expect((await GET(get('kind=leads', null))).status).toBe(401);
    expect((await GET(get('kind=leads', 'Bearer nope'))).status).toBe(401);
    delete process.env.STATS_API_KEY;
    expect((await GET(get('kind=leads'))).status).toBe(401);
    expect(fsQueryCollection).not.toHaveBeenCalled();
  });

  it('429s over the per-IP limit, using its own bucket', async () => {
    checkBenchRateLimit.mockResolvedValue(false);
    const { GET } = await import('@/app/api/stats/people/route');
    expect((await GET(get('kind=leads'))).status).toBe(429);
    expect(checkBenchRateLimit).toHaveBeenCalledWith(expect.anything(), 'stats-people', 60);
  });

  it('400s on a missing or unknown kind', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    for (const q of ['', 'kind=bogus']) {
      const res = await GET(get(q));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: 'Unknown kind' });
    }
  });

  it('lists leads newest first, excluding captures, with the full answer set and no internals', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    const res = await GET(get('kind=leads&range=all'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ site: 'nottherug.com', generatedAt: NOW.toISOString(), kind: 'leads', range: 'all', total: 4, count: 4 });
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['l_today', 'l_3d', 'l_20d', 'l_old']);
    expect(body.items[0]).toEqual({
      id: 'l_today', submittedAt: '2026-10-20T15:00:00.000Z', ownerName: 'Pat Owner', email: 'l_today@x.test', phone: '555-0100',
      neighborhood: 'Greenpoint', dogName: 'Rex', breedAge: 'Lab, 3', serviceInterest: 'Daily Group Walks', vaccinations: 'Yes',
      walkFrequency: 'Daily', reactivity: 'Other dogs', allergies: null, spayNeuter: null, dogSocial: null, strangerSocial: null,
      phoneConsult: true, notes: 'Gate code 1234', source: 'website', bookedSelfReported: false,
    });
    expect(JSON.stringify(body)).not.toMatch(/notifications|schemaVersion|capture_/);
  });

  it('filters by range (today, 7d, 30d, default 30d)', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    const ids = async (q: string) => (await (await GET(get(q))).json()).items.map((i: { id: string }) => i.id);
    expect(await ids('kind=leads&range=today')).toEqual(['l_today']);
    expect(await ids('kind=leads&range=7d')).toEqual(['l_today', 'l_3d']);
    expect(await ids('kind=leads&range=30d')).toEqual(['l_today', 'l_3d', 'l_20d']);
    expect(await ids('kind=leads')).toEqual(['l_today', 'l_3d', 'l_20d']);
    expect(await ids('kind=leads&range=weird')).toEqual(['l_today', 'l_3d', 'l_20d']);
  });

  it('applies limit (clamped to 1-200) while total stays the full match count', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    const body = await (await GET(get('kind=leads&range=all&limit=2'))).json();
    expect(body).toMatchObject({ total: 4, count: 2 });
    expect(body.items).toHaveLength(2);
    const bad = await (await GET(get('kind=leads&range=all&limit=0'))).json();
    expect(bad.count).toBe(4);
  });

  it('lists only open captures under kind=captures, with the mapped field names', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    const body = await (await GET(get('kind=captures&range=all'))).json();
    expect(body.total).toBe(1);
    expect(body.items[0]).toEqual({
      id: 'capture_open', email: 'capture_open@x.test', source: 'booking',
      firstSeenAt: '2026-10-19T10:00:00.000Z', lastSeenAt: '2026-10-19T10:00:00.000Z', bookedSelfReported: true,
    });
  });

  it('filters applicants by range and stage, with labelled answers and no resume data', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    const all = await (await GET(get('kind=applicants&range=all'))).json();
    expect(all.items.map((i: { id: string }) => i.id)).toEqual([ID_A, ID_B, ID_C]);
    const review = await (await GET(get('kind=applicants&range=all&stage=review'))).json();
    expect(review.items.map((i: { id: string }) => i.id)).toEqual([ID_A, ID_C]);
    const recent = await (await GET(get('kind=applicants&range=30d&stage=review'))).json();
    expect(recent.total).toBe(1);

    const item = recent.items[0];
    expect(item).toMatchObject({ id: ID_A, stage: 'review', stageLabel: 'In review', fullName: 'Sam Rivera', phone: '+13475550101', hasResume: true, notes: 'Call back', aiSummary: 'Strong candidate' });
    expect(item.answers['Notice needed']).toBe('4–12 hours');
    expect(item.answers['Availability']).toBe('Mon Morning');
    expect(item.answers['Experience with dogs']).toMatch(/neighbor/);
    expect(item.answers).not.toHaveProperty('Full name');
  });

  it('never exposes a resume path, token hash or storage reference', async () => {
    const { GET } = await import('@/app/api/stats/people/route');
    const list = JSON.stringify(await (await GET(get('kind=applicants&range=all'))).json());
    const detail = JSON.stringify(await (await GET(get(`kind=applicants&id=${ID_A}`))).json());
    for (const text of [list, detail]) {
      expect(text).not.toMatch(/secret-path|private\/bench-resumes|resumePath|resumeKind|HASH|resumeUpload|resumeAttempt/);
    }
  });

  it('returns one record by id, and 404s for unknown ids and wrong kinds', async () => {
    fsGetDoc.mockImplementation(async (path: string) => {
      if (path === 'leads/l_today') return { exists: true, data: lead('l_today', '2026-10-20T15:00:00.000Z') };
      if (path === 'leads/capture_open') return { exists: true, data: capture('capture_open', '2026-10-19T10:00:00.000Z', 'partial') };
      return { exists: false };
    });
    const { GET } = await import('@/app/api/stats/people/route');

    const ok = await GET(get('kind=leads&id=l_today'));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ site: 'nottherug.com', kind: 'leads', item: { id: 'l_today', ownerName: 'Pat Owner' } });

    const app = await GET(get(`kind=applicants&id=${ID_A}`));
    expect((await app.json()).item.id).toBe(ID_A);

    for (const q of [
      'kind=leads&id=missing',
      'kind=leads&id=capture_open',
      'kind=captures&id=l_today',
      `kind=applicants&id=${ID_B}`,
      'kind=applicants&id=l_today',
      'kind=leads&id=../benchPeople/x',
    ]) {
      const res = await GET(get(q));
      expect(res.status, q).toBe(404);
      expect(await res.json()).toEqual({ ok: false, error: 'Not found' });
    }
    expect((await (await GET(get('kind=captures&id=capture_open'))).json()).item.id).toBe('capture_open');
  });

  it('hides internals on a backend failure', async () => {
    fsQueryCollection.mockRejectedValue(new Error('secret firestore detail'));
    const { GET } = await import('@/app/api/stats/people/route');
    const res = await GET(get('kind=leads'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/secret/);
  });
});
