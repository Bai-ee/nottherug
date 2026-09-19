'use client';

/**
 * Owner decision 7: appointments scheduled is reported as its own number,
 * never summed with inquiries into a "conversions" figure. Keeping this in
 * its own component (rather than folding it into InquiryHeadline) is a
 * structural guard against that merge happening later by accident.
 *
 * Presentation: one of three stat cards in #admin-analytics-stats-row
 * (homepage .grid-3), figure in the shared hero-stat-item treatment.
 */
export function AppointmentsStat({ appointmentsScheduled }: { appointmentsScheduled: number }) {
  return (
    <section id="admin-analytics-appointments-panel" className="card card-pad">
      <div className="stamp-label">Appointments Scheduled</div>
      <div className="hero-stat-item">
        <div className="hero-stat-num">{appointmentsScheduled.toLocaleString('en-US')}</div>
        <div className="hero-stat-label">Verified Completions</div>
      </div>
      <p className="form-note">Verified Calendly completions · reported separately from inquiries, never combined</p>
    </section>
  );
}
