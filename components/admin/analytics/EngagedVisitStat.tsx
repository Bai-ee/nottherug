'use client';

const PCT_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Owner decision 2: replaces classic bounce rate entirely. The word "bounce"
 * must not appear anywhere in this UI — a one-page read followed by a phone
 * call is a success on a brochure site, not a bounce.
 */
export function EngagedVisitStat({ engagedVisitPct, sessions }: { engagedVisitPct: number | null; sessions: number }) {
  return (
    <section id="admin-analytics-engaged-visit-panel" className="analytics-panel analytics-stat-panel">
      <div className="analytics-label">Engaged Visits</div>
      <div className="analytics-secondary-number">
        {engagedVisitPct === null ? 'Not enough data' : `${PCT_FORMAT.format(engagedVisitPct)}%`}
      </div>
      <div className="analytics-note">
        Share of sessions with meaningful scroll, 15s+ dwell, or a tracked click · {sessions.toLocaleString('en-US')} sessions in range
      </div>
    </section>
  );
}
