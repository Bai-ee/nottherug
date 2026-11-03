'use client';

import type { AnalyticsReport } from '@/lib/analytics/report';
import type { PeriodCounts } from '@/lib/analytics/bookingReport';

const n = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString('en-US'));

function Row({ label, value, note, id }: { label: string; value: string; note?: string; id?: string }) {
  return (
    <>
      <div className="rc-row" id={id}>
        <span>{label}</span>
        <span className="rc-value">{value}</span>
      </div>
      {note ? <p className="form-note admin-card-note">{note}</p> : null}
    </>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function PeriodTable({ before, after }: { before: PeriodCounts; after: PeriodCounts }) {
  const rows: Array<[string, (p: PeriodCounts) => number | null]> = [
    ['Sessions', (p) => p.sessions],
    ['Unique browsers', (p) => p.uniqueBrowsers],
    ['Scheduler opened (sessions)', (p) => p.schedulerOpenedSessions],
    ['Booking events', (p) => p.bookingEvents],
    ['Distinct bookings', (p) => p.distinctBookings],
    ['Request form opened (sessions)', (p) => p.altRequestOpenedSessions],
    ['Time requests saved', (p) => p.altRequestsSaved],
    ['Email link clicks', (p) => p.emailLinkClicks],
  ];
  return (
    <div id="admin-availability-compare-table" role="table" aria-label="Before and after the availability change">
      <div className="rc-row admin-compare-row" role="row">
        <span role="columnheader" className="rc-label">Measure</span>
        <span role="columnheader" className="rc-label">Before ({before.days}d)</span>
        <span role="columnheader" className="rc-label">After ({after.days}d)</span>
      </div>
      {rows.map(([label, get]) => (
        <div key={label} className="rc-row admin-compare-row" role="row">
          <span role="cell">{label}</span>
          <span role="cell" className="rc-value">{n(get(before))}</span>
          <span role="cell" className="rc-value">{n(get(after))}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Plan 017: does the reduced Calendly availability lose prospects? Every
 * figure is a count with its own definition; none is a conversion rate,
 * because a request and a booking in the same window are rarely the same
 * person and often fall on different dates.
 */
export function BookingAvailabilityPanel({ report }: { report: AnalyticsReport }) {
  const b = report.bookingAvailability;
  const change = report.availabilityChange;
  const linkage = report.funnel.savedLinkage;
  if (!b) return null;
  const reasons = Object.entries(b.altRequestFailureReasons)
    .map(([k, v]) => `${k.replace('_', ' ')} ${v}`)
    .join(', ');

  return (
    <section id="admin-booking-availability-panel" className="card card-pad">
      <div className="stamp-label">Booking &amp; Availability</div>
      <div className="admin-analytics-panel-body">
        <div id="admin-booking-availability-visits-rows">
          <Row label="Sessions" value={n(b.sessions)} />
          <Row
            label="Unique browsers"
            value={n(b.uniqueBrowsers)}
            note={b.sessionsWithoutBrowserId > 0 ? `${n(b.sessionsWithoutBrowserId)} session(s) had no browser id (recorded before browser ids existed, or storage blocked) and are not in this count.` : undefined}
          />
          <Row label="Questionnaire submissions" value={n(report.inquiries)} />
          <Row label="Distinct contacts" value={n(report.distinctContacts)} note="Distinct email addresses across questionnaires, booking emails and time requests." />
          {report.repeatContactEmails ? (
            <Row label="Emails with repeat submissions" value={n(report.repeatContactEmails)} note="Same address submitted more than once — review in Leads. Not treated as test." />
          ) : null}
        </div>

        <div className="divider" />
        <div id="admin-booking-availability-booking-rows">
          <Row label="Scheduler opened (sessions)" value={n(b.schedulerOpenedSessions)} />
          <Row label="Booking events" value={n(b.bookingEvents)} note="Calendly's in-browser completion message reached the page. Replays of the same booking are counted once." />
          <Row
            label="Distinct bookings"
            value={n(b.distinctBookings)}
            note={b.bookingEventsWithoutId > 0 ? `${n(b.bookingEventsWithoutId)} booking event(s) carried no Calendly id and cannot be de-duplicated beyond the event itself.` : 'Distinct Calendly booking ids.'}
          />
          <Row label="Confirmed appointments" value="Not connected" note="Needs Calendly's API or webhooks, which this site does not use. Cancellations and no-shows are not visible here." />
        </div>

        <div className="divider" />
        <div id="admin-booking-availability-request-rows">
          <Row label="Time request form opened (sessions)" value={n(b.altRequestOpenedSessions)} />
          <Row label="Time requests saved" value={n(b.altRequestsSaved)} note="From the saved requests themselves. A request is not a booking." />
          <Row
            label="Request saves that failed"
            value={n(b.altRequestFailedEvents)}
            note={reasons ? `By reason: ${reasons}. Includes form-check failures fixed on the next try.` : undefined}
          />
          {b.altRequestOutcomes ? (
            <Row
              id="admin-booking-availability-outcomes-row"
              label="Requests by status"
              value={`New ${b.altRequestOutcomes.new} · Contacted ${b.altRequestOutcomes.contacted} · Scheduled ${b.altRequestOutcomes.scheduled} · Closed ${b.altRequestOutcomes.closed}`}
              note="“Scheduled” is set by hand on the request in Leads — the only link from a request to a booking. Other requests' outcomes are unknown."
            />
          ) : null}
        </div>

        <div className="divider" />
        <div id="admin-booking-availability-email-rows">
          <Row label="Email link clicks" value={n(b.emailLinkClicks)} note={`From ${n(b.emailClickSessions)} session(s), ${n(b.emailClickBrowsers)} browser(s). A click opens the visitor's mail app if they have one — it never means an email was sent.`} />
          <Row label="Email address copied" value={n(b.emailCopies)} />
        </div>

        {linkage ? (
          <>
            <div className="divider" />
            <div id="admin-booking-availability-saved-rows">
              <Row label="Saved with scheduler in same session" value={n(linkage.withSchedulerSameSession)} />
              <Row label="Saved after an earlier linked booking" value={n(linkage.afterEarlierBooking)} />
              <Row label="Saved, booking unknown" value={n(linkage.unknown)} note="No booking could be linked to these sessions. Unknown — they may have booked on another device or before browser ids existed. Not abandonment." />
            </div>
          </>
        ) : null}

        <div className="divider" />
        <div id="admin-booking-availability-test-rows">
          {report.meta.testView === 'with_test' ? (
            <p className="form-note admin-card-note">Test activity is included in every figure on this page.</p>
          ) : (
            <Row
              label="Confirmed test activity excluded"
              value={`${n(b.excludedTest.sessions)} sessions · ${n(b.excludedTest.leads)} leads · ${n(b.excludedTest.requests)} requests`}
            />
          )}
          {report.meta.testClassification === 'unavailable' ? (
            <p className="form-note admin-card-note text-terra">Test markers could not be read, so only build-time test traffic is excluded right now.</p>
          ) : null}
        </div>

        <div className="divider" />
        <div id="admin-booking-availability-change-block">
          <div className="rc-label">Around the availability change</div>
          {!change || !change.configured ? (
            <p className="form-note admin-card-note text-terra" id="admin-availability-change-missing">
              Not configured. Set {change && !change.configured ? change.envVar : 'BOOKING_AVAILABILITY_CHANGED_AT'} to the exact
              time Calendly availability changed (ISO 8601 with offset, e.g. 2026-10-20T09:00:00-04:00)
              {change && !change.configured && change.reason === 'invalid' ? ' — the current value could not be read' : ''}.
            </p>
          ) : change.pending ? (
            <p className="form-note admin-card-note">Change recorded for {fmt(change.changedAt)} — nothing to compare yet.</p>
          ) : change.before && change.after ? (
            <>
              <p className="form-note admin-card-note">
                Changed {fmt(change.changedAt)} (New York). Equal windows either side, as long as the selected range; counts only.
                The time request form is new, so “before” requests are zero because it did not exist.
                {change.trackingStartDate && change.trackingStartDate > change.before.startIso ? ' Tracking started inside the “before” window, so it is short.' : ''}
                {change.truncated ? ' Some events were not read (row limit), so these are floors.' : ''}
              </p>
              <PeriodTable before={change.before} after={change.after} />
            </>
          ) : (
            <p className="form-note admin-card-note text-terra">The comparison could not be loaded this time.</p>
          )}
        </div>
      </div>
    </section>
  );
}
