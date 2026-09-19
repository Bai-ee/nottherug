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
 *
 * Presentation: same .btn/.btn-sm/.btn-primary "active" treatment as
 * RangeSelector, so both controls in the row read as one button system.
 * Test mode also gets its own badge-gold marker next to the buttons — the
 * one piece of "this is not real data" chrome that isn't just button color,
 * per the hard requirement that test mode stay visually unmistakable.
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
        className={testMode ? 'btn btn-sm btn-outline' : 'btn btn-sm btn-primary'}
        onClick={() => onChange(false)}
        disabled={disabled}
        aria-pressed={!testMode}
      >
        Real Data
      </button>
      <button
        type="button"
        className={testMode ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline'}
        onClick={() => onChange(true)}
        disabled={disabled}
        aria-pressed={testMode}
      >
        Test Data
      </button>
      {testMode ? (
        <span id="admin-analytics-test-mode-badge" className="badge badge-gold">Test Data Active</span>
      ) : null}
    </div>
  );
}
