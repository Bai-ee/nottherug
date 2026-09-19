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
 * range using .btn-primary — the same "active" treatment DataModeToggle
 * uses, so the two controls in #admin-analytics-controls-row read as one
 * consistent button system. */
export function RangeSelector({
  value,
  onChange,
  disabled,
}: {
  value: ReportRange;
  onChange: (range: ReportRange) => void;
  disabled?: boolean;
}) {
  return (
    <div id="admin-analytics-range-selector" role="group" aria-label="Report range">
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          className={range === value ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline'}
          onClick={() => onChange(range)}
          disabled={disabled}
          aria-pressed={range === value}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
