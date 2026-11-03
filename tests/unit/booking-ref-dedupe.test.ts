/**
 * Plan 017: booking completions deduplicate on Calendly's own booking id.
 * A replayed event_scheduled message (same invitee) counts once — in the
 * browser handler and again on the server — while a genuine second booking
 * (new invitee id) stays a distinct record.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track }));

const created = new Map<string, Record<string, unknown>>();
vi.mock('@/lib/server/firestoreRest', () => ({
  fsCreateDoc: vi.fn(async (path: string, data: Record<string, unknown>) => {
    if (created.has(path)) return { created: false };
    created.set(path, data);
    return { created: true };
  }),
  fsIncrementField: vi.fn(async () => 1),
}));

const iframe = { name: 'calendly' } as unknown as Window;
function scheduled(inviteeId?: string, eventId = 'EVT123'): MessageEvent {
  return {
    origin: 'https://calendly.com',
    source: iframe,
    data: {
      event: 'calendly.event_scheduled',
      payload: {
        event: { uri: `https://api.calendly.com/scheduled_events/${eventId}` },
        ...(inviteeId ? { invitee: { uri: `https://api.calendly.com/scheduled_events/${eventId}/invitees/${inviteeId}` } } : {}),
      },
    },
  } as unknown as MessageEvent;
}

describe('extractCalendlyBookingId', () => {
  it('returns the invitee id, falling back to the scheduled-event id', async () => {
    const { extractCalendlyBookingId } = await import('@/lib/analytics/verifiedOrigin');
    expect(extractCalendlyBookingId(scheduled('INV-1'))).toBe('INV-1');
    expect(extractCalendlyBookingId(scheduled(undefined, 'EVT9'))).toBe('evt-EVT9');
  });

  it('ignores anything that is not an api.calendly.com resource URI', async () => {
    const { extractCalendlyBookingId } = await import('@/lib/analytics/verifiedOrigin');
    const forged = {
      origin: 'https://calendly.com',
      data: { event: 'calendly.event_scheduled', payload: { invitee: { uri: 'https://evil.example/scheduled_events/x/invitees/jane@example.com' } } },
    } as unknown as MessageEvent;
    expect(extractCalendlyBookingId(forged)).toBeNull();
  });
});

describe('createAppointmentCompletionHandler dedupe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('counts a replayed message for the same booking once', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const onBooked = vi.fn();
    const handler = createAppointmentCompletionHandler('book', () => iframe, { current: false }, onBooked, new Set());
    handler(scheduled('INV-1'));
    handler(scheduled('INV-1'));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('appointment_completed', { source: 'book', bk: 'INV-1' });
    expect(onBooked).toHaveBeenCalledTimes(1);
    expect(onBooked).toHaveBeenCalledWith({
      inviteeUri: 'https://api.calendly.com/scheduled_events/EVT123/invitees/INV-1',
      bookingId: 'INV-1',
    });
  });

  it('keeps a genuine second booking distinct', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const handler = createAppointmentCompletionHandler('book', () => iframe, { current: false }, undefined, new Set());
    handler(scheduled('INV-1'));
    handler(scheduled('INV-2', 'EVT456'));
    expect(track).toHaveBeenCalledTimes(2);
  });

  it('without an id, still fires once per attempt (legacy rule)', async () => {
    const { createAppointmentCompletionHandler } = await import('@/components/booking/SchedulingDialog');
    const handler = createAppointmentCompletionHandler('book', () => iframe, { current: false }, undefined, new Set());
    const bare = { origin: 'https://calendly.com', source: iframe, data: { event: 'calendly.event_scheduled' } } as unknown as MessageEvent;
    handler(bare);
    handler(bare);
    expect(track).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/track booking dedupe', () => {
  beforeEach(() => created.clear());

  async function send(events: unknown[]) {
    const { POST } = await import('@/app/api/track/route');
    return POST(
      new Request('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost', 'user-agent': 'Mozilla/5.0 Test' },
        body: JSON.stringify(events),
      }),
    );
  }
  const base = { event: 'appointment_completed', sid: 'sess-1', ts: Date.now(), route: '/book' };

  it('stores a replay of the same booking (new client event id) once, hashed', async () => {
    const first = await (await send([{ ...base, id: 'evt-a', bk: 'INV-1' }])).json();
    const second = await (await send([{ ...base, id: 'evt-b', bk: 'INV-1' }])).json();
    expect(first.stored).toBe(1);
    expect(second.duplicate).toBe(1);
    const [path, doc] = [...created.entries()][0];
    expect(path).toMatch(/^analytics_events\/appt_[a-f0-9]{32}$/);
    expect(doc.bookingRef).toMatch(/^[a-f0-9]{32}$/);
    expect(JSON.stringify(doc)).not.toContain('INV-1');
  });

  it('stores two different bookings as two rows', async () => {
    await send([{ ...base, id: 'evt-a', bk: 'INV-1' }]);
    await send([{ ...base, id: 'evt-b', bk: 'INV-2' }]);
    expect(created.size).toBe(2);
  });

  it('never accepts a booking id on any other event type', async () => {
    await send([{ event: 'page_view', id: 'evt-p', sid: 'sess-1', ts: Date.now(), route: '/', bk: 'INV-1' }]);
    const doc = created.get('analytics_events/evt-p')!;
    expect(doc.bookingRef).toBeUndefined();
  });
});
