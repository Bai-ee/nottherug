'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LeadRecord } from '@/lib/leads/contract';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';
import { LeadFilterBar } from '@/components/admin/leads/LeadFilterBar';
import { LeadTable } from '@/components/admin/leads/LeadTable';
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
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [cap, setCap] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | string>('all');
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
        const data = await adminFetch<{ leads: LeadRecord[]; cap: number }>('/admin/leads', getToken, {
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

  const sources = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => { if (l.source) s.add(l.source); });
    return Array.from(s).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (!q) return true;
      const hay = [l.ownerName, l.email, l.phone, l.dogName, l.neighborhood, l.breedAge, l.notes, l.serviceInterest, l.reactivity, l.allergies]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, query, sourceFilter]);

  return (
    <AdminShell
      title="Leads"
      email={email}
      onSignOut={signOut}
      actions={
        <>
          <button type="button" className="btn btn-primary btn-sm admin-btn-secondary" id="admin-leads-refresh-btn" onClick={refresh}>Refresh</button>
          <button
            type="button"
            className="btn btn-primary btn-accent btn-sm"
            id="admin-leads-export-csv-btn"
            onClick={() => exportLeadsCsv(filtered)}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
        </>
      }
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
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          sources={sources}
          loading={loading}
          filteredCount={filtered.length}
          totalCount={leads.length}
          cap={cap}
        />

        <div id="leads-table-shell">
          <LeadTable leads={filtered} expandedId={expandedId} onToggleExpand={(rowKey) => setExpandedId((current) => (current === rowKey ? null : rowKey))} />
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
