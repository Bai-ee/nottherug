'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { byCompletenessDesc, type AdminLeadRecord } from '@/components/admin/leads/adminLeadRecord';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';
import { LeadFilterBar, type LeadSortOrder } from '@/components/admin/leads/LeadFilterBar';
import { LeadTable } from '@/components/admin/leads/LeadTable';

/** Which layout the owner last chose. Per-viewer convenience only, so every
 *  access is guarded: a private window or blocked storage must not break the
 *  page, it just starts on cards.
 *
 *  Read through useSyncExternalStore rather than an effect: the server has no
 *  localStorage, so its snapshot is always 'cards', and the client swaps in
 *  the stored value without a hydration mismatch or a set-state-in-effect. */
const VIEW_STORAGE_KEY = 'ntr.admin.leads.view';

type LeadsView = 'cards' | 'rows';

const viewListeners = new Set<() => void>();

function subscribeView(onChange: () => void) {
  viewListeners.add(onChange);
  // Another tab changing the preference keeps this one in step.
  window.addEventListener('storage', onChange);
  return () => {
    viewListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readStoredView(): LeadsView {
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === 'rows' ? 'rows' : 'cards';
  } catch {
    return 'cards';
  }
}

function writeStoredView(next: LeadsView) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  } catch {
    // Remembering the choice is a convenience, never a requirement.
  }
  for (const listener of viewListeners) listener();
}

/** Two stacked paper cards. */
function CardsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="5.5" rx="1" />
      <rect x="1.5" y="9" width="13" height="5.5" rx="1" />
    </svg>
  );
}

/** Four list lines. */
function RowsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <line x1="1.8" y1="3" x2="14.2" y2="3" />
      <line x1="1.8" y1="6.5" x2="14.2" y2="6.5" />
      <line x1="1.8" y1="10" x2="14.2" y2="10" />
      <line x1="1.8" y1="13.5" x2="14.2" y2="13.5" />
    </svg>
  );
}
import { exportLeadsCsv } from '@/components/admin/leads/exportLeadsCsv';

function LeadsPageContent({
  email,
  getToken,
  signOut,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<AdminLeadRecord[]>([]);
  const [cap, setCap] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<LeadSortOrder>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Bumped by the Refresh button to re-run the effect below. An effect that
  // directly calls a separately-defined, named function which sets state
  // (e.g. a useCallback also used by a button's onClick) triggers React's
  // set-state-in-effect check; inlining the fetch in the effect and driving
  // "refresh" through a dependency avoids that without duplicating the fetch.
  const [refreshKey, setRefreshKey] = useState(0);

  const abortSignal = useAbortSignal();

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch<{ leads: AdminLeadRecord[]; cap: number }>('/admin/leads', getToken, {
          cache: 'no-store',
          signal: abortSignal,
        });
        setLeads(data.leads ?? []);
        setCap(data.cap ?? null);
      } catch (e) {
        if (isAbortError(e)) return;
        setError(e instanceof Error ? e.message : 'Lead load failed');
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

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (!q) return true;
      const hay = [l.ownerName, l.email, l.phone, l.dogName, l.neighborhood, l.breedAge, l.notes, l.serviceInterest, l.reactivity, l.allergies]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, query]);

  // "Most answered first" surfaces the serious leads without disturbing the
  // search above; "Newest first" keeps the server's own submittedAt order.
  const filtered = useMemo(() => {
    if (sortBy !== 'complete') return searched;
    return [...searched].sort(byCompletenessDesc);
  }, [searched, sortBy]);

  const view = useSyncExternalStore(subscribeView, readStoredView, () => 'cards' as LeadsView);

  return (
    <AdminShell
      title="Leads"
      email={email}
      onSignOut={signOut}
    >
      <div id="leads-page-shell" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error ? (
          <div id="leads-load-error" className="card card-pad text-terra">
            {error}
          </div>
        ) : null}

        <LeadFilterBar
          query={query}
          onQueryChange={setQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          loading={loading}
          filteredCount={filtered.length}
          totalCount={leads.length}
          cap={cap}
        />

        <div id="leads-table-shell">
          {/* One icon, on the list it acts on, showing the layout it switches
              to rather than the one already on screen. */}
          <div id="admin-leads-list-toolbar">
            <button
              type="button"
              id="admin-leads-view-toggle-btn"
              className="admin-leads-view-toggle-btn"
              aria-pressed={view === 'rows'}
              title={view === 'cards' ? 'Switch to line items' : 'Switch to cards'}
              onClick={() => writeStoredView(view === 'cards' ? 'rows' : 'cards')}
            >
              {view === 'cards' ? <RowsIcon /> : <CardsIcon />}
              <span className="sr-only">{view === 'cards' ? 'Switch to line items' : 'Switch to cards'}</span>
            </button>
          </div>

          <LeadTable
            view={view}
            leads={filtered}
            expandedId={expandedId}
            onToggleExpand={(rowKey) => setExpandedId((current) => (current === rowKey ? null : rowKey))}
          />
        </div>

        {/* Refresh and export read as what you do after looking through the
            list, so they sit at the end of it. */}
        <div id="admin-leads-footer-actions">
          <button
            type="button"
            className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
            id="admin-leads-refresh-btn"
            onClick={refresh}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary booking-forward-btn btn-accent btn-sm"
            id="admin-leads-export-csv-btn"
            onClick={() => exportLeadsCsv(filtered)}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

export default function LeadsPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <LeadsPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
