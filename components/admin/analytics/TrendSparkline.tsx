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
 *
 * Presentation: paper card with a stamp-label heading. The two lines still
 * need two distinguishable colors and no new color may be declared in
 * admin.css, so each <path> sets stroke="currentColor" and picks up its
 * color from a text-sage/text-mid className — colors that already exist in
 * the marketing system. The legend reuses the same two classes on plain
 * text instead of a separate swatch element.
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
    <section id="admin-analytics-trend-panel" className="card card-pad">
      <div id="admin-analytics-trend-panel-head">
        <div className="stamp-label">Daily Trend</div>
        <div id="admin-analytics-trend-legend">
          <span className="text-sage">Sessions</span>{' · '}
          <span className="text-mid">Pageviews</span>
        </div>
      </div>
      <div className="admin-analytics-panel-body">
        {points.length === 0 ? (
          <p className="text-mid">No days in range yet.</p>
        ) : points.length === 1 ? (
          /* One day cannot draw a line: say the day's numbers instead of
             showing an empty chart, and point at the longer ranges. */
          <p id="admin-analytics-trend-single-day" className="text-mid">
            {shortDate(points[0].date)} · {points[0].sessions.toLocaleString('en-US')} sessions · {points[0].pageviews.toLocaleString('en-US')} pageviews. A trend needs more than one day — switch to 7 or 30 days.
          </p>
        ) : (
          <>
            <svg
              id="admin-analytics-trend-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="none"
              role="img"
              aria-label="Daily sessions and pageviews trend"
            >
              <path
                d={buildPath(pageviews, max)}
                stroke="currentColor"
                className="text-mid admin-analytics-trend-line admin-analytics-trend-line-pageviews"
                fill="none"
              />
              <path
                d={buildPath(sessions, max)}
                stroke="currentColor"
                className="text-sage admin-analytics-trend-line"
                fill="none"
              />
            </svg>
            <div id="admin-analytics-trend-axis">
              <span className="form-note">{shortDate(points[0].date)}</span>
              {points.length > 1 ? <span className="form-note">{shortDate(points[points.length - 1].date)}</span> : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
