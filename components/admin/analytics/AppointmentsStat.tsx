'use client';

/**
 * Owner decision 7: appointments scheduled is reported as its own number,
 * never summed with inquiries into a "conversions" figure. Keeping this in
 * its own component (rather than folding it into InquiryHeadline) is a
 * structural guard against that merge happening later by accident.
 *
 * The headline counts the leads whose browser reported a booking, so it grows
 * whenever a meeting is scheduled — whether or not the person went on to
 * answer a single question. The older event-based figure is kept underneath
 * as a second line: it only exists when Calendly's completion message reaches
 * the page and passes its origin check, so it runs behind, and a gap between
 * the two is expected rather than a fault.
 */
export function AppointmentsStat({
  bookedLeads,
  verifiedCompletions,
}: {
  /** Bookings the leads themselves report. Null in test mode / when the leads query failed. */
  bookedLeads: number | null;
  /** Origin-verified Calendly completion events in range. */
  verifiedCompletions: number;
}) {
  return (
    <section id="admin-analytics-appointments-panel" className="card card-pad">
      <div className="stamp-label">Appointments Scheduled</div>
      <div className="hero-stat-item">
        <div className="hero-stat-num">
          {bookedLeads === null ? 'Not measured' : bookedLeads.toLocaleString('en-US')}
        </div>
        <div className="hero-stat-label">Meetings Booked</div>
      </div>
      <p className="form-note">
        Counted whenever someone books, answered questions or not · never added to inquiries
      </p>
      <p id="admin-analytics-appointments-verified-note" className="form-note">
        {verifiedCompletions.toLocaleString('en-US')} of these were also confirmed by Calendly in the
        visitor&apos;s browser. That confirmation can go missing, so this is the lower number of the two.
      </p>
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
