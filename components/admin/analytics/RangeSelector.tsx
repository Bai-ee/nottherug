'use client';

import type { ReportRange } from '@/lib/analytics/report';

const RANGE_LABELS: Record<ReportRange, string> = {
  today: 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
};

const RANGES: ReportRange[] = ['today', '7d', '30d'];

/** Owner decision 5/3: today/7d/30d only, no custom picker — the volume this
 *  business sees does not justify one, and a wider range just means a wider
 *  bounded Firestore query (see lib/analytics/report.ts).
 *
 * Presentation: homepage paper-ticket buttons (.btn/.btn-sm), the active
 * range using .btn-accent (terracotta, olive on hover) and the unselected
 * ranges using its mirror .admin-btn-secondary (olive, terracotta on hover)
 * — the same primary/secondary split DataModeToggle uses, so the two
 * controls in #admin-analytics-controls-row read as one consistent button
 * system. */
export function RangeSelector({
  value,
  onChange,
  loading,
}: {
  value: ReportRange;
  onChange: (range: ReportRange) => void;
  /** A report is in flight. The buttons stay live: disabling them made a
   *  second click during a fetch do nothing, which read as a broken control.
   *  A superseded request is already discarded by the page's effect. */
  loading?: boolean;
}) {
  return (
    <div id="admin-analytics-range-selector" role="group" aria-label="Report range">
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          className={range === value ? 'btn btn-primary booking-forward-btn btn-sm btn-accent' : 'btn btn-primary booking-forward-btn btn-sm admin-btn-secondary'}
          onClick={() => onChange(range)}
          aria-pressed={range === value}
          aria-busy={loading && range === value ? true : undefined}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
