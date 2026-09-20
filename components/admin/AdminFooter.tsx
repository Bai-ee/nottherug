const START_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const REFRESH_TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Owner decision (plans/003-admin-dashboard-and-tracking.md, #11): the admin
 * footer's job is to distinguish real zero activity from a stale page left
 * open, so it always shows the last data refresh time — never a fabricated
 * one. `lastRefreshed` is undefined/null until a page wires up a real
 * refresh timestamp; until then this renders "not refreshed yet".
 */
export function AdminFooter({
  lastRefreshed,
  trackingStartedAt,
}: {
  lastRefreshed?: Date | null;
  /** First recorded event's timestamp, when the page has a report to read it
   *  from. Only the analytics dashboard passes one. */
  trackingStartedAt?: string | null;
}) {
  const value = lastRefreshed ? `${REFRESH_TIME_FORMAT.format(lastRefreshed)} ET` : 'not refreshed yet';
  const started = trackingStartedAt ? new Date(trackingStartedAt) : null;
  const startedValue =
    started && !Number.isNaN(started.getTime()) ? START_DATE_FORMAT.format(started) : null;
  return (
    // The site's global footer rule paints this band olive, so the label and
    // value use the light-on-dark variants the marketing footer uses.
    <footer id="admin-chrome-footer">
      <div className="container">
        <span id="admin-chrome-footer-value" className="stamp-label stamp-label-dark">
          Last data refresh · {value}
        </span>
        {startedValue ? (
          <span id="admin-chrome-footer-tracking-started" className="stamp-label stamp-label-dark">
            Tracking started · {startedValue}
          </span>
        ) : null}
      </div>
    </footer>
  );
}
