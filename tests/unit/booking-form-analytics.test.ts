/**
 * Coverage for submitMeetGreetLead (components/booking/BookingForm.tsx): the
 * one place that decides whether a booking submission counts as a saved lead
 * for analytics. Runs in vitest's node environment — BookingForm itself is
 * never rendered (no DOM here), only this exported, state-free function is
 * exercised, with global fetch and the analytics tracker mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track }));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// A payload shaped like a real submission — including the customer fields
// that must never reach an analytics event.
const CUSTOMER_BODY = {
  ownerName: 'Test Owner',
  phone: '(347) 555-0100',
  email: 'owner@example.test',
  dogName: 'Biscuit',
  notes: 'Pulls on the leash sometimes.',
  source: 'book-page',
};

describe('submitMeetGreetLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records lead_saved with only a source, and no customer field, once the save succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: true, id: 'lead-1', notifications: {} })));

    const result = await import('@/components/booking/BookingForm').then((m) =>
      m.submitMeetGreetLead(CUSTOMER_BODY, 'book-page'),
    );

    expect(result.ok).toBe(true);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('lead_saved', { source: 'book-page' });

    // Belt and suspenders: whatever was actually passed to track contains no
    // customer-identifying key, independent of track()'s own sanitize() step.
    const [, payload] = track.mock.calls[0];
    const forbidden = ['ownerName', 'phone', 'email', 'dogName', 'notes', 'name'];
    for (const key of Object.keys(payload)) {
      expect(forbidden.map((f) => f.toLowerCase())).not.toContain(key.toLowerCase());
    }

    vi.unstubAllGlobals();
  });

  it('does not record lead_saved when the API rejects the submission', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(400, { ok: false, error: 'Invalid submission' })));

    const { submitMeetGreetLead } = await import('@/components/booking/BookingForm');
    const result = await submitMeetGreetLead(CUSTOMER_BODY, 'book-page');

    expect(result.ok).toBe(false);
    expect(track).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('does not record lead_saved on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    const { submitMeetGreetLead } = await import('@/components/booking/BookingForm');
    const result = await submitMeetGreetLead(CUSTOMER_BODY, 'book-page');

    expect(result.ok).toBe(false);
    expect(track).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
