'use client';

import { useState } from 'react';
import type { ReviewFlag } from '@/lib/analytics/bookingReport';
import { adminFetch, type GetIdToken } from '@/components/admin/adminFetch';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

/**
 * Sessions worth a look: several booking completions or a burst of email taps
 * within minutes. Shown for review only — nothing here is classified until an
 * admin marks it, and a real person can produce either pattern (a mail app
 * that never opens invites repeated taps).
 */
export function ReviewFlagsPanel({
  flags,
  getToken,
  onChanged,
}: {
  flags: ReviewFlag[];
  getToken: GetIdToken;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function mark(sid: string, test: boolean) {
    setBusy(sid);
    setError('');
    try {
      await adminFetch('/api/admin/test-marks', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'session', id: sid, test }),
      });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="admin-review-flags-panel" className="card card-pad">
      <div className="stamp-label">For Review</div>
      <div className="admin-analytics-panel-body">
        {flags.length === 0 ? (
          <p className="form-note admin-card-note">Nothing unusual in this range.</p>
        ) : (
          flags.map((f) => (
            <div key={`${f.kind}-${f.sid}`} className="admin-review-flag-row" id={`admin-review-flag-${f.kind}-${f.sid}`}>
              <div>
                <div className="rc-value">
                  {f.kind === 'repeat_bookings'
                    ? `${f.count} booking completions in one session${f.distinctBookings !== null ? ` (${f.distinctBookings} distinct)` : ''}`
                    : `${f.count} email taps in one session`}
                </div>
                <div className="form-note admin-card-note">
                  {fmt(f.firstAt)} – {fmt(f.lastAt)} · session {f.sid.slice(0, 8)}
                </div>
              </div>
              {f.confirmedTest ? (
                <button
                  type="button"
                  className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
                  disabled={busy === f.sid}
                  onClick={() => mark(f.sid, false)}
                >
                  Test · Unmark
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
                  disabled={busy === f.sid}
                  onClick={() => mark(f.sid, true)}
                >
                  Mark session as test
                </button>
              )}
            </div>
          ))
        )}
        {error ? <p className="form-note admin-card-note text-terra" role="alert">{error}</p> : null}
        <p className="form-note admin-card-note">
          A session marked here drops out of business numbers (unless test activity is included). Records stay as they are.
          Sessions classified test by a test device can only be unmarked by unmarking that device.
        </p>
      </div>
    </section>
  );
}
