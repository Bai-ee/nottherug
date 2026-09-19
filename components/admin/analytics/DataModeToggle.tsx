'use client';

/**
 * Switches the dashboard between real business data and test/preview traffic
 * (events tagged mode:'test'). The two are queried separately by
 * lib/analytics/report.ts and are never blended, so this is a hard either/or —
 * not a "include test data too" checkbox.
 *
 * State lives in the URL (?testMode=1) so a reload, a copied link or a
 * bookmark keeps showing the same mode instead of silently snapping back to
 * real data.
 */
export function DataModeToggle({
  testMode,
  onChange,
  disabled,
}: {
  testMode: boolean;
  onChange: (testMode: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div id="admin-analytics-data-mode-toggle" role="group" aria-label="Data mode">
      <button
        type="button"
        className={testMode ? 'analytics-range-btn' : 'analytics-range-btn analytics-range-btn-active'}
        onClick={() => onChange(false)}
        disabled={disabled}
        aria-pressed={!testMode}
      >
        Real Data
      </button>
      <button
        type="button"
        className={testMode ? 'analytics-range-btn analytics-mode-btn-test-active' : 'analytics-range-btn'}
        onClick={() => onChange(true)}
        disabled={disabled}
        aria-pressed={testMode}
      >
        Test Data
      </button>
    </div>
  );
}
