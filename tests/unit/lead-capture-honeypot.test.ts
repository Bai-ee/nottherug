import { describe, it, expect, vi, beforeEach } from 'vitest';

import { fsFake } from './lead-firestore-fake';
import { captureIdForEmail } from '@/lib/server/leadTransitions';

vi.mock('@/lib/server/firestoreRest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/firestoreRest')>('@/lib/server/firestoreRest');
  const { fsFake } = await import('./lead-firestore-fake');
  fsFake.PreconditionError = actual.FirestorePreconditionError;
  return { ...actual, ...fsFake.api };
});

async function post(body: unknown) {
  const { POST } = await import('@/app/api/leads/capture/route');
  return POST(
    new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/leads/capture honeypot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsFake.reset();
  });

  it('answers success-shaped and stores nothing when the honeypot is filled', async () => {
    const res = await post({ email: 'bot@example.test', source: 'home', website: 'http://spam.test' });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(fsFake.callsTo('fsMergeDoc')).toHaveLength(0);
  });

  it('stores a normal capture via merge, not replace', async () => {
    const res = await post({ email: 'real@example.test', source: 'home' });
    expect(res.status).toBe(200);
    expect(fsFake.callsTo('fsMergeDoc')).toHaveLength(1);
  });

  it('writes expiresAt on the rate-limit row', async () => {
    await post({ email: 'real@example.test', source: 'home' });
    const seed = [...fsFake.counterSeeds.values()][0] as { expiresAt: Date };
    expect(seed.expiresAt).toBeInstanceOf(Date);
    expect(seed.expiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 3600 * 1000);
  });

  it('merges booked:true onto the converted lead for an already-converted email', async () => {
    fsFake.write(`leads/${captureIdForEmail('real@example.test')}`, { status: 'converted', convertedLeadId: 'lead_1' });
    await post({ email: 'real@example.test', source: 'home', booked: true });
    expect(fsFake.data('leads/lead_1')).toMatchObject({ bookedSelfReported: true });
  });
});
