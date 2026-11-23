import { describe, it, expect, vi, afterEach } from 'vitest';
import { notifyHitloopLead } from '@/lib/server/hitloopNotify';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('HITLOOP "NTR - New Lead" ping', () => {
  it('is off when no secret is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('HITLOOP_LEAD_ALERT_SECRET', '');
    expect(await notifyHitloopLead('email-only')).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends only the lead type, with the bearer secret', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('HITLOOP_LEAD_ALERT_SECRET', 's3cret');
    expect(await notifyHitloopLead('meet-greet')).toBe('sent');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://hitloop.agency/api/client-events/lead');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer s3cret');
    expect(JSON.parse(String(init.body))).toEqual({ leadType: 'meet-greet' });
  });

  it('never throws on a rejection or network error', async () => {
    vi.stubEnv('HITLOOP_LEAD_ALERT_SECRET', 's3cret');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    expect(await notifyHitloopLead('time-request')).toBe('failed');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await notifyHitloopLead('time-request')).toBe('failed');
  });
});
