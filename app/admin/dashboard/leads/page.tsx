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
    <>
      <style>{leadsPageCss}</style>
      <AdminShell
        title="Leads"
        email={email}
        onSignOut={signOut}
        actions={
          <>
            <button className="leads-btn" onClick={refresh}>Refresh</button>
            <button className="leads-btn" onClick={() => exportLeadsCsv(filtered)} disabled={!filtered.length}>Export CSV</button>
          </>
        }
      >
        <div className="db" id="leads-page-shell" style={{ background: '#55624C', color: '#EDF3DB' }}>
          {error ? <div className="leads-error" id="leads-load-error">{error}</div> : null}

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

          <div className="leads-table-wrap" id="leads-table-shell">
            <LeadTable leads={filtered} expandedId={expandedId} onToggleExpand={(rowKey) => setExpandedId((current) => (current === rowKey ? null : rowKey))} />
          </div>
        </div>
      </AdminShell>
    </>
  );
}

export default function LeadsPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <LeadsPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}

const leadsPageCss = `
  .leads-btn { font-family:'Space Mono',monospace; font-size:12px; padding:8px 14px; border-radius:6px; border:1px solid rgba(237,243,219,0.25); background:transparent; color:#EDF3DB; cursor:pointer; text-decoration:none; }
  .leads-btn:hover { background:rgba(237,243,219,0.08); }
  .leads-toolbar { display:flex; gap:12px; align-items:center; padding:18px 24px; flex-wrap:wrap; }
  .leads-input, .leads-select { font-family:'Space Mono',monospace; font-size:12px; padding:8px 12px; border-radius:6px; border:1px solid rgba(237,243,219,0.25); background:rgba(50,60,38,0.5); color:#EDF3DB; }
  .leads-count { font-family:'Space Mono',monospace; font-size:12px; color:rgba(237,243,219,0.65); margin-left:auto; }
  .leads-cap-notice { width:100%; font-family:'Space Mono',monospace; font-size:11px; color:rgba(237,243,219,0.55); }
  .leads-table-wrap { padding:0 24px 32px; overflow-x:auto; }
  .leads-table { width:100%; border-collapse:collapse; font-size:13px; background:rgba(50,60,38,0.45); border-radius:10px; overflow:hidden; }
  .leads-table thead th { text-align:left; padding:10px 12px; background:rgba(50,60,38,0.95); font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:rgba(237,243,219,0.65); font-family:'Space Mono',monospace; border-bottom:1px solid rgba(237,243,219,0.15); }
  .leads-table tbody tr { border-bottom:1px solid rgba(237,243,219,0.08); cursor:pointer; }
  .leads-table tbody tr:hover { background:rgba(237,243,219,0.05); }
  .leads-table td { padding:10px 12px; vertical-align:top; }
  .leads-table td a { color:#EDF3DB; text-decoration:underline; }
  .leads-empty { padding:40px; text-align:center; color:rgba(237,243,219,0.55); font-family:'Space Mono',monospace; }
  .leads-detail { background:rgba(50,60,38,0.7); }
  .leads-detail td { padding:16px 20px; }
  .leads-detail-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
  .leads-detail-cell .lbl { font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:rgba(237,243,219,0.5); font-family:'Space Mono',monospace; margin-bottom:4px; }
  .leads-detail-cell .val { font-size:13px; color:#EDF3DB; word-break:break-word; }
  .leads-error { padding:14px 24px; color:#ffb4a2; font-family:'Space Mono',monospace; font-size:12px; }
  .src-pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10px; letter-spacing:0.06em; text-transform:uppercase; background:rgba(237,243,219,0.12); color:#EDF3DB; }
`;
