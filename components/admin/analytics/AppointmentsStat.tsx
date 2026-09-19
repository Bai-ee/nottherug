'use client';

/**
 * Owner decision 7: appointments scheduled is reported as its own number,
 * never summed with inquiries into a "conversions" figure. Keeping this in
 * its own component (rather than folding it into InquiryHeadline) is a
 * structural guard against that merge happening later by accident.
 */
export function AppointmentsStat({ appointmentsScheduled }: { appointmentsScheduled: number }) {
  return (
    <section id="admin-analytics-appointments-panel" className="analytics-panel analytics-stat-panel">
      <div className="analytics-label">Appointments Scheduled</div>
      <div className="analytics-secondary-number">{appointmentsScheduled.toLocaleString('en-US')}</div>
      <div className="analytics-note">Verified Calendly completions · reported separately from inquiries, never combined</div>
    </section>
  );
}
