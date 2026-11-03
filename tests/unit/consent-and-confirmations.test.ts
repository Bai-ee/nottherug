/**
 * Plan 017 follow-up: newsletter consent, the "we have your email" message
 * with signed confirm links, and the requester's confirmation email.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const docs = new Map<string, Record<string, unknown>>();
const fsGetDoc = vi.fn(async (p: string) => (docs.has(p) ? { exists: true, data: docs.get(p), updateTime: 't' } : { exists: false }));
const fsMergeDoc = vi.fn(async (p: string, d: Record<string, unknown>) => { docs.set(p, { ...(docs.get(p) ?? {}), ...d }); });
const fsCreateDoc = vi.fn(async (p: string, d: Record<string, unknown>) => {
  if (docs.has(p)) return { created: false };
  docs.set(p, d);
  return { created: true };
});
vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc: (p: string) => fsGetDoc(p),
  fsMergeDoc: (p: string, d: Record<string, unknown>) => fsMergeDoc(p, d),
  fsCreateDoc: (p: string, d: Record<string, unknown>) => fsCreateDoc(p, d),
  fsIncrementField: vi.fn(async () => 1),
  withOptimisticRetry: (fn: () => Promise<unknown>) => fn(),
  FirestorePreconditionError: class extends Error {},
}));

let from = 'Not The Rug <luis@nottherug.com>';
type Mail = { to: string; subject: string; text: string; html: string };
const send = vi.fn<(m: Mail) => Promise<{ data: { id: string }; error: null }>>(async () => ({ data: { id: 'm' }, error: null }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send } }),
  getFromAddress: () => from,
  getFounderEmail: () => 'founder@example.test',
}));

beforeEach(() => {
  docs.clear();
  vi.clearAllMocks();
  from = 'Not The Rug <luis@nottherug.com>';
  vi.stubEnv('EMAIL_LINK_SECRET', 'test-secret-long-enough-123');
});
afterEach(() => vi.unstubAllEnvs());

async function capture(body: unknown) {
  const { POST } = await import('@/app/api/leads/capture/route');
  return POST(new Request('http://localhost/api/leads/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
}
const captureDoc = () => [...docs.entries()].find(([p]) => p.startsWith('leads/capture_'))!;

describe('isSandboxSender', () => {
  it('recognises the @resend.dev test sender in both forms', async () => {
    const { isSandboxSender } = await import('@/lib/email/sandbox');
    expect(isSandboxSender('onboarding@resend.dev')).toBe(true);
    expect(isSandboxSender('Not The Rug <onboarding@resend.dev>')).toBe(true);
    expect(isSandboxSender('Not The Rug <luis@nottherug.com>')).toBe(false);
  });
});

describe('newsletter consent on capture', () => {
  it('records a yes with when and where; an unticked box sends nothing and never clears it', async () => {
    await capture({ email: 'sam@example.test', source: 'welcome-modal', newsletterOptIn: true });
    expect(captureDoc()[1]).toMatchObject({ newsletterOptIn: true, newsletterOptInVia: 'welcome-modal' });
    await capture({ email: 'sam@example.test', source: 'welcome-modal', booked: true });
    expect(captureDoc()[1].newsletterOptIn).toBe(true);
  });

  it('is absent (not false) when the box was not ticked', async () => {
    await capture({ email: 'sam@example.test', source: 'home' });
    expect(captureDoc()[1].newsletterOptIn).toBeUndefined();
  });
});

describe('"we have your email" acknowledgement', () => {
  it('goes once, on the first sighting only, with two signed confirm links', async () => {
    await capture({ email: 'sam@example.test', source: 'welcome-modal' });
    await capture({ email: 'sam@example.test', source: 'welcome-modal', booked: true });
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('sam@example.test');
    expect(mail.text).toMatch(/email-preferences\?id=capture_[a-f0-9]{32}&a=contact&t=/);
    expect(mail.text).toMatch(/a=newsletter/);
    expect(captureDoc()[1].acknowledgement).toBe('sent');
  });

  it('leaves out the newsletter button for someone who already ticked the box', async () => {
    await capture({ email: 'sam@example.test', source: 'welcome-modal', newsletterOptIn: true });
    expect(send.mock.calls[0][0].text).not.toMatch(/a=newsletter/);
  });

  it('asks for a reply instead of buttons when no link secret is configured', async () => {
    vi.stubEnv('EMAIL_LINK_SECRET', '');
    await capture({ email: 'sam@example.test', source: 'welcome-modal' });
    expect(send.mock.calls[0][0].text).toContain('Just reply to this email');
  });

  it('is skipped for the sandbox sender and for a marked test device', async () => {
    from = 'Not The Rug <onboarding@resend.dev>';
    await capture({ email: 'a@example.test', source: 'welcome-modal' });
    docs.set('testDevices/dev-1', { id: 'dev-1' });
    from = 'Not The Rug <luis@nottherug.com>';
    await capture({ email: 'b@example.test', source: 'welcome-modal', linkage: { td: 'dev-1' } });
    expect(send).not.toHaveBeenCalled();
  });

  it('is not sent to someone who already finished the questionnaire', async () => {
    const { captureIdForEmail } = await import('@/lib/server/leadTransitions');
    docs.set(`leads/${captureIdForEmail('sam@example.test')}`, { status: 'converted', convertedLeadId: 'a'.repeat(64), submittedAt: 'x' });
    await capture({ email: 'sam@example.test', source: 'book', booked: true });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('POST /api/email-preferences', () => {
  async function confirm(body: unknown) {
    const { POST } = await import('@/app/api/email-preferences/route');
    return POST(new Request('http://localhost/api/email-preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  }
  const id = `capture_${'b'.repeat(32)}`;

  it('records the yes from a correctly signed link, on the capture and the converted lead', async () => {
    const { consentLink } = await import('@/lib/leads/consentLinks');
    const leadId = 'c'.repeat(64);
    docs.set(`leads/${id}`, { id, convertedLeadId: leadId });
    docs.set(`leads/${leadId}`, { id: leadId });
    const url = new URL(consentLink(id, 'contact')!);
    const res = await confirm({ id, a: 'contact', t: url.searchParams.get('t') });
    expect(res.status).toBe(200);
    expect(docs.get(`leads/${id}`)).toMatchObject({ contactOptIn: true, contactOptInVia: 'email-link' });
    expect(docs.get(`leads/${leadId}`)!.contactOptIn).toBe(true);
  });

  it('rejects a forged or mismatched token and records nothing', async () => {
    const { consentLink } = await import('@/lib/leads/consentLinks');
    docs.set(`leads/${id}`, { id });
    const t = new URL(consentLink(id, 'contact')!).searchParams.get('t');
    expect((await confirm({ id, a: 'newsletter', t })).status).toBe(400);
    expect((await confirm({ id, a: 'contact', t: 'x'.repeat(43) })).status).toBe(400);
    expect(fsMergeDoc).not.toHaveBeenCalled();
  });

  it('never creates a record for an unknown address', async () => {
    const { consentLink } = await import('@/lib/leads/consentLinks');
    const t = new URL(consentLink(id, 'newsletter')!).searchParams.get('t');
    expect((await confirm({ id, a: 'newsletter', t })).status).toBe(404);
    expect(docs.size).toBe(0);
  });
});

describe('request confirmation email', () => {
  const valid = {
    name: 'Sam Rivera', email: 'sam@example.test', phone: '(347) 555-0134', contactPreference: 'text',
    days: ['tue'], windows: ['evening'], timeZone: 'America/New_York', note: '', source: 'book', sourcePage: '/book',
    idempotencyKey: 'k-1', newsletterOptIn: true,
  };
  async function post(body: unknown) {
    const { POST } = await import('@/app/api/leads/alternate-time/route');
    return POST(new Request('http://localhost/api/leads/alternate-time', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  }
  const request = () => [...docs.entries()].find(([p]) => p.startsWith('alternateTimeRequests/'))![1];

  it('sends the requester one confirmation that says nothing is booked, and records consent', async () => {
    await post(valid);
    await post(valid); // retry, same attempt key
    const toCustomer = send.mock.calls.map((c) => c[0]).filter((m) => m.to === 'sam@example.test');
    expect(toCustomer).toHaveLength(1);
    expect(toCustomer[0].text).toContain("This doesn't book an appointment yet.");
    expect(toCustomer[0].text).toContain('Reach you by: Text me');
    expect(request()).toMatchObject({ customerNotification: 'sent', notification: 'sent', newsletterOptIn: true });
  });

  it('skips the customer confirmation with the sandbox sender', async () => {
    from = 'Not The Rug <onboarding@resend.dev>';
    await post(valid);
    expect(send.mock.calls.filter((c) => c[0].to === 'sam@example.test')).toHaveLength(0);
    expect(request().customerNotification).toBe('skipped');
  });
});

describe('questionnaire completeness', () => {
  it('does not count consent flags as questions', async () => {
    const { COUNTED_LEAD_FIELDS } = await import('@/lib/leads/completeness');
    const keys = COUNTED_LEAD_FIELDS.map((f) => f.key);
    expect(keys).not.toContain('newsletterOptIn');
    expect(keys).not.toContain('contactOptIn');
  });
});
