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
};

export function PageTable({ pages }: { pages: PageRow[] }) {
  return (
    <section id="admin-analytics-page-table" className="analytics-panel">
      <div className="analytics-panel-head">
        <h2 className="analytics-panel-title">Pages Viewed</h2>
      </div>
      <div className="analytics-panel-body">
        {pages.length === 0 ? (
          <div className="analytics-empty">No page views in range yet.</div>
        ) : (
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Page</th>
                <th className="analytics-table-num">Views</th>
                <th className="analytics-table-num">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((row) => (
                <tr key={row.route}>
                  <td>
                    <span className="analytics-table-kind">{ROUTE_LABELS[row.route] ?? row.route}</span> {row.route}
                  </td>
                  <td className="analytics-table-num">{row.pageviews.toLocaleString('en-US')}</td>
                  <td className="analytics-table-num">{row.sessions.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="analytics-note">
        Sessions counts visits that reached each page, so the column adds up to more than total visits when one visit
        reads several pages.
      </div>
    </section>
  );
}
