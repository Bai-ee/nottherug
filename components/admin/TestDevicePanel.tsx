'use client';

import { useState, useSyncExternalStore } from 'react';
import { adminFetch, type GetIdToken } from '@/components/admin/adminFetch';
import { clearTestDeviceId, getVisitorId, getTestDeviceId, setTestDeviceId } from '@/lib/analytics/identity';

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  for (const l of listeners) l();
}

/**
 * Marks THIS browser as a test device. Everything it does on the public site
 * afterwards — events, questionnaires, booking captures, time requests — is
 * tagged and excluded from business numbers by default. Explicit and
 * reversible; nothing is ever classified as test from what someone typed.
 */
export function TestDevicePanel({ getToken }: { getToken: GetIdToken }) {
  const deviceId = useSyncExternalStore(subscribe, getTestDeviceId, () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function mark() {
    setBusy(true);
    setError('');
    try {
      const res = await adminFetch<{ id: string }>('/api/admin/test-devices', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vid: getVisitorId() ?? undefined, label: `Marked ${new Date().toLocaleDateString('en-US')}` }),
      });
      if (!setTestDeviceId(res.id)) setError('This browser blocks site storage, so it cannot remember the mark.');
      notify();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark this browser.');
    } finally {
      setBusy(false);
    }
  }

  async function unmark() {
    if (!deviceId) return;
    setBusy(true);
    setError('');
    try {
      await adminFetch(`/api/admin/test-devices?id=${encodeURIComponent(deviceId)}`, getToken, { method: 'DELETE' });
      clearTestDeviceId();
      notify();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unmark this browser.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="admin-test-device-panel" className="card card-pad">
      <div className="stamp-label">This Browser</div>
      <div className="admin-analytics-panel-body">
        <p className="form-note admin-card-note" id="admin-test-device-status">
          {deviceId
            ? 'Marked as a test device. Your visits, bookings and forms from this browser are excluded from business numbers.'
            : 'Not marked. If you test the site from this browser, mark it first so your activity is kept out of business numbers.'}
        </p>
        <div>
          {deviceId ? (
            <button type="button" id="admin-test-device-unmark-btn" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" disabled={busy} onClick={unmark}>
              Stop marking this browser
            </button>
          ) : (
            <button type="button" id="admin-test-device-mark-btn" className="btn btn-primary booking-forward-btn btn-sm btn-accent" disabled={busy} onClick={mark}>
              Mark this browser as a test device
            </button>
          )}
        </div>
        {error ? <p className="form-note admin-card-note text-terra" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
