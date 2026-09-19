'use client';

import type { LiveTile as LiveTileData } from '@/lib/analytics/report';

/**
 * Owner decision 3: a rolling 60-minute tile, always shown regardless of the
 * selected today/7d/30d range, refreshed only when the report is (re)fetched
 * — never a background poll (that would be the auto-refresh the owner
 * explicitly declined).
 */
export function LiveTile({ live }: { live: LiveTileData }) {
  const asOf = live.endIso
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date(live.endIso))
    : null;

  return (
    <section id="admin-analytics-live-tile" className="analytics-panel analytics-live-tile">
      {/* Pinned to the tile corner rather than trailing the label: in the
          flow its width pushed the label off the panel's center line. */}
      <span className="analytics-live-dot" aria-hidden="true" />
      <div id="admin-analytics-live-label" className="analytics-label">
        Live — Last {live.windowMinutes} Minutes
      </div>
      <div className="analytics-live-row">
        <div>
          <div className="analytics-secondary-number">{live.sessions.toLocaleString('en-US')}</div>
          <div className="analytics-note">sessions</div>
        </div>
        <div>
          <div className="analytics-secondary-number">{live.pageviews.toLocaleString('en-US')}</div>
          <div className="analytics-note">pageviews</div>
        </div>
      </div>
      <div className="analytics-note">{asOf ? `As of ${asOf} ET · reload the page to update` : 'Reload the page to update'}</div>
    </section>
  );
}
