/**
 * Plan 017: "No suitable time? Request another time" — contract validation,
 * DST-correct time-zone display, and the API route's save/idempotency rules.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const docs = new Map<string, Record<string, unknown>>();
const fsCreateDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  if (docs.has(path)) return { created: false };
  docs.set(path, data);
  return { created: true };
});
const fsGetDoc = vi.fn(async (path: string) => (docs.has(path) ? { exists: true, data: docs.get(path) } : { exists: false }));
const fsMergeDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  docs.set(path, { ...(docs.get(path) ?? {}), ...data });
});
const fsIncrementField = vi.fn(async () => 1);
vi.mock('@/lib/server/firestoreRest', () => ({
  fsCreateDoc: (p: string, d: Record<string, unknown>) => fsCreateDoc(p, d),
  fsGetDoc: (p: string) => fsGetDoc(p),
  fsMergeDoc: (p: string, d: Record<string, unknown>) => fsMergeDoc(p, d),
  fsIncrementField: () => fsIncrementField(),
}));

const send = vi.fn(async () => ({ data: { id: 'm1' }, error: null }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send } }),
  getFromAddress: () => 'Test <test@resend.dev>',
  getFounderEmail: () => 'founder@example.test',
}));

const valid = {
  name: 'Sam Rivera',
  email: 'Sam@Example.test',
  phone: '(347) 555-0134',
  contactPreference: 'text',
  days: ['tue', 'mon'],
  windows: ['evening'],
  timeZone: 'America/New_York',
  note: '',
  source: 'welcome-modal',
  sourcePage: '/',
  idempotencyKey: 'attempt-key-1',
};

describe('parseAlternateTimeRequest', () => {
  it('accepts a valid request, normalizing email and option order', async () => {
    const { parseAlternateTimeRequest } = await import('@/lib/booking/alternateTime');
    const r = parseAlternateTimeRequest(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.email).toBe('sam@example.test');
      expect(r.data.days).toEqual(['mon', 'tue']);
    }
  });

  it('reports each missing field inline, and needs no questionnaire answers', async () => {
    const { parseAlternateTimeRequest } = await import('@/lib/booking/alternateTime');
    const r = parseAlternateTimeRequest({ ...valid, name: '', email: 'nope', phone: '', contactPreference: 'carrier-pigeon', days: [], windows: [], timeZone: 'Mars/Olympus' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.field).sort()).toEqual(['contactPreference', 'days', 'email', 'name', 'phone', 'timeZone', 'windows']);
  });

  it('requires a callable phone number', async () => {
    const { parseAlternateTimeRequest, isValidPhone } = await import('@/lib/booking/alternateTime');
    expect(isValidPhone('+1 347.555.0134')).toBe(true);
    expect(isValidPhone('555-12')).toBe(false);
    expect(isValidPhone('call me maybe')).toBe(false);
    const r = parseAlternateTimeRequest({ ...valid, phone: '12' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toEqual({ field: 'phone', message: 'Please enter a valid phone number.' });
  });

  it('rejects values outside the offered options', async () => {
    const { parseAlternateTimeRequest } = await import('@/lib/booking/alternateTime');
    expect(parseAlternateTimeRequest({ ...valid, days: ['someday'] }).ok).toBe(false);
  });

  it('flags a filled honeypot as spam', async () => {
    const { parseAlternateTimeRequest } = await import('@/lib/booking/alternateTime');
    const r = parseAlternateTimeRequest({ ...valid, website: 'http://spam' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.spam).toBe(true);
  });
});

describe('time-zone display across DST', () => {
  // US clocks moved forward on 2026-03-08; UK clocks on 2026-03-29. In the
  // weeks between, London is 4 hours ahead of New York instead of 5.
  it('London 9 AM on a Tuesday is 4 AM New York in winter', async () => {
    const { describeWindowIn } = await import('@/lib/booking/alternateTime');
    expect(describeWindowIn('tue', 'morning', 'Europe/London', 'America/New_York', new Date('2026-03-02T12:00:00Z')))
      .toBe('Tue, Mar 3, 4:00 AM–7:00 AM');
  });

  it('is 5 AM in the gap weeks when only the US has changed', async () => {
    const { describeWindowIn } = await import('@/lib/booking/alternateTime');
    expect(describeWindowIn('tue', 'morning', 'Europe/London', 'America/New_York', new Date('2026-03-16T12:00:00Z')))
      .toBe('Tue, Mar 17, 5:00 AM–8:00 AM');
  });

  it('is 4 AM again once both have changed', async () => {
    const { describeWindowIn } = await import('@/lib/booking/alternateTime');
    expect(describeWindowIn('tue', 'morning', 'Europe/London', 'America/New_York', new Date('2026-04-06T12:00:00Z')))
      .toBe('Tue, Apr 7, 4:00 AM–7:00 AM');
  });

  it('resolves wall-clock times on both sides of the New York fall-back', async () => {
    const { zonedWallClockToUtc } = await import('@/lib/booking/alternateTime');
    expect(zonedWallClockToUtc('2026-10-31', 9, 0, 'America/New_York').toISOString()).toBe('2026-10-31T13:00:00.000Z');
    expect(zonedWallClockToUtc('2026-11-02', 9, 0, 'America/New_York').toISOString()).toBe('2026-11-02T14:00:00.000Z');
  });
});

describe('POST /api/leads/alternate-time', () => {
  beforeEach(() => {
    docs.clear();
    vi.clearAllMocks();
  });

  async function post(body: unknown) {
    const { POST } = await import('@/app/api/leads/alternate-time/route');
    return POST(new Request('http://localhost/api/leads/alternate-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));
  }

  it('saves the request separately from leads, with status, time zone and source', async () => {
    const res = await post({ ...valid, linkage: { sid: 'sess-1', vid: 'browser-1' }, attribution: { src: 'campaign', camp: 'flyer' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const [path, doc] = [...docs.entries()].find(([p]) => p.startsWith('alternateTimeRequests/'))!;
    expect(path).toMatch(/^alternateTimeRequests\/altreq_[a-f0-9]{32}$/);
    expect(doc).toMatchObject({
      phone: '(347) 555-0134',
      contactPreference: 'text',
      status: 'new',
      timeZone: 'America/New_York',
      source: 'welcome-modal',
      sourcePage: '/',
      sid: 'sess-1',
      vid: 'browser-1',
      testFlag: false,
      attribution: { src: 'campaign', camp: 'flyer' },
    });
    expect(typeof doc.createdAt).toBe('string');
    expect([...docs.keys()].some((p) => p.startsWith('leads/'))).toBe(false);
  });

  it('a double click or retry with the same attempt key saves once and notifies once', async () => {
    const a = await (await post(valid)).json();
    const b = await (await post(valid)).json();
    expect(a.ok && b.ok).toBe(true);
    expect(b.duplicate).toBe(true);
    expect([...docs.keys()].filter((p) => p.startsWith('alternateTimeRequests/'))).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('a deliberate second request (new key) is its own record', async () => {
    await post(valid);
    await post({ ...valid, idempotencyKey: 'attempt-key-2' });
    expect([...docs.keys()].filter((p) => p.startsWith('alternateTimeRequests/'))).toHaveLength(2);
  });

  it('links to an existing capture for the same email', async () => {
    const { createHash } = await import('node:crypto');
    const captureId = `capture_${createHash('sha256').update('sam@example.test').digest('hex').slice(0, 32)}`;
    docs.set(`leads/${captureId}`, { id: captureId, type: 'capture' });
    await post(valid);
    const doc = [...docs.entries()].find(([p]) => p.startsWith('alternateTimeRequests/'))![1];
    expect(doc.linkedCaptureId).toBe(captureId);
  });

  it('answers a validation failure with inline field errors and saves nothing', async () => {
    const res = await post({ ...valid, days: [] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.fieldErrors[0].field).toBe('days');
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });

  it('includes the phone in the founder notice', async () => {
    await post(valid);
    const mail = (send.mock.calls[0] as unknown as [{ text: string }])[0];
    expect(mail.text).toContain('Phone: (347) 555-0134');
    expect(mail.text).toContain('Reach them by: Text me');
  });

  it('never answers success when the save fails', async () => {
    fsCreateDoc.mockRejectedValueOnce(new Error('firestore down'));
    const res = await post(valid);
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });

  it('skips the founder notice for a request from a marked test device', async () => {
    docs.set('testDevices/dev-1', { id: 'dev-1' });
    await post({ ...valid, linkage: { td: 'dev-1' } });
    const doc = [...docs.entries()].find(([p]) => p.startsWith('alternateTimeRequests/'))![1];
    expect(doc.testFlag).toBe(true);
    expect(doc.notification).toBe('skipped');
    expect(send).not.toHaveBeenCalled();
  });

  it('honeypot: success-shaped, nothing stored', async () => {
    const res = await post({ ...valid, website: 'x' });
    expect((await res.json()).ok).toBe(true);
    expect(fsCreateDoc).not.toHaveBeenCalled();
  });
});
