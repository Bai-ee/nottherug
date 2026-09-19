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
 */
export function FunnelPanel({ funnel }: { funnel: BookingFunnel }) {
  return (
    <section id="admin-analytics-funnel-panel" className="analytics-panel">
      <div className="analytics-panel-head">
        <h2 className="analytics-panel-title">Booking Funnel</h2>
      </div>
      <div className="analytics-panel-body">
        <table className="analytics-table">
          <thead>
            <tr><th>Step</th><th className="analytics-table-num">Visits</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Form Started</td>
              <td className="analytics-table-num">{funnel.formStarts.toLocaleString('en-US')}</td>
            </tr>
            {funnel.steps.map((row) => (
              <tr key={row.step}>
                <td>{humanizeStep(row.step)}</td>
                <td className="analytics-table-num">{row.sessions.toLocaleString('en-US')}</td>
              </tr>
            ))}
            <tr>
              <td>Scheduling Dialog Opened</td>
              <td className="analytics-table-num">{funnel.dialogOpened.toLocaleString('en-US')}</td>
            </tr>
            <tr>
              <td>Scheduled via Calendly</td>
              <td className="analytics-table-num">{funnel.calendlyScheduled.toLocaleString('en-US')}</td>
            </tr>
            <tr>
              <td>Phone-Consultation Path <span className="analytics-note">(saved a lead without opening the dialog — a completed inquiry, not a drop-off)</span></td>
              <td className="analytics-table-num">{funnel.phoneConsultPath.toLocaleString('en-US')}</td>
            </tr>
          </tbody>
        </table>

        <div className="analytics-note-block">
          <div className="analytics-note">
            Form Started also counts the short form on the home page, which has no question steps of its own, so it is
            normally higher than the step rows below it.
          </div>
          <div className="analytics-note">
            Scheduling Dialog Opened also counts people who picked a time straight from the welcome pop-up without
            answering the questions, so it can be higher than the step above it.
          </div>
        </div>
      </div>
    </section>
  );
}
