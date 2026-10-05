import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveTile } from '@/components/admin/analytics/LiveTile';
import { ReportMetaBanner } from '@/components/admin/analytics/StatusBanner';
import { AdminFooter } from '@/components/admin/AdminFooter';
import { buildEmptyReport } from '@/components/admin/analytics/emptyReport';

describe('unavailable analytics sections', () => {
  const report = buildEmptyReport('today');

  it('live tile shows Unavailable instead of zeros when the live query failed', () => {
    const html = renderToStaticMarkup(createElement(LiveTile, { live: report.live, dailyTrend: [], unavailable: true }));
    expect(html).toContain('Unavailable');
    expect(html).not.toMatch(/hero-stat-num">0</);
  });

  it('live tile shows a real zero when the query succeeded', () => {
    const html = renderToStaticMarkup(createElement(LiveTile, { live: report.live, dailyTrend: [] }));
    expect(html).not.toContain('Unavailable');
    expect(html).toMatch(/>0</);
  });

  it('footer says Unavailable for a failed first-event lookup, and nothing for true no history', () => {
    const failed = renderToStaticMarkup(createElement(AdminFooter, { trackingStartedAt: null, trackingStartUnavailable: true }));
    expect(failed).toContain('Tracking started · Unavailable');
    const none = renderToStaticMarkup(createElement(AdminFooter, { trackingStartedAt: null }));
    expect(none).not.toContain('Tracking started');
  });

  it('partial-failure banner names the unavailable sections', () => {
    const meta = { ...report.meta, status: 'partial_failure' as const, unavailable: ['live', 'trackingStart'] as Array<'live' | 'trackingStart'> };
    const html = renderToStaticMarkup(createElement(ReportMetaBanner, { meta }));
    expect(html).toContain('last 60 minutes');
    expect(html).toContain('tracking start date');
  });
});
