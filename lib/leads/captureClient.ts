import { getSubmissionLinkage } from '@/lib/analytics/identity';

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
 * Calendly callback (or the visitor's own "yes, I booked"). `bookingId` is the
 * opaque Calendly invitee id from that same verified callback, when Calendly
 * sent one; the server hashes it. Nothing else is read out of the provider's
 * message. The linkage ids are random first-party ids (see
 * lib/analytics/identity.ts), never anything the visitor typed.
 */
export function captureLeadEmail(
  email: string,
  source: string,
  booked = false,
  bookingId: string | null = null,
  /** Only ever sent as true: an unticked box never withdraws an earlier yes. */
  extra: { newsletterOptIn?: boolean } = {},
): void {
  try {
    void fetch('/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        source,
        ...(booked ? { booked: true } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(extra.newsletterOptIn ? { newsletterOptIn: true } : {}),
        linkage: getSubmissionLinkage(),
      }),
    }).catch((err) => {
      console.warn('[leads] capture failed', err);
    });
  } catch (err) {
    // Storage/network APIs can throw synchronously in locked-down browsers.
    console.warn('[leads] capture failed', err);
  }
}
