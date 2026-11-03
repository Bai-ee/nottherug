'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';
import { TestActivityToggle } from '@/components/admin/analytics/TestActivityToggle';
import { RecordFlags, TestMarkControls } from '@/components/admin/RecordReviewControls';
import type { RecordReview } from '@/lib/testing/leadReview';
import {
  ALT_TIME_STATUSES,
  ALT_TIME_STATUS_LABELS,
  BUSINESS_TIME_ZONE,
  contactPreferenceLabel,
  describeWindowIn,
  isValidTimeZone,
  summarizeAvailability,
  type AltTimeDayId,
  type AltTimeStatus,
  type AltTimeWindowId,
} from '@/lib/booking/alternateTime';

type RequestRecord = {
  id: string;
  createdAt: string;
  status?: string;
  statusUpdatedAt?: string;
  name?: string;
  email?: string;
  phone?: string;
  contactPreference?: string;
  days?: string[];
  windows?: string[];
  timeZone?: string;
  note?: string;
  source?: string;
  sourcePage?: string | null;
  attribution?: { src?: string; ref?: string; camp?: string };
  linkedCaptureId?: string;
  notification?: 'sent' | 'failed' | 'skipped';
  testFlag?: boolean;
};

type StatusFilter = 'all' | AltTimeStatus;

function fmt(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-US', { timeZone: BUSINESS_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusOf(r: RequestRecord): AltTimeStatus {
  return (ALT_TIME_STATUSES as readonly string[]).includes(r.status ?? '') ? (r.status as AltTimeStatus) : 'new';
}

function attributionText(a?: RequestRecord['attribution']) {
  if (!a?.src) return 'Not recorded';
  if (a.src === 'campaign') return `Campaign: ${a.camp ?? '—'}`;
  if (a.src === 'referral') return `Referral: ${a.ref ?? '—'}`;
  return 'Direct';
}

/** The requester's windows on their next occurrence in New York time — computed for that date, so DST is right. */
function NewYorkPreview({ r }: { r: RequestRecord }) {
  const tz = r.timeZone && isValidTimeZone(r.timeZone) ? r.timeZone : null;
  if (!tz || tz === BUSINESS_TIME_ZONE) return null;
  const now = new Date();
  const lines: string[] = [];
  for (const d of r.days ?? []) for (const w of r.windows ?? []) {
    try {
      lines.push(describeWindowIn(d as AltTimeDayId, w as AltTimeWindowId, tz, BUSINESS_TIME_ZONE, now));
    } catch {
      // A stored value from a future option list: skip rather than guess.
    }
  }
  if (lines.length === 0) return null;
  return (
    <div className="rc-row" style={{ alignItems: 'flex-start', gap: 16 }}>
      <span className="rc-label" style={{ minWidth: 150 }}>In New York time</span>
      <span className="rc-value" style={{ fontWeight: 400 }}>{lines.slice(0, 10).join(' · ')}{lines.length > 10 ? ' …' : ''}</span>
    </div>
  );
}

