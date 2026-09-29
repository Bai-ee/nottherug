'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, isAbortError, useAbortSignal, type GetIdToken } from '@/components/admin/adminFetch';
import {
  APPLICATION_STAGE_FILTERS,
  ApplicationFilterBar,
  type ApplicationSortOrder,
} from '@/components/admin/applications/ApplicationFilterBar';
import { PersonCard, fmtDate, type BenchRow } from '@/components/admin/bench/PersonCard';
import { buildApplicationsCsv } from '@/lib/bench/applicationFields';
import { compareReviewQueue } from '@/lib/bench/coverage';
import { BENCH_STAGE_LABELS, WORK_TYPE_OPTIONS, optionLabel, type BenchSettings } from '@/lib/bench/contract';
import '@/components/admin/bench/bench.css';

/**
 * Team Applications: every Join Our Team submission, tracked the way the
 * Scheduled Leads page tracks leads (search, sort, cards or line items,
 * Refresh, Export CSV). Reads the same GET /api/admin/bench/people the Backup
 * Bench page uses, so a stage change made here shows there and vice versa.
 */

type Payload = { people: BenchRow[]; settings: BenchSettings; cap: number };

/** Which layout the owner last chose. Per-viewer convenience only, read the
 *  same hydration-safe way as the leads page's toggle. */
const VIEW_STORAGE_KEY = 'ntr.admin.applications.view';
type View = 'cards' | 'rows';
const viewListeners = new Set<() => void>();

function subscribeView(onChange: () => void) {
  viewListeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    viewListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readStoredView(): View {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'rows' ? 'rows' : 'cards';
  } catch {
    return 'cards';
  }
}

function writeStoredView(next: View) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  } catch {
    // Remembering the choice is a convenience, never a requirement.
  }
  for (const listener of viewListeners) listener();
}

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `team-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function workTypesLabel(p: BenchRow): string {
  return (p.answers?.workTypes ?? []).map((t) => optionLabel(WORK_TYPE_OPTIONS, t)).join(', ') || '—';
}

function ApplicationsPageContent({ email, getToken, signOut }: { email: string; getToken: GetIdToken; signOut: () => Promise<void> }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<ApplicationSortOrder>('newest');
  const [stageFilter, setStageFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const abortSignal = useAbortSignal();

  useEffect(() => {
    (async () => {
      try {
        const next = await adminFetch<Payload>('/api/admin/bench/people', getToken, { cache: 'no-store', signal: abortSignal });
        setData(next);
      } catch (e) {
        if (isAbortError(e)) return;
        setError(e instanceof Error ? e.message : 'Application load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, abortSignal, refreshKey]);

  function refresh() {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  }

  function updatePerson(next: BenchRow) {
    setData((d) => (d ? { ...d, people: d.people.map((p) => (p.id === next.id ? next : p)) } : d));
  }

  const people = useMemo(() => data?.people ?? [], [data]);

  const filtered = useMemo(() => {
    const stages = APPLICATION_STAGE_FILTERS.find((f) => f.value === stageFilter)?.stages ?? null;
    const q = query.trim().toLowerCase();
    const list = people.filter((p) => {
      if (stages && !stages.includes(p.stage)) return false;
      if (!q) return true;
      const a = p.answers;
      const hay = [
        p.fullName, p.email, p.phoneE164, p.notes,
        a?.homeNeighborhood, a?.experience, a?.specialDogExperience, a?.whyOnCall, a?.anythingElse,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    // The server returns newest first; 'queue' re-sorts whatever the filter shows.
    return sortBy === 'queue' ? [...list].sort(compareReviewQueue) : list;
  }, [people, query, stageFilter, sortBy]);

  const view = useSyncExternalStore(subscribeView, readStoredView, () => 'cards' as View);
  const newCount = people.filter((p) => p.stage === 'applied' || p.stage === 'review').length;

  const card = (p: BenchRow) =>
    data ? (
      <PersonCard
        key={p.id}
        person={p}
        settings={data.settings}
        expanded={expandedId === p.id}
        onToggle={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
        getToken={getToken}
        onUpdated={updatePerson}
      />
    ) : null;

  return (
    <AdminShell title="Team Applications" email={email} onSignOut={signOut}>
      <div id="admin-applications-page-shell" className="admin-bench-scope" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error ? (
          <div id="admin-applications-load-error" className="card card-pad text-terra">{error}</div>
        ) : null}

        {!loading && data ? (
          <p id="admin-applications-summary" className="form-note" style={{ margin: 0, textAlign: 'left' }}>
            {newCount} new application{newCount === 1 ? '' : 's'} waiting for review. Open one to see every answer and move it along.
          </p>
        ) : null}

        <ApplicationFilterBar
          query={query}
          onQueryChange={setQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          stageFilter={stageFilter}
          onStageFilterChange={setStageFilter}
          loading={loading}
          filteredCount={filtered.length}
          totalCount={people.length}
          cap={data?.cap ?? null}
        />

        <div id="admin-applications-list-shell">
          <div id="admin-applications-list-toolbar">
            <button
              type="button"
              id="admin-applications-view-toggle-btn"
              className="admin-leads-view-toggle-btn"
              aria-pressed={view === 'rows'}
              onClick={() => writeStoredView(view === 'cards' ? 'rows' : 'cards')}
            >
              {view === 'cards' ? 'Line items' : 'Cards'}
            </button>
          </div>

          {!loading && data && !filtered.length ? (
            <p id="admin-applications-empty" className="form-note">
              {people.length ? 'No applications match.' : 'No applications yet. They appear here as soon as someone submits Join Our Team.'}
            </p>
          ) : null}

          {view === 'cards' ? (
            <div id="admin-applications-card-list" className="bench-person-list">{filtered.map(card)}</div>
          ) : (
            <div id="admin-applications-row-scroll">
              <div id="admin-applications-row-list">
                <div className="admin-application-row admin-application-row-head" aria-hidden="true">
                  {['Name', 'Submitted', 'Stage', 'Work', 'Phone', 'Email', 'Lives in'].map((h) => (
                    <span key={h} className="rc-label admin-application-cell">{h}</span>
                  ))}
                </div>
                {filtered.map((p) => (
                  <div key={p.id} id={`admin-application-row-${p.id}`}>
                    <button
                      type="button"
                      className="admin-application-row admin-application-row-body"
                      aria-expanded={expandedId === p.id}
                      onClick={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
                    >
                      <span className="admin-application-cell" title={p.fullName}><strong>{p.fullName}</strong></span>
                      <span className="admin-application-cell">{fmtDate(p.createdAt)}</span>
                      <span className="admin-application-cell">{BENCH_STAGE_LABELS[p.stage]}</span>
                      <span className="admin-application-cell" title={workTypesLabel(p)}>{workTypesLabel(p)}</span>
                      <span className="admin-application-cell">{p.phoneE164}</span>
                      <span className="admin-application-cell" title={p.email}>{p.email}</span>
                      <span className="admin-application-cell">{p.answers?.homeNeighborhood || '—'}</span>
                    </button>
                    {expandedId === p.id ? <div className="admin-application-row-detail">{card(p)}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div id="admin-applications-footer-actions" className="admin-lead-actions">
          <button type="button" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" id="admin-applications-refresh-btn" onClick={refresh}>
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary booking-forward-btn btn-accent btn-sm"
            id="admin-applications-export-csv-btn"
            onClick={() => data && downloadCsv(buildApplicationsCsv(filtered, data.settings.timeBlocks))}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

export default function ApplicationsPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>
        {(session) => <ApplicationsPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}
      </AdminGuard>
    </AdminSessionProvider>
  );
}
