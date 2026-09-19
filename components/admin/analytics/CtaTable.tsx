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
 *
 * Presentation: paper card; each category is a stamp of its own (rc-label)
 * over its own set of rc-row/rc-value pairs instead of a per-category
 * <table>.
 */
export function CtaTable({ ctaClicks }: { ctaClicks: CtaRow[] }) {
  const clicksById = new Map(ctaClicks.map((row) => [row.cta, row.clicks]));
  const categoriesWithIds = CTA_CATEGORY_ORDER.filter((category) => CATEGORY_GROUPS[category].length > 0);

  return (
    <section id="admin-analytics-cta-table" className="card card-pad">
      <div className="stamp-label">CTA Clicks</div>
      <div className="admin-analytics-panel-body">
        {categoriesWithIds.length === 0 ? (
          <p className="text-mid">No CTA buttons are configured.</p>
        ) : (
          categoriesWithIds.map((category) => {
            const rows = CATEGORY_GROUPS[category]
              .map((id) => ({ id, clicks: clicksById.get(id) ?? 0 }))
              .sort((a, b) => b.clicks - a.clicks);
            return (
              <div key={category} id={`admin-analytics-cta-group-${categorySlug(category)}`}>
                <div className="rc-label">{category}</div>
                <div>
                  {rows.map((row) => (
                    <div key={row.id} className="rc-row">
                      <span>{CTA_LABELS[row.id]}</span>
                      <span className="rc-value">{row.clicks.toLocaleString('en-US')}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
