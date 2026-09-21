'use client';

/**
 * Owner decision 7: appointments scheduled is reported as its own number,
 * never summed with inquiries into a "conversions" figure. Keeping this in
 * its own component (rather than folding it into InquiryHeadline) is a
 * structural guard against that merge happening later by accident.
 *
 * Two figures share this card because the founder reads them together:
 * meetings on the calendar, and the people who booked but still owe answers.
 * Neither is an inquiry. They sit on one baseline (see .admin-stat-pair in
 * app/admin/admin.css) so the eye compares the numbers rather than their
 * positions, and the qualifications that apply to both are set once
 * underneath as fine print instead of twice as captions.
 *
 * The appointments headline counts the leads whose browser reported a
 * booking, so it grows whenever a meeting is scheduled — whether or not the
 * person went on to answer a single question. The older event-based figure is
 * kept in the fine print: it only exists when Calendly's completion message
 * reaches the page and passes its origin check, so it runs behind, and a gap
 * between the two is expected rather than a fault.
 */
export function AppointmentsStat({
  bookedLeads,
  verifiedCompletions,
  outstandingCaptures,
  degraded,
  testMode,
}: {
  /** Bookings the leads themselves report. Null in test mode / when the leads query failed. */
  bookedLeads: number | null;
  /** Origin-verified Calendly completion events in range. */
  verifiedCompletions: number;
  /** Email-only captures still waiting on answers. Null in test mode / when the leads query failed. */
  outstandingCaptures: number | null;
  /** True when the leads dependency itself failed for this report. */
  degraded: boolean;
  /** True when the dashboard is showing test/preview traffic only. */
  testMode: boolean;
}) {
  // Both figures come from the same leads read, so they are missing together
  // and for the same reason — said once, in words, under the pair.
  const figure = (value: number | null) => {
    if (testMode) return 'Not measured';
    if (degraded || value === null) return '—';
    return value.toLocaleString('en-US');
  };
  // A sentence set at figure scale reads as data. Words take the smaller step.
  const numClass = testMode ? 'hero-stat-num admin-stat-words' : 'hero-stat-num';

  return (
    <section id="admin-analytics-booking-panel" className="card card-pad">
      <div className="admin-stat-pair">
        <div className="admin-stat-col" id="admin-analytics-appointments-stat">
          <div className="stamp-label">Appointments Scheduled</div>
          <div className={numClass}>{figure(bookedLeads)}</div>
          <div className="hero-stat-label">Meetings booked</div>
        </div>

        <div className="admin-stat-col" id="admin-analytics-outstanding-captures-stat">
          <div className="stamp-label">Awaiting Answers</div>
          <div className={numClass}>{figure(outstandingCaptures)}</div>
          <div className="hero-stat-label">Booked, no answers yet</div>
        </div>
      </div>

      {testMode ? (
        <p className="form-note admin-card-note">
          Your leads list does not separate test from real, so neither figure is shown on this view.
          Switch to Real Data to see them.
        </p>
      ) : degraded ? (
        <p className="form-note admin-card-note text-terra">
          These could not be loaded this time.
        </p>
      ) : (
        <>
          <p className="form-note admin-card-note">
            A booking counts here whether or not the questions get answered. Neither figure is ever
            added to inquiries.
          </p>
          <p id="admin-analytics-appointments-verified-note" className="form-note admin-card-note">
            Calendly confirmed {verifiedCompletions.toLocaleString('en-US')} of them in the visitor&apos;s
            browser. That message often goes missing, so it runs low.
          </p>
        </>
      )}

      <a
        id="admin-analytics-appointments-leads-link"
        className="btn btn-primary booking-forward-btn btn-sm btn-accent"
        href="/admin/dashboard/leads"
      >
        View all leads
      </a>
    </section>
  );
}
