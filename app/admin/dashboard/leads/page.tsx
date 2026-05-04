'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User, getIdToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface LeadRow {
  id?: string;
  type?: string;
  submittedAt?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  neighborhood?: string;
  dogName?: string;
  breedAge?: string;
  serviceInterest?: string;
  spayNeuter?: string;
  vaccinations?: string;
  dogSocial?: string;
  strangerSocial?: string;
  walkFrequency?: string;
  notes?: string;
  source?: string;
}

const TZ = 'America/New_York';

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    timeZone: TZ,
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function LeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLeads = useCallback(async (firebaseUser: User) => {
    setLoading(true);
    setError('');
    try {
      const token = await getIdToken(firebaseUser, true);
      const res = await fetch('/admin/leads', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Lead load failed (${res.status})`);
      }
      const data = (await res.json()) as { leads: LeadRow[] };
      setLeads(data.leads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lead load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser?.email) { router.push('/admin'); return; }
      const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
      if (!snap.exists()) { router.push('/admin'); return; }
      setUser(firebaseUser);
      await fetchLeads(firebaseUser);
    });
    return () => unsub();
  }, [fetchLeads, router]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    leads.forEach(l => { if (l.source) s.add(l.source); });
    return Array.from(s).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(l => {
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (!q) return true;
      const hay = [l.ownerName, l.email, l.phone, l.dogName, l.neighborhood, l.breedAge, l.notes, l.serviceInterest]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [leads, query, sourceFilter]);

  function exportCsv() {
    const cols: Array<keyof LeadRow> = [
      'submittedAt','source','ownerName','email','phone','neighborhood',
      'dogName','breedAge','serviceInterest','spayNeuter','vaccinations',
      'dogSocial','strangerSocial','walkFrequency','notes','id',
    ];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [cols.join(','), ...filtered.map(l => cols.map(c => escape(l[c])).join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push('/admin');
  }

  if (!user) {
    return <div style={{ padding: 32, color: '#EDF3DB', fontFamily: 'Space Mono, monospace' }}>Checking access…</div>;
  }

  return (
    <div className="db" style={{ minHeight: '100vh', background: '#55624C', color: '#EDF3DB' }}>
      <style>{`
        .leads-top { display:flex; align-items:center; justify-content:space-between; padding: 14px 24px; border-bottom:1px solid rgba(237,243,219,0.12); background: rgba(50,60,38,0.96); }
        .leads-brand { font-family:'Space Mono',monospace; font-size:13px; letter-spacing:0.1em; text-transform:uppercase; }
        .leads-actions { display:flex; gap:10px; align-items:center; }
        .leads-btn { font-family:'Space Mono',monospace; font-size:12px; padding:8px 14px; border-radius:6px; border:1px solid rgba(237,243,219,0.25); background:transparent; color:#EDF3DB; cursor:pointer; text-decoration:none; }
        .leads-btn:hover { background:rgba(237,243,219,0.08); }
        .leads-nav { display:flex; gap:0; padding:0 20px; border-bottom:1px solid rgba(237,243,219,0.12); background: rgba(50,60,38,0.96); position:sticky; top:0; z-index:5; }
        .leads-nav a { display:block; padding:12px 16px; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; text-decoration:none; color:rgba(237,243,219,0.5); border-bottom:2px solid transparent; font-family:'Space Mono',monospace; }
        .leads-nav a.active { color:#EDF3DB; border-bottom-color:rgba(237,243,219,0.7); }
        .leads-toolbar { display:flex; gap:12px; align-items:center; padding:18px 24px; flex-wrap:wrap; }
        .leads-input, .leads-select { font-family:'Space Mono',monospace; font-size:12px; padding:8px 12px; border-radius:6px; border:1px solid rgba(237,243,219,0.25); background:rgba(50,60,38,0.5); color:#EDF3DB; }
        .leads-count { font-family:'Space Mono',monospace; font-size:12px; color:rgba(237,243,219,0.65); margin-left:auto; }
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
      `}</style>

      <div className="leads-top">
        <div className="leads-brand">NTR Admin · Leads</div>
        <div className="leads-actions">
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, opacity:0.6 }}>{user.email}</span>
          <button className="leads-btn" onClick={() => user && fetchLeads(user)}>Refresh</button>
          <button className="leads-btn" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
          <button className="leads-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <nav className="leads-nav">
        <a href="/admin/dashboard">Overview</a>
        <a href="/admin/dashboard/generator">Generator</a>
        <a href="/admin/dashboard/leads" className="active">Leads</a>
      </nav>

      {error ? <div className="leads-error">{error}</div> : null}

      <div className="leads-toolbar">
        <input
          className="leads-input"
          placeholder="Search name, email, dog, neighborhood…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <select
          className="leads-select"
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
        >
          <option value="all">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="leads-count">
          {loading ? 'Loading…' : `${filtered.length} of ${leads.length} lead${leads.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="leads-table-wrap">
        {!loading && filtered.length === 0 ? (
          <div className="leads-empty">No leads match the current filters.</div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Source</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Neighborhood</th>
                <th>Dog</th>
                <th>Breed / Age</th>
                <th>Service</th>
                <th>Frequency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const rowKey = l.id ?? `${l.email}-${l.submittedAt}`;
                const isOpen = expandedId === rowKey;
                return (
                  <Fragment key={rowKey}>
                    <tr onClick={() => setExpandedId(isOpen ? null : rowKey)}>
                      <td>{fmtDate(l.submittedAt)}</td>
                      <td><span className="src-pill">{l.source || '—'}</span></td>
                      <td>{l.ownerName || '—'}</td>
                      <td>{l.email ? <a href={`mailto:${l.email}`} onClick={e => e.stopPropagation()}>{l.email}</a> : '—'}</td>
                      <td>{l.phone ? <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()}>{l.phone}</a> : '—'}</td>
                      <td>{l.neighborhood || '—'}</td>
                      <td>{l.dogName || '—'}</td>
                      <td>{l.breedAge || '—'}</td>
                      <td>{l.serviceInterest || '—'}</td>
                      <td>{l.walkFrequency || '—'}</td>
                    </tr>
                    {isOpen ? (
                      <tr className="leads-detail">
                        <td colSpan={10}>
                          <div className="leads-detail-grid">
                            <div className="leads-detail-cell"><div className="lbl">Spay / Neuter</div><div className="val">{l.spayNeuter || '—'}</div></div>
                            <div className="leads-detail-cell"><div className="lbl">Vaccinations</div><div className="val">{l.vaccinations || '—'}</div></div>
                            <div className="leads-detail-cell"><div className="lbl">Around other dogs</div><div className="val">{l.dogSocial || '—'}</div></div>
                            <div className="leads-detail-cell"><div className="lbl">Around strangers</div><div className="val">{l.strangerSocial || '—'}</div></div>
                            <div className="leads-detail-cell"><div className="lbl">Type</div><div className="val">{l.type || '—'}</div></div>
                            <div className="leads-detail-cell"><div className="lbl">Lead ID</div><div className="val" style={{ fontFamily:'Space Mono,monospace', fontSize:11, opacity:0.75 }}>{l.id || '—'}</div></div>
                            <div className="leads-detail-cell" style={{ gridColumn:'1 / -1' }}>
                              <div className="lbl">Notes</div>
                              <div className="val" style={{ whiteSpace:'pre-wrap' }}>{l.notes || '—'}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
