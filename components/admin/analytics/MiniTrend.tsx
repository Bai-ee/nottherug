'use client';

import type { DailyTrendPoint } from '@/lib/analytics/report';

const WIDTH = 240;
const HEIGHT = 44;
const PAD = 3;

/**
 * One day-by-day line, sized to sit inside a stat card under the numbers it
 * belongs to. Same hand-rolled inline SVG as TrendSparkline (no chart
 * library, CLAUDE.md) and the same colour rule: stroke="currentColor" plus a
 * marketing text-* class, so no new colour is declared.
 *
 * It never invents a shape for data it does not have: one day, or a range
 * that is entirely zero, says so in words instead of drawing a flat line the
 * owner could read as a measurement.
 */
export function MiniTrend({
  points,
  metric,
  label,
}: {
  points: DailyTrendPoint[];
  /** Which daily series to draw. */
  metric: 'leadSaved' | 'sessions';
  /** Read out to screen readers and printed under the line. */
  label: string;
}) {
  const values = points.map((p) => p[metric]);
  const max = Math.max(...values, 0);

  if (values.length < 2 || max === 0) {
    return <p className="form-note">{label} · not enough days to chart yet</p>;
  }

  const stepX = (WIDTH - PAD * 2) / (values.length - 1);
  const scaleY = (v: number) => HEIGHT - PAD - (v / max) * (HEIGHT - PAD * 2);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${PAD + i * stepX} ${scaleY(v)}`).join(' ');

  return (
    <div className="admin-analytics-mini-trend">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}, day by day`}
      >
        <path d={d} stroke="currentColor" className="text-sage admin-analytics-trend-line" fill="none" />
      </svg>
      <p className="form-note">{label} · day by day</p>
    </div>
  );
}
