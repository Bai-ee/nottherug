'use client';

import type { InquiryRateInfo } from '@/lib/analytics/report';

const RATE_FORMAT = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

/**
 * The biggest number on the page (owner decision 1). `inquiries` is the
 * authoritative saved-lead count — null only means the leads query itself
 * failed (see meta.degraded on the caller), never "zero". A true zero is
 * rendered as 0, not blank, so it stays visually distinct from "failed to
 * load".
 */
export function InquiryHeadline({
  inquiries,
  inquiryRate,
  degraded,
}: {
  inquiries: number | null;
  inquiryRate: InquiryRateInfo;
  /** True when the leads dependency itself failed for this report (meta.degraded includes 'leads'). */
  degraded: boolean;
}) {
  const inquiriesDisplay = degraded ? '—' : (inquiries ?? 0).toLocaleString('en-US');

  return (
    <section id="admin-analytics-headline-row" className="analytics-panel analytics-headline-row">
      <div id="admin-analytics-inquiries-tile" className="analytics-headline-tile">
        <div className="analytics-label">Inquiries</div>
        <div className="analytics-hero-number">{inquiriesDisplay}</div>
        {degraded ? (
          <div className="analytics-note analytics-note-warn">Inquiry totals could not be loaded this time.</div>
        ) : (
          <a className="analytics-link" href="/admin/dashboard/leads">View in Leads →</a>
        )}
      </div>

      <div id="admin-analytics-inquiry-rate-tile" className="analytics-headline-tile">
        <div className="analytics-label">Inquiry Rate</div>
        <div className="analytics-secondary-number">
          {inquiryRate.rate === null ? 'Not enough data' : RATE_FORMAT.format(inquiryRate.rate)}
        </div>
        <div className="analytics-note">
          {inquiryRate.trackedLeadSaved.toLocaleString('en-US')} tracked inquiries / {inquiryRate.trackedSessions.toLocaleString('en-US')} tracked sessions
        </div>
      </div>
    </section>
  );
}
