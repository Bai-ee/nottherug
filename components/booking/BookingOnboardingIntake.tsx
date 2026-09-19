'use client';

import { useEffect, useState } from 'react';
import MeetGreetForm from '@/components/MeetGreetForm';
import type { BookingFormValues } from './types';
import {
  getOnboardingHandoffStorage,
  isOnboardingScope,
  readOnboardingHandoff,
} from '@/lib/booking/onboarding-handoff';

type Props = {
  paneId: string;
  source: string;
  /** This page's existing query-string prefill (lib/leads/prefill.ts). */
  initialValues?: Partial<BookingFormValues>;
  initialPhoneConsult?: boolean;
};

/**
 * Wraps the booking form on /book with the welcome modal's onboarding
 * handoff.
 *
 * Two prefill paths reach this page and they are deliberately different:
 * the existing query-string one (lib/leads/prefill.ts, still used by the
 * services rate cards) arrives in `initialValues`, while the welcome modal
 * now hands over an email through sessionStorage instead, so no address ever
 * appears in a site URL. Whatever the modal stored wins over the query
 * string for the email, because it is the more recent thing the visitor
 * typed.
 *
 * An ordinary /book visit — no `?onboarding=welcome` — must behave exactly
 * as before: no storage read, no banner, the plain form.
 */
export default function BookingOnboardingIntake({
  paneId,
  source,
  initialValues,
  initialPhoneConsult = false,
}: Props) {
  const [handoffEmail, setHandoffEmail] = useState<string | null>(null);
  const [bookedDetailsMode, setBookedDetailsMode] = useState(false);
  // True only when the scope param is present but no usable handoff was
  // found (blocked storage, expired, malformed) — the self-report escape
  // hatch, so a visitor who really did book is not pushed to book twice.
  const [offerSelfReport, setOfferSelfReport] = useState(false);

  // One post-mount effect, and nothing in it is reachable without the scope
  // param, so a plain /book visit never touches sessionStorage. The state
  // writes are deferred out of the effect body (not called synchronously)
  // the same way the welcome modal defers its own.
  useEffect(() => {
    if (!isOnboardingScope(window.location.search)) return;
    const timer = window.setTimeout(() => {
      const handoff = readOnboardingHandoff(getOnboardingHandoffStorage());
      if (!handoff) {
        setOfferSelfReport(true);
        return;
      }
      setHandoffEmail(handoff.email);
      setBookedDetailsMode(handoff.bookingObserved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const values = handoffEmail ? { ...initialValues, email: handoffEmail } : initialValues;

  return (
    <div id="book-onboarding-intake-shell" data-section="book-onboarding-intake">
      {bookedDetailsMode && (
        <p id="book-onboarding-booked-note" className="form-note" style={{ marginBottom: '16px' }}>
          Your Meet &amp; Greet is already booked. These details just help us prepare. Check your Calendly
          confirmation email for the date and time.
        </p>
      )}
      {offerSelfReport && !bookedDetailsMode && (
        <button
          id="book-onboarding-self-report"
          type="button"
          className="btn"
          style={{ marginBottom: '16px' }}
          onClick={() => setBookedDetailsMode(true)}
        >
          Already booked? Just send details
        </button>
      )}
      <MeetGreetForm
        paneId={paneId}
        source={source}
        initialValues={values}
        initialPhoneConsult={initialPhoneConsult}
        bookedDetailsMode={bookedDetailsMode}
      />
    </div>
  );
}
