import { describe, it, expect, vi, beforeEach } from 'vitest';

const fsIncrementField = vi.fn(async () => 1);
const fsGetDoc = vi.fn(async () => ({ exists: false }));
const fsMergeDoc = vi.fn(async () => {});

vi.mock('@/lib/server/firestoreRest', () => ({ fsIncrementField, fsGetDoc, fsMergeDoc }));

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
  beforeEach(() => vi.clearAllMocks());

  it('answers success-shaped and stores nothing when the honeypot is filled', async () => {
    const res = await post({ email: 'bot@example.test', source: 'home', website: 'http://spam.test' });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(fsMergeDoc).not.toHaveBeenCalled();
  });

  it('stores a normal capture via merge, not replace', async () => {
    const res = await post({ email: 'real@example.test', source: 'home' });
    expect(res.status).toBe(200);
    expect(fsMergeDoc).toHaveBeenCalledTimes(1);
  });

  it('writes expiresAt on the rate-limit row', async () => {
    await post({ email: 'real@example.test', source: 'home' });
    const seed = (fsIncrementField.mock.calls[0] as unknown[])[3] as { expiresAt: Date };
    expect(seed.expiresAt).toBeInstanceOf(Date);
    expect(seed.expiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 3600 * 1000);
  });

  it('merges booked:true onto the converted lead for an already-converted email', async () => {
    fsGetDoc.mockResolvedValueOnce({ exists: true, data: { status: 'converted', convertedLeadId: 'lead_1' } } as never);
    await post({ email: 'real@example.test', source: 'home', booked: true });
    expect(fsMergeDoc).toHaveBeenCalledWith('leads/lead_1', { bookedSelfReported: true });
  });
});
