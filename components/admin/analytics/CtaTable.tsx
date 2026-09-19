'use client';

import type { CtaRow } from '@/lib/analytics/report';
import { CTA_LABELS, CTA_CATEGORY_ORDER, groupLiveCtaIds, type CtaCategory } from './ctaLabels';

const CATEGORY_GROUPS = groupLiveCtaIds();

function categorySlug(category: CtaCategory): string {
  return category.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Grouped by what the click MEANS (Booking, Contact, Phone, Email, Service
 * discovery) rather than one flat list sorted by count — the owner's
 * question is "which path brings people in," not "which button ranks
 * highest." Rows within a group are still sorted by click count, so the
 * top performer in each path is easy to spot.
 *
 * Every id rendered here comes from LIVE_CTA_IDS via CTA_LABELS, so a row
 * only ever exists for a control that actually renders on the site — see
 * plans/003-admin-dashboard-and-tracking.md A5 honesty rules. There is no
 * "not yet instrumented" section: CTA_IDS and LIVE_CTA_IDS are now the same
 * 16-id list (lib/analytics/events.ts), so an id with no rendered element
 * cannot appear in ctaClicks at all — that section was dead code once the
 * nine stale reserved ids were removed from the contract, and has been
 * deleted rather than kept around unreachable.
 */
export function CtaTable({ ctaClicks }: { ctaClicks: CtaRow[] }) {
  const clicksById = new Map(ctaClicks.map((row) => [row.cta, row.clicks]));
  const categoriesWithIds = CTA_CATEGORY_ORDER.filter((category) => CATEGORY_GROUPS[category].length > 0);

  return (
    <section id="admin-analytics-cta-table" className="analytics-panel">
      <div className="analytics-panel-head">
        <h2 className="analytics-panel-title">CTA Clicks</h2>
      </div>
      <div className="analytics-panel-body">
        {categoriesWithIds.length === 0 ? (
          <div className="analytics-empty">No CTA buttons are configured.</div>
        ) : (
          categoriesWithIds.map((category) => {
            const rows = CATEGORY_GROUPS[category]
              .map((id) => ({ id, clicks: clicksById.get(id) ?? 0 }))
              .sort((a, b) => b.clicks - a.clicks);
            return (
              <div key={category} id={`admin-analytics-cta-group-${categorySlug(category)}`} className="analytics-cta-group">
                <div className="analytics-label">{category}</div>
                <table className="analytics-table">
                  <thead>
                    <tr><th>Button</th><th className="analytics-table-num">Clicks</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>{CTA_LABELS[row.id]}</td>
                        <td className="analytics-table-num">{row.clicks.toLocaleString('en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
