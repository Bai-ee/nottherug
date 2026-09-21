'use client';

import type { PageRow } from '@/lib/analytics/report';

/**
 * Owner-facing name for each tracked route. The owner reads this dashboard
 * himself, so '/neighborhoods/williamsburg' is shown as "Williamsburg" with
 * the path kept beside it for anyone who needs the literal URL.
 *
 * Typed as Record<string, string> (not Record<TrackedRoute, string>) because
 * PageRow.route is a plain string — a route that has no entry here falls back
 * to its own path rather than rendering blank.
 */
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/about': 'About',
  '/book': 'Book',
  '/contact': 'Contact',
  '/neighborhoods/williamsburg': 'Williamsburg',
  '/reviews': 'Reviews',
  '/safety': 'Safety',
  '/signup': 'Sign Up',
};

/**
 * Presentation: paper card; rows use rc-row/rc-label/rc-value instead of a
 * <table>. Views and visits are combined into one rc-value string per row
 * (rather than a second value column) to keep each row to the label+value
 * pair the rc-row spacing rule in app/admin/admin.css expects.
 */
export function PageTable({ pages }: { pages: PageRow[] }) {
  return (
    <section id="admin-analytics-page-table" className="card card-pad">
      <div className="stamp-label">Pages Viewed</div>
      <div className="admin-analytics-panel-body">
        {pages.length === 0 ? (
          <p className="text-mid">No page views in range yet.</p>
        ) : (
          <div id="admin-analytics-page-rows">
            {pages.map((row) => (
              <div key={row.route} className="rc-row">
                <span><span className="rc-label">{ROUTE_LABELS[row.route] ?? row.route}</span> {row.route}</span>
                <span className="rc-value">
                  {row.pageviews.toLocaleString('en-US')} views · {row.sessions.toLocaleString('en-US')} visits
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="divider" />
      <p className="form-note">
        Visits counts the visits that reached each page, so that column adds up to more than the total visits when one
        visit reads several pages. Views only covers the pages listed above, so it can add up to less than the page
        views total — a view of any other address is recorded without a page name and gets no row here.
      </p>
    </section>
  );
}