function RequestsPageContent({ email, getToken, signOut }: { email: string; getToken: GetIdToken; signOut: () => Promise<void> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [review, setReview] = useState<Record<string, RecordReview>>({});
  const [cap, setCap] = useState<number | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [includeTest, setIncludeTest] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const abortSignal = useAbortSignal();

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch<{ requests: RequestRecord[]; review: Record<string, RecordReview>; cap: number }>(
          '/api/admin/requests',
          getToken,
          { cache: 'no-store', signal: abortSignal },
        );
        setRequests(data.requests ?? []);
        setReview(data.review ?? {});
        setCap(data.cap ?? null);
        setError('');
      } catch (e) {
        if (isAbortError(e)) return;
        setError(e instanceof Error ? e.message : 'Could not load requests.');
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, abortSignal, refreshKey]);

  function refresh() {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  async function setStatus(id: string, status: AltTimeStatus) {
    setBusyId(id);
    setActionError('');
    try {
      const res = await adminFetch<{ status: AltTimeStatus; statusUpdatedAt: string }>('/api/admin/requests', getToken, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      setRequests((list) => list.map((r) => (r.id === id ? { ...r, status: res.status, statusUpdatedAt: res.statusUpdatedAt } : r)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update status.');
    } finally {
      setBusyId(null);
    }
  }

  async function markTest(id: string, test: boolean | null) {
    setBusyId(id);
    setActionError('');
    try {
      await adminFetch('/api/admin/test-marks', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'request', id, test }),
      });
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusyId(null);
    }
  }

  const visible = useMemo(
    () => requests.filter((r) => (includeTest || !review[r.id]?.testReason) && (filter === 'all' || statusOf(r) === filter)),
    [requests, review, includeTest, filter],
  );
  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, new: 0, contacted: 0, scheduled: 0, closed: 0 };
    for (const r of requests) {
      if (!includeTest && review[r.id]?.testReason) continue;
      c.all += 1;
      c[statusOf(r)] += 1;
    }
    return c;
  }, [requests, review, includeTest]);

  return (
    <AdminShell title="Time Requests" email={email} onSignOut={signOut}>
      <div id="admin-requests-page-shell" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div id="admin-requests-intro-panel" className="card card-pad">
          <p className="form-note" style={{ margin: 0, textAlign: 'left' }}>
            People who could not find a suitable time on Calendly. These are requests, not bookings: reply to arrange a
            time, then set the status. “Scheduled” is the only place a request is linked to a booking.
          </p>
        </div>

        {error ? <div id="admin-requests-load-error" className="card card-pad text-terra">{error}</div> : null}

        <div id="admin-requests-filter-row" className="card card-pad">
          <div id="admin-requests-status-tabs" role="group" aria-label="Filter by status">
            {(['all', ...ALT_TIME_STATUSES] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filter === s}
                className={filter === s ? 'btn btn-primary booking-forward-btn btn-sm btn-accent' : 'btn btn-primary booking-forward-btn btn-sm admin-btn-secondary'}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'All' : ALT_TIME_STATUS_LABELS[s]} ({counts[s]})
              </button>
            ))}
          </div>
          <TestActivityToggle id="admin-requests-include-test-toggle" checked={includeTest} onChange={setIncludeTest} />
        </div>

        {actionError ? <p className="form-note text-terra" role="alert" style={{ margin: 0 }}>{actionError}</p> : null}

        <div id="admin-requests-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div className="card card-pad"><p className="form-note" style={{ margin: 0 }}>Loading…</p></div>
          ) : visible.length === 0 ? (
            <div id="admin-requests-empty-state" className="card card-pad" style={{ textAlign: 'center' }}>
              <p className="form-note" style={{ margin: 0 }}>No requests match this filter.</p>
            </div>
          ) : (
            visible.map((r) => (
              <article key={r.id} id={`admin-request-card-${r.id}`} className="card card-pad admin-request-card">
                <div className="admin-request-card-header">
                  <div>
                    <div className="rc-title">{r.name || '—'}</div>
                    <div className="rc-subtitle">{fmt(r.createdAt)}</div>
                  </div>
                  <span className="admin-record-flags">
                    <RecordFlags review={review[r.id]} />
                    {r.linkedCaptureId ? <span className="badge badge-sage" title="This email also started a booking or questionnaire — see Leads.">Also in Leads</span> : null}
                    <label htmlFor={`admin-request-status-${r.id}`} className="sr-only">Status</label>
                    <select
                      id={`admin-request-status-${r.id}`}
                      className="form-control form-select admin-request-status-select"
                      value={statusOf(r)}
                      disabled={busyId === r.id}
                      onChange={(e) => setStatus(r.id, e.target.value as AltTimeStatus)}
                    >
                      {ALT_TIME_STATUSES.map((s) => <option key={s} value={s}>{ALT_TIME_STATUS_LABELS[s]}</option>)}
                    </select>
                  </span>
                </div>
                <div className="divider" style={{ margin: '0 0 4px' }} />
                <div className="rc-row" style={{ gap: 16 }}>
                  <span className="rc-label" style={{ minWidth: 150 }}>Reach them by</span>
                  <span className="rc-value">{contactPreferenceLabel(r.contactPreference)}</span>
                </div>
                <div className="rc-row" style={{ gap: 16 }}>
                  <span className="rc-label" style={{ minWidth: 150 }}>Phone</span>
                  {r.phone ? <a className="rc-value" href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>{r.phone}</a> : <span className="rc-value">—</span>}
                </div>
                <div className="rc-row" style={{ gap: 16 }}>
                  <span className="rc-label" style={{ minWidth: 150 }}>Email</span>
                  {r.email ? <a className="rc-value" href={`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent('Arranging your Meet & Greet')}`}>{r.email}</a> : <span className="rc-value">—</span>}
                </div>
                <div className="rc-row" style={{ gap: 16 }}>
                  <span className="rc-label" style={{ minWidth: 150 }}>Preferred</span>
                  <span className="rc-value" style={{ fontWeight: 400 }}>{summarizeAvailability(r.days ?? [], r.windows ?? []) || '—'}</span>
                </div>
                <div className="rc-row" style={{ gap: 16 }}>
                  <span className="rc-label" style={{ minWidth: 150 }}>Their time zone</span>
                  <span className="rc-value">{r.timeZone?.replace(/_/g, ' ') || '—'}</span>
                </div>
                <NewYorkPreview r={r} />
                {r.note ? (
                  <div className="rc-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
                    <span className="rc-label">Note</span>
                    <span className="rc-value" style={{ whiteSpace: 'pre-wrap', fontWeight: 400 }}>{r.note}</span>
                  </div>
                ) : null}
                <p className="form-note" style={{ margin: 0, textAlign: 'left' }}>
                  From {r.source || '—'}{r.sourcePage ? ` on ${r.sourcePage}` : ''} · {attributionText(r.attribution)} · Notification{' '}
                  {r.notification === 'sent' ? 'emailed' : r.notification === 'failed' ? 'failed — check here' : r.notification === 'skipped' ? 'not configured or skipped' : 'pending'}
                  {r.statusUpdatedAt && statusOf(r) !== 'new' ? ` · status updated ${fmt(r.statusUpdatedAt)}` : ''}
                </p>
                <TestMarkControls id={`request-${r.id}`} review={review[r.id]} busy={busyId === r.id} onMark={(test) => markTest(r.id, test)} />
              </article>
            ))
          )}
        </div>

        {cap !== null && requests.length >= cap ? (
          <p className="form-note text-terra">Showing the most recent {cap} requests.</p>
        ) : null}

        <div id="admin-requests-footer-actions">
          <button type="button" id="admin-requests-refresh-btn" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

export default function RequestsPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <RequestsPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
