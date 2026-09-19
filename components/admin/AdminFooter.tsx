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
export function AdminFooter({ lastRefreshed }: { lastRefreshed?: Date | null }) {
  const value = lastRefreshed ? `${REFRESH_TIME_FORMAT.format(lastRefreshed)} ET` : 'not refreshed yet';
  return (
    // The site's global footer rule paints this band olive, so the label and
    // value use the light-on-dark variants the marketing footer uses.
    <footer id="admin-chrome-footer">
      <div className="container">
        <span className="stamp-label stamp-label-dark">Last data refresh</span>
        <span id="admin-chrome-footer-value" className="footer-copy">{value}</span>
      </div>
    </footer>
  );
}
