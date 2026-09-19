'use client';

const PCT_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Owner decision 2: replaces classic bounce rate entirely. The word "bounce"
 * must not appear anywhere in this UI — a one-page read followed by a phone
 * call is a success on a brochure site, not a bounce.
 *
 * The prop is named `sessions` because that is the report field; the copy says
 * "visits", the one word this dashboard uses for that quantity throughout.
 *
 * Presentation: one of three stat cards in #admin-analytics-stats-row
 * (homepage .grid-3), figure in the shared hero-stat-item treatment.
 */
export function EngagedVisitStat({ engagedVisitPct, sessions }: { engagedVisitPct: number | null; sessions: number }) {
  return (
    <section id="admin-analytics-engaged-visit-panel" className="card card-pad">
      <div className="stamp-label">Engaged Visits</div>
      <div className="hero-stat-item">
        <div className="hero-stat-num">
          {engagedVisitPct === null ? 'Not enough data' : `${PCT_FORMAT.format(engagedVisitPct)}%`}
        </div>
        <div className="hero-stat-label">of visits</div>
      </div>
      <p className="form-note">
        Share of visits with meaningful scroll, 15s+ dwell, or a tracked click · {sessions.toLocaleString('en-US')} visits in range
      </p>
    </section>
  );
}
