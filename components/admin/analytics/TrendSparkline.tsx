'use client';

import type { DailyTrendPoint } from '@/lib/analytics/report';

const WIDTH = 600;
const HEIGHT = 120;
const PAD = 8;

function buildPath(values: number[], max: number): string {
  if (values.length === 0) return '';
  const stepX = values.length > 1 ? (WIDTH - PAD * 2) / (values.length - 1) : 0;
  const scaleY = (v: number) => {
    if (max <= 0) return HEIGHT - PAD; // flat zero line rather than a divide-by-zero spike
    return HEIGHT - PAD - (v / max) * (HEIGHT - PAD * 2);
  };
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${PAD + i * stepX} ${scaleY(v)}`)
    .join(' ');
}

/**
 * Owner decision 4: a trend line only, no prior-period percentage deltas —
 * direction is read off the shape, not a computed comparison. Deliberately
 * hand-rolled inline SVG (CLAUDE.md: no new dependencies, no chart library)
 * — this is two polylines on a fixed grid, not worth a library.
 */
export function TrendSparkline({ points }: { points: DailyTrendPoint[] }) {
  const sessions = points.map((p) => p.sessions);
  const pageviews = points.map((p) => p.pageviews);
  const max = Math.max(1, ...sessions, ...pageviews);

  const shortDate = (d: string) => {
    const parsed = new Date(`${d}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? d : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(parsed);
  };

  return (
    <section id="admin-analytics-trend-panel" className="analytics-panel">
      <div className="analytics-panel-head">
        <h2 className="analytics-panel-title">Daily Trend</h2>
        <div className="analytics-legend">
          <span className="analytics-legend-item"><i className="analytics-legend-swatch analytics-legend-swatch-sessions" />Sessions</span>
          <span className="analytics-legend-item"><i className="analytics-legend-swatch analytics-legend-swatch-pageviews" />Pageviews</span>
        </div>
      </div>
      <div className="analytics-panel-body">
        {points.length === 0 ? (
          <div className="analytics-empty">No days in range yet.</div>
        ) : (
          <>
            <svg
              id="admin-analytics-trend-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="none"
              className="analytics-trend-svg"
              role="img"
              aria-label="Daily sessions and pageviews trend"
            >
              <path d={buildPath(pageviews, max)} className="analytics-trend-line analytics-trend-line-pageviews" fill="none" />
              <path d={buildPath(sessions, max)} className="analytics-trend-line analytics-trend-line-sessions" fill="none" />
            </svg>
            <div className="analytics-trend-axis">
              <span>{shortDate(points[0].date)}</span>
              {points.length > 1 ? <span>{shortDate(points[points.length - 1].date)}</span> : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
