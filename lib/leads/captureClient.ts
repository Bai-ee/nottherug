/**
 * Client-side hand-off to POST /api/leads/capture.
 *
 * Bookkeeping only, and deliberately fire-and-forget: it records that someone
 * gave an email and went to book, so a person who books on Calendly and never
 * returns still exists as a lead. Opening the scheduler, confirming a booking
 * and navigating are all the priority — a slow or failing capture must never
 * block, delay, or surface an error for any of them.
 *
 * `booked` is only ever the self-reported hint from the verified-origin
 * Calendly callback. Nothing is ever read out of the provider's message
 * payload, and the server stores it under a name that says it is self
 * reported.
 */
export function captureLeadEmail(email: string, source: string, booked = false): void {
  try {
    void fetch('/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, ...(booked ? { booked: true } : {}) }),
    }).catch((err) => {
      console.warn('[leads] capture failed', err);
    });
  } catch (err) {
    // Storage/network APIs can throw synchronously in locked-down browsers.
    console.warn('[leads] capture failed', err);
  }
}
