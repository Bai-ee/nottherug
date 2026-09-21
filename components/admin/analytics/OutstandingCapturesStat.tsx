'use client';

/**
 * People who gave an email and started booking on Calendly but never answered
 * the questionnaire. It sits beside Appointments Scheduled because that is the
 * pair the founder reads together: meetings on the calendar, and the ones still
 * owing answers. It is never summed with inquiries and never labelled one — a
 * capture only becomes an inquiry once the questions are answered.
 *
 * Degraded / test-mode treatment matches Inquiries exactly: the leads list has
 * no test/real split and cannot be reloaded independently, so both say so in
 * words rather than showing a misleading zero.
 */
export function OutstandingCapturesStat({
  outstandingCaptures,
  degraded,
  testMode,
}: {
  /** Email-only captures still waiting on answers. Null in test mode / when the leads query failed. */
  outstandingCaptures: number | null;
  degraded: boolean;
  testMode: boolean;
}) {
  const display = degraded ? '—' : (outstandingCaptures ?? 0).toLocaleString('en-US');

  return (
    <section id="admin-analytics-outstanding-captures-panel" className="card card-pad">
      <div className="stamp-label">Awaiting Answers</div>

      {testMode ? (
        <>
          <div className="hero-stat-item">
            <div className="hero-stat-num">Not measured</div>
            <div className="hero-stat-label">Waiting on Answers</div>
          </div>
          <p className="form-note">
            Same reason as Inquiries: this also comes from your leads list, which does not separate test from real.
          </p>
        </>
      ) : (
        <>
          <div className="hero-stat-item">
            <div className="hero-stat-num">{display}</div>
            <div className="hero-stat-label">Waiting on Answers</div>
          </div>
          {degraded ? (
            <p className="text-terra">Could not be loaded this time.</p>
          ) : (
            <p className="form-note">
              Gave an email and started booking, but haven&apos;t answered the questions yet. Not an inquiry until they do.
            </p>
          )}
        </>
      )}
    </section>
  );
}
