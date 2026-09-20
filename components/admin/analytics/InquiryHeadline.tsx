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
 * `outstandingCaptures` is a deliberately separate, smaller figure: people
 * who gave an email and started booking on Calendly but never answered the
 * questionnaire. It shares `inquiries`'s exact degraded/test-mode treatment
 * (leads cannot be split real/test or reloaded independently of inquiries),
 * but it is never summed with `inquiries` and never labelled "Inquiries" —
 * it sits under its own "Awaiting Answers" heading so a non-technical reader
 * cannot mistake it for a completed inquiry.
 *
 * Presentation: one paper card holding all headline tiles, laid out by the
 * homepage's own .grid-2 (two columns; a third tile wraps to its own row).
 * Numbers use .hero-stat-num — the same big-number treatment as every other
 * stat on this page; "biggest number on the page" is expressed by this card
 * sitting first, not by a bigger font size.
 */
export function InquiryHeadline({
  inquiries,
  outstandingCaptures,
  inquiryRate,
  degraded,
  testMode,
  dailyTrend,
}: {
  inquiries: number | null;
  /** Partial-capture backlog for the same range — see the doc comment above. Never an inquiry. */
  outstandingCaptures: number | null;
  inquiryRate: InquiryRateInfo;
  /** Day buckets for the range, used for the card's own trend line. */
  dailyTrend: DailyTrendPoint[];
  /** True when the leads dependency itself failed for this report (meta.degraded includes 'leads'). */
  degraded: boolean;
  /** True when the dashboard is showing test/preview traffic only (meta.testMode). */
  testMode: boolean;
}) {
  const inquiriesDisplay = degraded ? '—' : (inquiries ?? 0).toLocaleString('en-US');
  const outstandingCapturesDisplay = degraded ? '—' : (outstandingCaptures ?? 0).toLocaleString('en-US');

  return (
    <section id="admin-analytics-headline-row" className="card card-pad grid-2">
      <div id="admin-analytics-inquiries-tile">
        <div className="stamp-label">Inquiries</div>

        {testMode ? (
          <>
            {/* Rendered as a sentence, not a figure — leads have no test/real split. */}
            <div className="hero-stat-num">Not measured</div>
            <p className="form-note">
              Inquiries come from your leads list, which does not separate test from real, so no inquiry number is
              shown while you are viewing test data. Switch to Real Data to see it.
            </p>
          </>
        ) : (
          <>
            <div className="hero-stat-num">{inquiriesDisplay}</div>
            {degraded ? (
              <p className="text-terra">Inquiry totals could not be loaded this time.</p>
            ) : (
              <a className="text-sage" href="/admin/dashboard/leads">View in Leads →</a>
            )}
          </>
        )}
      </div>

      <div id="admin-analytics-outstanding-captures-tile">
        <div className="stamp-label">Awaiting Answers</div>

        {testMode ? (
          <>
            <div className="hero-stat-num">Not measured</div>
            <p className="form-note">
              Same reason as Inquiries: this also comes from your leads list, which does not separate test from real.
            </p>
          </>
        ) : (
          <>
            <div className="hero-stat-num">{outstandingCapturesDisplay}</div>
            {degraded ? (
              <p className="text-terra">Could not be loaded this time.</p>
            ) : (
              <p className="form-note">
                Gave an email and started booking, but haven&apos;t answered the questions yet. Not an inquiry until they do.
              </p>
            )}
          </>
        )}
      </div>

      <div id="admin-analytics-inquiry-rate-tile">
        {/* One word on phones (admin.css swaps the spans by breakpoint). */}
        <div className="stamp-label">
          <span className="admin-label-full">Inquiry Rate</span>
          <span className="admin-label-short">Rate</span>
        </div>
        <div className="hero-stat-num">
          {inquiryRate.rate === null ? 'Not enough data' : RATE_FORMAT.format(inquiryRate.rate)}
        </div>
        <p className="form-note">
          {inquiryRate.trackedLeadSaved.toLocaleString('en-US')} tracked inquiries / {inquiryRate.trackedSessions.toLocaleString('en-US')} tracked visits
        </p>
        <MiniTrend points={dailyTrend} metric="leadSaved" label="Tracked inquiries" />
      </div>
    </section>
  );
}
