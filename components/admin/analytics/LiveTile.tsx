'use client';

import type { LiveTile as LiveTileData } from '@/lib/analytics/report';

/**
 * Owner decision 3: a rolling 60-minute tile, always shown regardless of the
 * selected today/7d/30d range, refreshed only when the report is (re)fetched
 * — never a background poll (that would be the auto-refresh the owner
 * explicitly declined).
 *
 * Presentation: paper card, numbers in the homepage's own
 * hero-stat-item/hero-stat-num/hero-stat-divider row. The heading already
 * says "Last 60 minutes", so it carries no separate "live" marker.
 */
export function LiveTile({ live }: { live: LiveTileData }) {
  const asOf = live.endIso
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date(live.endIso))
    : null;

  return (
    <section id="admin-analytics-live-tile" className="card card-pad">
      <div id="admin-analytics-live-tile-head" className="admin-analytics-panel-head">
        <div className="stamp-label">Last {live.windowMinutes} Minutes</div>
      </div>
      <div id="admin-analytics-live-stats-row" className="admin-analytics-hero-stats-row">
        <div className="hero-stat-item">
          <div className="hero-stat-num">{live.sessions.toLocaleString('en-US')}</div>
          <div className="hero-stat-label">Visits</div>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat-item">
          <div className="hero-stat-num">{live.pageviews.toLocaleString('en-US')}</div>
          <div className="hero-stat-label">Page Views</div>
        </div>
      </div>
      <p className="form-note">{asOf ? `As of ${asOf} ET · reload the page to update` : 'Reload the page to update'}</p>
    </section>
  );
}
