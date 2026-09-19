'use client';

import type { InquiryRateInfo } from '@/lib/analytics/report';

const RATE_FORMAT = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

/**
 * The biggest number on the page (owner decision 1). `inquiries` is the
 * authoritative saved-lead count — never "zero" when it is null. A true zero
 * is rendered as 0, not blank, so it stays visually distinct from the two
 * reasons the number can be missing, each of which says so in words:
 *  - the leads query failed (`degraded`);
 *  - this is a test-mode view (`testMode`). Leads have no test/real split, so
 *    the real total must not appear on a page labelled test data.
 */
export function InquiryHeadline({
  inquiries,
  inquiryRate,
  degraded,
  testMode,
}: {
  inquiries: number | null;
  inquiryRate: InquiryRateInfo;
  /** True when the leads dependency itself failed for this report (meta.degraded includes 'leads'). */
  degraded: boolean;
  /** True when the dashboard is showing test/preview traffic only (meta.testMode). */
  testMode: boolean;
}) {
  const inquiriesDisplay = degraded ? '—' : (inquiries ?? 0).toLocaleString('en-US');

  return (
    <section id="admin-analytics-headline-row" className="analytics-panel analytics-headline-row">
      <div id="admin-analytics-inquiries-tile" className="analytics-headline-tile">
        <div className="analytics-label">Inquiries</div>

        {testMode ? (
          <>
            {/* Rendered at the smaller size because it is a sentence, not a figure. */}
            <div className="analytics-secondary-number">Not measured</div>
            <div className="analytics-note">
              Inquiries come from your leads list, which does not separate test from real, so no inquiry number is
              shown while you are viewing test data. Switch to Real Data to see it.
            </div>
          </>
        ) : (
          <>
            <div className="analytics-hero-number">{inquiriesDisplay}</div>
            {degraded ? (
              <div className="analytics-note analytics-note-warn">Inquiry totals could not be loaded this time.</div>
            ) : (
              <a className="analytics-link" href="/admin/dashboard/leads">View in Leads →</a>
            )}
          </>
        )}
      </div>

      <div id="admin-analytics-inquiry-rate-tile" className="analytics-headline-tile">
        <div className="analytics-label">Inquiry Rate</div>
        <div className="analytics-secondary-number">
          {inquiryRate.rate === null ? 'Not enough data' : RATE_FORMAT.format(inquiryRate.rate)}
        </div>
        <div className="analytics-note">
          {inquiryRate.trackedLeadSaved.toLocaleString('en-US')} tracked inquiries / {inquiryRate.trackedSessions.toLocaleString('en-US')} tracked visits
        </div>
      </div>
    </section>
  );
}
