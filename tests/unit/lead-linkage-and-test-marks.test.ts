/**
 * Plan 017: a booking after a saved questionnaire attaches to that lead (not a
 * stray "waiting on answers" row); booking ids are stored hashed; admin
 * test marks never create or delete records.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const docs = new Map<string, Record<string, unknown>>();
const fsGetDoc = vi.fn(async (p: string) => (docs.has(p) ? { exists: true, data: docs.get(p), updateTime: 't' } : { exists: false }));
const fsMergeDoc = vi.fn(async (p: string, d: Record<string, unknown>) => { docs.set(p, { ...(docs.get(p) ?? {}), ...d }); });
const fsSetDoc = vi.fn(async (p: string, d: Record<string, unknown>) => { docs.set(p, d); });
const fsDeleteDoc = vi.fn(async (p: string) => { docs.delete(p); });
vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc: (p: string) => fsGetDoc(p),
  fsMergeDoc: (p: string, d: Record<string, unknown>) => fsMergeDoc(p, d),
  fsSetDoc: (p: string, d: Record<string, unknown>) => fsSetDoc(p, d),
  fsDeleteDoc: (p: string) => fsDeleteDoc(p),
  fsIncrementField: vi.fn(async () => 1),
  withOptimisticRetry: (fn: () => Promise<unknown>) => fn(),
  FirestorePreconditionError: class extends Error {},
}));
const verifyAdmin = vi.fn(async () => 'admin@example.test');
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin: () => verifyAdmin() }));

beforeEach(() => {
  docs.clear();
  vi.clearAllMocks();
});

async function capture(body: unknown) {
  const { POST } = await import('@/app/api/leads/capture/route');
  return POST(new Request('http://localhost/api/leads/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
}

const captureDoc = () => [...docs.entries()].find(([p]) => p.startsWith('leads/capture_'))![1];

describe('capture: booking ids and linkage', () => {
  it('stores the booking id hashed, plus the session/visitor linkage', async () => {
    await capture({ email: 'Sam@example.test', source: 'book', booked: true, bookingId: 'INV-123', linkage: { sid: 's1', vid: 'v1' } });
    const doc = captureDoc();
    expect(doc.bookingRefs).toEqual([expect.stringMatching(/^[a-f0-9]{32}$/)]);
    expect(JSON.stringify(doc)).not.toContain('INV-123');
    expect(doc).toMatchObject({ sid: 's1', vid: 'v1', bookedSelfReported: true });
  });

  it('a booking after the questionnaire lands on the converted lead', async () => {
    const { captureIdForEmail } = await import('@/lib/server/leadTransitions');
    const leadId = 'a'.repeat(64);
    docs.set(`leads/${leadId}`, { id: leadId, email: 'sam@example.test', type: 'meetgreet' });
    docs.set(`leads/${captureIdForEmail('sam@example.test')}`, { status: 'converted', convertedLeadId: leadId, submittedAt: 'x' });
    await capture({ email: 'sam@example.test', source: 'book', booked: true, bookingId: 'INV-9' });
    expect(docs.get(`leads/${leadId}`)!.bookedSelfReported).toBe(true);
    expect(captureDoc().status).toBe('converted');
  });

  it('keeps a legitimate repeat booking as a second distinct ref; a replay adds nothing', async () => {
    await capture({ email: 'sam@example.test', source: 'welcome-modal', booked: true, bookingId: 'INV-1' });
    await capture({ email: 'sam@example.test', source: 'welcome-modal', booked: true, bookingId: 'INV-1' });
    await capture({ email: 'sam@example.test', source: 'welcome-modal', booked: true, bookingId: 'INV-2' });
    expect((captureDoc().bookingRefs as string[]).length).toBe(2);
  });
});

describe('POST /api/admin/test-marks', () => {
  async function mark(body: unknown) {
    const { POST } = await import('@/app/api/admin/test-marks/route');
    return POST(new NextRequest('http://localhost/api/admin/test-marks', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }));
  }

  it('marks and unmarks a lead without touching anything else on it', async () => {
    const id = 'b'.repeat(64);
    docs.set(`leads/${id}`, { id, email: 'x@y.test', dogName: 'test' });
    expect((await mark({ kind: 'lead', id, test: true })).status).toBe(200);
    expect(docs.get(`leads/${id}`)).toMatchObject({ dogName: 'test', testOverride: true, testMarkedBy: 'admin@example.test' });
    await mark({ kind: 'lead', id, test: null });
    expect(docs.get(`leads/${id}`)!.testOverride).toBeNull();
    expect(docs.get(`leads/${id}`)!.email).toBe('x@y.test');
  });

  it('refuses to create a record that does not exist', async () => {
    const res = await mark({ kind: 'request', id: `altreq_${'c'.repeat(32)}`, test: true });
    expect(res.status).toBe(404);
    expect(fsMergeDoc).not.toHaveBeenCalled();
  });

  it('marks and unmarks an analytics session', async () => {
    await mark({ kind: 'session', id: 'sess-1', test: true });
    expect(docs.get('analyticsTestSessions/sess-1')).toMatchObject({ sid: 'sess-1' });
    await mark({ kind: 'session', id: 'sess-1', test: false });
    expect(docs.has('analyticsTestSessions/sess-1')).toBe(false);
  });

  it('requires admin', async () => {
    const { ForbiddenError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValueOnce(new ForbiddenError('no'));
    expect((await mark({ kind: 'session', id: 'x', test: true })).status).toBe(403);
  });
});

describe('buildLeadReview', () => {
  it('flags same-email submissions for review without calling them test', async () => {
    const { buildLeadReview } = await import('@/lib/testing/leadReview');
    const { emptyTestContext } = await import('@/lib/testing/classification');
    const review = buildLeadReview(
      [
        { id: 'l1', email: 'A@x.test', dogName: 'test' },
        { id: 'l2', email: 'a@x.test', dogName: 'Rex' },
        { id: 'c1', type: 'capture', email: 'a@x.test' },
      ],
      emptyTestContext(),
    );
    expect(review.l1).toMatchObject({ testReason: null, confirmedReal: false, sameEmailCount: 1 });
    expect(review.l1.related.map((r) => r.id).sort()).toEqual(['c1', 'l2']);
    expect(review.c1.sameEmailCount).toBe(0);
  });
});
