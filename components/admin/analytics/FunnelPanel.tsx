'use client';

import type { BookingFunnel } from '@/lib/analytics/report';

function humanizeStep(step: string): string {
  return step.charAt(0).toUpperCase() + step.slice(1);
}

/**
 * Owner decision 9: the funnel must not end at "dialog opened" — a session
 * that saves a lead without ever opening the scheduling dialog took the
 * phone-consultation path, which is a completed inquiry, not abandonment.
 * That is why phoneConsultPath is shown as its own row rather than folded
 * into a drop-off count.
 *
 * These rows are also not a strict cascade, and the notes under the table say
 * so plainly rather than letting the owner read a bigger number below a
 * smaller one as a tracking bug (docs/analytics-operations.md explains the
 * same two cases). Row order follows BOOKING_STEPS from
 * lib/analytics/events.ts — the contract order, never a local re-sort.
 *
 * Presentation: paper card; rows use rc-row/rc-value instead of a <table>.
 * The phone-consult row's inline aside moves to its own form-note line
 * below the row (still the same words); the homepage's .divider marks the
 * break before the funnel's two explanatory notes, in place of the old
 * border-top.
 */
export function FunnelPanel({ funnel }: { funnel: BookingFunnel }) {
  return (
    <section id="admin-analytics-funnel-panel" className="card card-pad">
      <div className="stamp-label">Booking Funnel</div>
      <div className="admin-analytics-panel-body">
        <div id="admin-analytics-funnel-rows">
          <div className="rc-row">
            <span>Form Started</span>
            <span className="rc-value">{funnel.formStarts.toLocaleString('en-US')}</span>
          </div>
          {funnel.steps.map((row) => (
            <div key={row.step} className="rc-row">
              <span>{humanizeStep(row.step)}</span>
              <span className="rc-value">{row.sessions.toLocaleString('en-US')}</span>
            </div>
          ))}
          <div className="rc-row">
            <span>Scheduling Dialog Opened</span>
            <span className="rc-value">{funnel.dialogOpened.toLocaleString('en-US')}</span>
          </div>
          <div className="rc-row">
            <span>Scheduled via Calendly</span>
            <span className="rc-value">{funnel.calendlyScheduled.toLocaleString('en-US')}</span>
          </div>
          <div className="rc-row">
            <span>Phone-Consultation Path</span>
            <span className="rc-value">{funnel.phoneConsultPath.toLocaleString('en-US')}</span>
          </div>
          <p className="form-note">
            (saved a lead without opening the dialog — a completed inquiry, not a drop-off)
          </p>
        </div>

        <div className="divider" />

        <div id="admin-analytics-funnel-notes">
          <p className="form-note">
            Form Started also counts the short form on the home page, which has no question steps of its own, so it is
            normally higher than the step rows below it.
          </p>
          <p className="form-note">
            Scheduling Dialog Opened also counts people who picked a time straight from the welcome pop-up without
            answering the questions, so it can be higher than the step above it.
          </p>
        </div>
      </div>
    </section>
  );
}
