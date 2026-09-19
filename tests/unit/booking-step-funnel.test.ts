/**
 * Coverage for the booking_step funnel helpers in
 * components/booking/BookingForm.tsx: funnelStepForFormIndex (which UI step
 * indices map to a named funnel step) and createStepFunnelTracker (dedup so
 * back/forward navigation never inflates the funnel). Runs in vitest's node
 * environment — BookingForm itself is never rendered, only these exported,
 * state-free helpers, with the analytics tracker mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track }));

describe('funnelStepForFormIndex', () => {
  it('maps step 1 ("Your dog") to the "dog" funnel step', async () => {
    const { funnelStepForFormIndex } = await import('@/components/booking/BookingForm');
    expect(funnelStepForFormIndex(1)).toBe('dog');
  });

  it('maps the last UI step ("Wrap up") to the "review" funnel step', async () => {
    const { funnelStepForFormIndex } = await import('@/components/booking/BookingForm');
    expect(funnelStepForFormIndex(4)).toBe('review');
  });

  it('does not map a named step for the interstitial "care"/"quirks" UI steps', async () => {
    const { funnelStepForFormIndex } = await import('@/components/booking/BookingForm');
    expect(funnelStepForFormIndex(2)).toBeNull();
    expect(funnelStepForFormIndex(3)).toBeNull();
  });

  it('does not map step 0 ("details") — that step is fired from markFormStarted instead', async () => {
    const { funnelStepForFormIndex } = await import('@/components/booking/BookingForm');
    expect(funnelStepForFormIndex(0)).toBeNull();
  });
});

describe('createStepFunnelTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires booking_step once for a single reach', async () => {
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('book-page');

    reach('dog');

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('booking_step', { step: 'dog', source: 'book-page' });
  });

  it('does not inflate the funnel when the same step is reached again (back/forward navigation)', async () => {
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('book-page');

    reach('dog'); // forward to "Your dog"
    reach('dog'); // back to step 0, then forward again — same step reached a second time
    reach('dog'); // and a third time

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('tracks each distinct named step once, independently', async () => {
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('book-page');

    reach('details');
    reach('dog');
    reach('dog'); // revisited — must not double-count
    reach('review');
    reach('schedule');

    expect(track).toHaveBeenCalledTimes(4);
    const stepsTracked = track.mock.calls.map(([, payload]) => (payload as { step: string }).step);
    expect(stepsTracked).toEqual(['details', 'dog', 'review', 'schedule']);
  });

  it('never sends a payload field beyond step/source — no form values', async () => {
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('home');

    reach('details');

    const [, payload] = track.mock.calls[0];
    expect(Object.keys(payload as object).sort()).toEqual(['source', 'step']);
  });

  // T4 item 2 (plans/004-frontend-tracking-coverage.md): the funnel must not
  // inflate under any of the named regression scenarios. createStepFunnelTracker
  // is the whole mechanism behind all of them (BookingForm calls the same
  // `reach` closure for every named step, whether reached via a Next/Back
  // click, a validation bounce, a resubmission, or reopening the scheduler
  // dialog), so each scenario is exercised as its underlying reach() sequence.

  it('a validation failure bouncing the user back, then forward again, does not inflate the step', async () => {
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('book-page');

    reach('dog'); // reached "Your dog" step
    // Step 3 fails validation (e.g. missing allergy detail) — user is bounced
    // back to an earlier UI step. No *named* funnel step maps to steps 2/3
    // (see funnelStepForFormIndex), so no reach() call happens on the bounce.
    reach('dog'); // user fixes the issue and returns forward through step 1 again

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('submitting, failing, and retrying the final step does not inflate the step', async () => {
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('book-page');

    reach('review'); // first reach of the wrap-up/review step
    // Submit fails (e.g. API error) — user stays on the same step and retries.
    reach('review');
    reach('review');

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('booking_step', { step: 'review', source: 'book-page' });
  });

  it('closing and reopening the scheduling dialog does not inflate the "schedule" step', async () => {
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('book-page');

    reach('schedule'); // dialog opened
    reach('schedule'); // closed, then reopened without completing
    reach('schedule'); // reopened again

    expect(track).toHaveBeenCalledTimes(1);
  });

  // T4 item 6: track() is documented as best-effort/never-throwing, but the
  // funnel tracker must not trust that — a throw here must not propagate out
  // of reach() and interrupt whatever caller (a step-change effect, a click
  // handler) invoked it.
  it('does not throw when track() throws synchronously (analytics failure isolation)', async () => {
    track.mockImplementationOnce(() => {
      throw new Error('simulated analytics failure');
    });
    const { createStepFunnelTracker } = await import('@/components/booking/BookingForm');
    const reach = createStepFunnelTracker('book-page');

    expect(() => reach('dog')).not.toThrow();

    // The step is still marked reached despite the throw, so a later call
    // for the same step correctly stays deduplicated rather than retrying.
    reach('dog');
    expect(track).toHaveBeenCalledTimes(1); // only the (throwing) first call was attempted
  });
});
