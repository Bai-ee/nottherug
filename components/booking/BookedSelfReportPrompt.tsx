'use client';

import { useSyncExternalStore } from 'react';
import { captureLeadEmail } from '@/lib/leads/captureClient';
import {
  subscribeBookedSelfReport,
  getBookedSelfReport,
  getServerBookedSelfReport,
  clearBookedSelfReport,
} from '@/lib/booking/bookedSelfReport';

/**
 * Sits above the questionnaire and asks the one thing no automatic signal can
 * tell us reliably: whether the visitor actually booked. Calendly's
 * completion message is the only automatic source, and when it does not reach
 * the page a real booking is invisible — this is the fallback.
 *
 * Shown only to someone who just came back from the scheduler in this visit,
 * and answering either way dismisses it. The answer is recorded as
 * self-reported, which is how the leads table words it too.
 */
export function BookedSelfReportPrompt() {
  const pending = useSyncExternalStore(
    subscribeBookedSelfReport,
    getBookedSelfReport,
    getServerBookedSelfReport,
  );

  if (!pending) return null;

  return (
    <div id="home-booked-self-report" className="card card-pad">
      <p id="home-booked-self-report-question" className="form-note">
        Did you book a time just now?
      </p>
      <div id="home-booked-self-report-actions">
        <button
          type="button"
          id="home-booked-self-report-yes"
          className="btn btn-primary booking-forward-btn btn-sm btn-accent"
          onClick={() => {
            captureLeadEmail(pending.email, pending.source, true);
            clearBookedSelfReport();
          }}
        >
          Yes, it&apos;s booked
        </button>
        <button
          type="button"
          id="home-booked-self-report-no"
          className="btn btn-primary booking-forward-btn btn-sm btn-outline"
          onClick={() => clearBookedSelfReport()}
        >
          Not yet
        </button>
      </div>
    </div>
  );
}
