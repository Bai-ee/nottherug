/**
 * Coverage for appointment_completed wiring: createAppointmentCompletionHandler
 * (components/booking/SchedulingDialog.tsx) and isVerifiedCalendlyBookingEvent
 * (lib/analytics/verifiedOrigin.ts). Runs in vitest's node environment — the
 * dialog itself is never rendered (no DOM/iframe here); MessageEvent-shaped
 * plain objects stand in for real postMessage events, and the analytics
 * tracker is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track }));

const CALENDLY_ORIGIN = 'https://calendly.com';

function calendlyWindow(): Window {
  return { name: 'calendly-iframe' } as unknown as Window;
}

function fakeMessageEvent(overrides: Partial<{ origin: string; source: unknown; data: unknown }> = {}): MessageEvent {
  return {
    origin: CALENDLY_ORIGIN,
    source: calendlyWindow(),
    data: { event: 'calendly.event_scheduled' },
    ...overrides,
  } as unknown as MessageEvent;
}

describe('isVerifiedCalendlyBookingEvent', () => {
  it('accepts a real event_scheduled message from the Calendly origin', async () => {
    const { isVerifiedCalendlyBookingEvent } = await import('@/lib/analytics/verifiedOrigin');
    expect(isVerifiedCalendlyBookingEvent(fakeMessageEvent())).toBe(true);
  });

  it('rejects a message from any other origin — a forged postMessage', async () => {
    const { isVerifiedCalendlyBookingEvent } = await import('@/lib/analytics/verifiedOrigin');
    const forged = fakeMessageEvent({ origin: 'https://evil.example' });
    expect(isVerifiedCalendlyBookingEvent(forged)).toBe(false);
  });

  it('rejects a same-origin message from a window other than the expected Calendly iframe', async () => {
    const { isVerifiedCalendlyBookingEvent } = await import('@/lib/analytics/verifiedOrigin');
    const otherWindow = { name: 'not-the-iframe' } as unknown as Window;
    const event = fakeMessageEvent({ source: otherWindow });
    expect(isVerifiedCalendlyBookingEvent(event, calendlyWindow())).toBe(false);
  });

  it('rejects a Calendly message that is not the "event_scheduled" event', async () => {
    const { isVerifiedCalendlyBookingEvent } = await import('@/lib/analytics/verifiedOrigin');
    const event = fakeMessageEvent({ data: { event: 'calendly.profile_page_viewed' } });
    expect(isVerifiedCalendlyBookingEvent(event)).toBe(false);
  });

  it('rejects a malformed payload without throwing', async () => {
    const { isVerifiedCalendlyBookingEvent } = await import('@/lib/analytics/verifiedOrigin');
    expect(isVerifiedCalendlyBookingEvent(fakeMessageEvent({ data: null }))).toBe(false);
    expect(isVerifiedCalendlyBookingEvent(fakeMessageEvent({ data: 'not-an-object' }))).toBe(false);
  });
});

describe('createAppointmentCompletionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records appointment_completed for a verified booking message', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const iframeWindow = calendlyWindow();
    const hasFired = { current: false };
    const handle = createAppointmentCompletionHandler('book-page', () => iframeWindow, hasFired);

    handle(fakeMessageEvent({ source: iframeWindow }));

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('appointment_completed', { source: 'book-page' });
  });

  it('deduplicates repeated messages so one booking is one event', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const iframeWindow = calendlyWindow();
    const hasFired = { current: false };
    const handle = createAppointmentCompletionHandler('book-page', () => iframeWindow, hasFired);

    handle(fakeMessageEvent({ source: iframeWindow }));
    handle(fakeMessageEvent({ source: iframeWindow })); // Calendly re-posting the same booking
    handle(fakeMessageEvent({ source: iframeWindow }));

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('ignores a forged message from the wrong origin', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const iframeWindow = calendlyWindow();
    const hasFired = { current: false };
    const handle = createAppointmentCompletionHandler('book-page', () => iframeWindow, hasFired);

    handle(fakeMessageEvent({ origin: 'https://evil.example', source: iframeWindow }));

    expect(track).not.toHaveBeenCalled();
    expect(hasFired.current).toBe(false);
  });

  it('ignores a same-origin message that did not come from the actual iframe window', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const iframeWindow = calendlyWindow();
    const otherWindow = { name: 'some-other-window' } as unknown as Window;
    const hasFired = { current: false };
    const handle = createAppointmentCompletionHandler('book-page', () => iframeWindow, hasFired);

    handle(fakeMessageEvent({ source: otherWindow }));

    expect(track).not.toHaveBeenCalled();
  });

  it('rejects a message when the intended iframe has not loaded yet (no expected window)', async () => {
    // Before the Calendly iframe finishes loading, iframeRef.current?.contentWindow
    // is null, so getIframeWindow() returns null (not undefined) — the handler
    // must treat "no iframe to trust yet" as "reject", not "skip the check".
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const someWindow = { name: 'anything' } as unknown as Window;
    const hasFired = { current: false };
    const handle = createAppointmentCompletionHandler('book-page', () => null, hasFired);

    handle(fakeMessageEvent({ source: someWindow }));

    expect(track).not.toHaveBeenCalled();
    expect(hasFired.current).toBe(false);
  });

  // T4 item 6 (plans/004-frontend-tracking-coverage.md): track() is
  // documented as best-effort/never-throwing, but this handler must not trust
  // that — it runs inside a raw `window.addEventListener('message', ...)`
  // callback, where an uncaught throw would surface as a console error on
  // every real visitor's page.
  it('does not throw when track() throws synchronously, and still dedupes correctly', async () => {
    track.mockImplementationOnce(() => {
      throw new Error('simulated analytics failure');
    });
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const iframeWindow = calendlyWindow();
    const hasFired = { current: false };
    const handle = createAppointmentCompletionHandler('book-page', () => iframeWindow, hasFired);

    expect(() => handle(fakeMessageEvent({ source: iframeWindow }))).not.toThrow();
    expect(hasFired.current).toBe(true);

    // A second, legitimate repeat message from Calendly must still be ignored.
    handle(fakeMessageEvent({ source: iframeWindow }));
    expect(track).toHaveBeenCalledTimes(1); // only the (throwing) first attempt
  });

  it('never forwards any field from the Calendly payload — only the source category', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const iframeWindow = calendlyWindow();
    const hasFired = { current: false };
    const handle = createAppointmentCompletionHandler('book-page', () => iframeWindow, hasFired);

    handle(
      fakeMessageEvent({
        source: iframeWindow,
        data: {
          event: 'calendly.event_scheduled',
          payload: { invitee: { name: 'Jane Visitor', email: 'jane@example.test' } },
        },
      }),
    );

    expect(track).toHaveBeenCalledTimes(1);
    const [, payload] = track.mock.calls[0];
    expect(Object.keys(payload as object)).toEqual(['source']);
    expect(JSON.stringify(payload)).not.toContain('Jane');
    expect(JSON.stringify(payload)).not.toContain('example.test');
  });
});
