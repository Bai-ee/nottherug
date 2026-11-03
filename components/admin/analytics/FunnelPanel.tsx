'use client';

import type { BookingFunnel } from '@/lib/analytics/report';

function humanizeStep(step: string): string {
  return step.charAt(0).toUpperCase() + step.slice(1);
}

/**
 * Owner decision 9: the funnel must not end at "dialog opened" — a session
 * that saves a lead without ever opening the scheduling dialog is a
 * completed inquiry, not abandonment. That is why savedSchedulerNotOpened is shown as its own row rather than folded
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
            <span>Booking reported in same session</span>
            <span className="rc-value">{funnel.calendlyScheduled.toLocaleString('en-US')}</span>
          </div>
          <div className="rc-row">
            <span>Saved, scheduler not opened in that session</span>
            <span className="rc-value">{funnel.savedSchedulerNotOpened.toLocaleString('en-US')}</span>
          </div>
          {funnel.savedLinkage ? (
            <p className="form-note" id="admin-analytics-funnel-saved-breakdown">
              Of all saved sessions: {funnel.savedLinkage.afterEarlierBooking.toLocaleString('en-US')} followed an earlier linked
              booking; {funnel.savedLinkage.unknown.toLocaleString('en-US')} have no linked booking (unknown, not abandonment).
            </p>
          ) : (
            <p className="form-note">
              (saved a lead without opening the scheduling dialog in that session — a completed inquiry, not a drop-off)
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
