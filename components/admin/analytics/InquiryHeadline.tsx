'use client';

import type { DailyTrendPoint, InquiryRateInfo } from '@/lib/analytics/report';
import { MiniTrend } from './MiniTrend';

const RATE_FORMAT = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

/**
 * The biggest number on the page (owner decision 1). `inquiries` is the
 * authoritative saved-lead count — never "zero" when it is null. A true zero
 * is rendered as 0, not blank, so it stays visually distinct from the two
 * reasons the number can be missing, each of which says so in words:
 *  - the leads query failed (`degraded`);
 *  - this is a test-mode view (`testMode`). Leads have no test/real split, so
 *    the real total must not appear on a page labelled test data.
 *
 * The partial-capture backlog belongs with appointments, not here: it is not
 * an inquiry, and reading it beside one invites the sum this dashboard is
 * built to avoid. It lives in AppointmentsStat.
 *
 * Presentation: the same paired layout as that card (.admin-stat-pair in
 * app/admin/admin.css) — stamp, number, caption on one baseline across both
 * columns, with the range's own trend line under the rate it belongs to.
 */
export function InquiryHeadline({
  inquiries,
  inquiryRate,
  degraded,
  testMode,
  dailyTrend,
}: {
  inquiries: number | null;
  inquiryRate: InquiryRateInfo;
  /** Day buckets for the range, used for the card's own trend line. */
  dailyTrend: DailyTrendPoint[];
  /** True when the leads dependency itself failed for this report (meta.degraded includes 'leads'). */
  degraded: boolean;
  /** True when the dashboard is showing test/preview traffic only (meta.testMode). */
  testMode: boolean;
}) {
  const inquiriesDisplay = testMode ? 'Not measured' : degraded ? '—' : (inquiries ?? 0).toLocaleString('en-US');
  // A sentence set at figure scale reads as data. Words take the smaller step.
  const numClass = (words: boolean) => (words ? 'hero-stat-num admin-stat-words' : 'hero-stat-num');

  return (
    <section id="admin-analytics-headline-row" className="card card-pad">
      <div className="admin-stat-pair">
        <div className="admin-stat-col" id="admin-analytics-inquiries-tile">
          <div className="stamp-label">Inquiries</div>
          <div className={numClass(testMode)}>{inquiriesDisplay}</div>
          <div className="hero-stat-label">Questions answered in full</div>
        </div>

        <div className="admin-stat-col" id="admin-analytics-inquiry-rate-tile">
          {/* One word on phones (admin.css swaps the spans by breakpoint). */}
          <div className="stamp-label">
            <span className="admin-label-full">Inquiry Rate</span>
            <span className="admin-label-short">Rate</span>
          </div>
          <div className={numClass(inquiryRate.rate === null)}>
            {inquiryRate.rate === null ? 'Not enough data' : RATE_FORMAT.format(inquiryRate.rate)}
          </div>
          <div className="hero-stat-label">
            {inquiryRate.trackedLeadSaved.toLocaleString('en-US')} of{' '}
            {inquiryRate.trackedSessions.toLocaleString('en-US')} tracked visits
          </div>
        </div>
      </div>

      {/* Under the pair, not inside the rate column: it is the range's own
          line for the same tracked inquiries, and hanging it off one column
          left the card lopsided on a phone. */}
      <MiniTrend points={dailyTrend} metric="leadSaved" label="Tracked inquiries" />

      {testMode ? (
        <p className="form-note admin-card-note">
          Inquiries come from your leads list, which does not separate test from real. Switch to Real
          Data to see the number.
        </p>
      ) : degraded ? (
        <p className="form-note admin-card-note text-terra">
          Inquiry totals could not be loaded this time.
        </p>
      ) : (
        <a id="admin-analytics-inquiries-leads-link" className="text-sage" href="/admin/dashboard/leads">
          View in Leads →
        </a>
      )}
    </section>
  );
}
