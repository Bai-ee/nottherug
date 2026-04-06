'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User, getIdToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface BriefSummary {
  latestRunAt: string | null;
  scoutStatus: string | null;
  contentStatus: string | null;
  readyToPublish: boolean | null;
  qualityScore: number | null;
  scoutPriorityAction: string | null;
  weatherImpact: string | null;
  reviewInsights: Array<{
    source: string;
    insight: string;
    takeaway: string;
    url: string;
  }>;
  redditSignals: Array<{
    title: string;
    subreddit: string;
    summary: string;
    takeaway: string;
    url: string;
  }>;
  contentAngle: string | null;
}

interface LatestBriefResponse {
  summary: BriefSummary;
  generatedImage: {
    renderId: string;
    renderDownloadURL: string;
    renderStoragePath: string;
    canvasPreset: string;
    logoAsset: string;
    sourcePhotoId: string;
    sourceStoragePath: string;
  } | null;
  artifacts: {
    latestBriefJsonPath: string;
    latestContentJsonPath: string;
    latestMarkdownPath: string;
    latestHtmlPath: string;
  };
  latestBrief: {
    timestamp?: string;
    status?: string;
  } | null;
  latestContent: {
    timestamp?: string;
    status?: string;
    scoutPriorityAction?: string;
    content?: Record<string, string | null>;
    guardianFlags?: {
      readyToPublish?: boolean;
      overallScore?: number | null;
    } | null;
  } | null;
}

interface RunCostSummary {
  totalEstimatedUsd: number;
  aiEstimatedUsd: number;
  stageCosts?: Array<{ stage: string; model: string; inputTokens: number; outputTokens: number; estimatedUsd: number }>;
}

interface BriefHistoryItem {
  id: string;
  createdAt: string;
  status: 'success' | 'error';
  readyToPublish: boolean | null;
  qualityScore: number | null;
  scoutPriorityAction: string | null;
  contentAngle: string | null;
  content: Record<string, string | null> | null;
  generatedImage?: LatestBriefResponse['generatedImage'] | null;
  runCost?: RunCostSummary | null;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Outfit:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #1F2318; }
body { font-family: 'Outfit', sans-serif; }

.nb { min-height: 100vh; color: #B4C89E; background: #1F2318; }
.nb-top { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid #2E3828; }
.nb-top-l, .nb-top-r { display: flex; align-items: center; gap: 14px; }
.nb-brand, .nb-signout, .nb-nav-link, .nb-chip, .nb-meta, .nb-btn, .nb-card-kicker, .nb-label, .nb-note { font-family: 'Space Mono', monospace; }
.nb-brand { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #4E5A42; }
.nb-vsep { width: 1px; height: 12px; background: #2E3828; }
.nb-title { font-size: 14px; color: #EEF4DB; }
.nb-email { font-size: 11px; color: #4E5A42; display: none; }
.nb-signout { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #4E5A42; background: none; border: none; cursor: pointer; }
.nb-nav { display: flex; align-items: center; gap: 0; padding: 0 24px; border-bottom: 1px solid #2E3828; background: #1A1E14; overflow-x: auto; }
.nb-nav-link { display: block; padding: 12px 16px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; color: #4E5A42; border-bottom: 2px solid transparent; white-space: nowrap; }
.nb-nav-active { color: #EEF4DB; border-bottom-color: #B4C89E; }
.nb-page { max-width: 1220px; margin: 0 auto; padding: 28px 20px 80px; display: grid; gap: 20px; }
.nb-hero { display: grid; gap: 16px; }
.nb-eyebrow { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #4E5A42; }
.nb-heading { font-family: 'Fraunces', serif; font-size: clamp(34px, 6vw, 54px); line-height: 1.0; color: #EEF4DB; }
.nb-sub { font-size: 15px; line-height: 1.6; color: #7A9068; max-width: 780px; }
.nb-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.nb-btn { border-radius: 999px; min-height: 44px; padding: 11px 18px; border: 1px solid #3A4532; background: #252E1F; color: #EEF4DB; cursor: pointer; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.nb-btn-primary { background: #B4C89E; color: #1F2318; border-color: transparent; }
.nb-btn:disabled { opacity: 0.55; cursor: default; }
.nb-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
.nb-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.nb-card, .nb-panel { background: #252E1F; border: 1px solid #2E3828; border-radius: 16px; }
.nb-card { padding: 18px; display: grid; gap: 8px; }
.nb-card-kicker { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #4E5A42; }
.nb-card-value { font-family: 'Fraunces', serif; font-size: 30px; line-height: 1.05; color: #EEF4DB; }
.nb-card-copy { font-size: 14px; line-height: 1.6; color: #7A9068; }
.nb-panel { overflow: hidden; }
.nb-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #2E3828; }
.nb-panel-title { font-family: 'Fraunces', serif; font-size: 22px; color: #EEF4DB; }
.nb-panel-body { padding: 18px; display: grid; gap: 16px; }
.nb-rows { display: grid; gap: 10px; }
.nb-row { padding: 14px; border: 1px solid #2E3828; border-radius: 12px; display: grid; gap: 6px; }
.nb-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #4E5A42; }
.nb-value { font-size: 14px; line-height: 1.65; color: #B4C89E; }
.nb-link { color: #B4C89E; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.nb-meta { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #4E5A42; }
.nb-chip { display: inline-flex; align-items: center; min-height: 28px; border-radius: 999px; padding: 5px 10px; border: 1px solid #3A4532; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #EEF4DB; }
.nb-chip-ready { border-color: rgba(180,200,158,0.45); color: #B4C89E; }
.nb-chip-review { border-color: rgba(196,103,75,0.35); color: #E8D4A8; }
.nb-chip-muted { color: #7A9068; }
.nb-preview { min-height: 70vh; background: #1F2318; border-top: 1px solid #2E3828; }
.nb-preview iframe { width: 100%; min-height: 70vh; border: 0; background: #EEF4DB; }
.nb-empty { padding: 32px 18px; font-size: 14px; color: #7A9068; }
.nb-error { padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(196,103,75,0.22); background: rgba(196,103,75,0.08); color: #E8D4A8; font-size: 13px; line-height: 1.5; }
.nb-note { font-size: 11px; line-height: 1.6; color: #4E5A42; }

@media (min-width: 900px) {
  .nb-email { display: block; }
  .nb-page { padding: 34px 28px 96px; }
  .nb-grid { grid-template-columns: minmax(320px, 420px) minmax(0, 1fr); align-items: start; }
  .nb-summary { grid-template-columns: 1fr 1fr; }
}
`;

function formatDate(value: string | null): string {
  if (!value) return 'No runs yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function AdminBriefPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [html, setHtml] = useState('');
  const [data, setData] = useState<LatestBriefResponse | null>(null);
  const [history, setHistory] = useState<BriefHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const fetchLatest = useCallback(async (firebaseUser: User) => {
    setLoading(true);
    setError('');

    try {
      const token = await getIdToken(firebaseUser, true);
      const headers = { Authorization: `Bearer ${token}` };
      const [dataRes, htmlRes, historyRes] = await Promise.all([
        fetch('/admin/not-the-rug/latest-brief', { headers, cache: 'no-store' }),
        fetch('/admin/not-the-rug/latest-brief/html', { headers, cache: 'no-store' }),
        fetch('/admin/not-the-rug/history?limit=14', { headers, cache: 'no-store' }),
      ]);

      if (!dataRes.ok) {
        const body = await dataRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Brief load failed (${dataRes.status})`);
      }

      const latest = (await dataRes.json()) as LatestBriefResponse;
      setData(latest);
      if (historyRes.ok) {
        const historyData = (await historyRes.json()) as { runs?: BriefHistoryItem[] };
        setHistory(historyData.runs ?? []);
      } else {
        setHistory([]);
      }

      if (htmlRes.ok) {
        setHtml(await htmlRes.text());
      } else {
        setHtml('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the latest brief.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser?.email) {
        router.push('/admin');
        return;
      }

      const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
      if (!snap.exists()) {
        router.push('/admin');
        return;
      }

      setUser(firebaseUser);
      setAuthChecked(true);
      await fetchLatest(firebaseUser);
    });

    return () => unsub();
  }, [fetchLatest, router]);

  const runBrief = useCallback(async (fresh: boolean) => {
    if (!user) return;

    setRunning(true);
    setError('');

    try {
      const token = await getIdToken(user, true);
      const res = await fetch('/admin/not-the-rug/run-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fresh }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `Brief run failed (${res.status})`);
      }

      await fetchLatest(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brief run failed.');
    } finally {
      setRunning(false);
    }
  }, [fetchLatest, user]);

  const readinessChip = useMemo(() => {
    const ready = data?.summary.readyToPublish;
    if (ready === true) return <span className="nb-chip nb-chip-ready">Ready To Publish</span>;
    if (ready === false) return <span className="nb-chip nb-chip-review">Review Required</span>;
    return <span className="nb-chip nb-chip-muted">No Guardian Verdict Yet</span>;
  }, [data]);

  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );

  async function handleSignOut() {
    await signOut(auth);
    router.push('/admin');
  }

  if (!authChecked) {
    return <div style={{ background: '#1F2318', minHeight: '100vh' }} />;
  }

  return (
    <>
      <style>{css}</style>
      <div className="nb">
        <div className="nb-top">
          <div className="nb-top-l">
            <span className="nb-brand">NTR</span>
            <div className="nb-vsep" />
            <span className="nb-title">Admin</span>
          </div>
          <div className="nb-top-r">
            <span className="nb-email">{user?.email}</span>
            <button className="nb-signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        <nav className="nb-nav">
          <a className="nb-nav-link" href="/admin/dashboard">Overview</a>
          <a className="nb-nav-link" href="/admin/dashboard/photos">Photos</a>
          <a className="nb-nav-link" href="/admin/dashboard/generator">Generator</a>
          <a className="nb-nav-link nb-nav-active" href="/admin/dashboard/brief">Brief</a>
        </nav>

        <div className="nb-page">
          <div className="nb-hero">
            <div className="nb-eyebrow">Not The Rug · Daily Brief</div>
            <h1 className="nb-heading">Scout, Scribe, Guardian, Reporter.</h1>
            <p className="nb-sub">
              Run the Not The Rug daily brief pipeline on demand, review the latest founder-ready HTML brief,
              and monitor the key signals that surfaced in the most recent cycle.
            </p>
            <div className="nb-actions">
              <button className="nb-btn nb-btn-primary" disabled={running} onClick={() => runBrief(false)}>
                {running ? 'Running Brief…' : 'Run Brief'}
              </button>
              <button className="nb-btn" disabled={running} onClick={() => runBrief(true)}>
                {running ? 'Refreshing…' : 'Run Fresh'}
              </button>
              <button className="nb-btn" disabled={loading || running || !user} onClick={() => user && fetchLatest(user)}>
                Refresh Latest
              </button>
            </div>
            {error && <div className="nb-error">{error}</div>}
          </div>

          <div className="nb-grid">
            <div className="nb-panel">
              <div className="nb-panel-head">
                <div>
                  <div className="nb-label">Latest Run</div>
                  <div className="nb-panel-title">{formatDate(data?.summary.latestRunAt ?? null)}</div>
                </div>
                {readinessChip}
              </div>
              <div className="nb-panel-body">
                <div className="nb-summary">
                  <div className="nb-card">
                    <div className="nb-card-kicker">Quality Score</div>
                    <div className="nb-card-value">{data?.summary.qualityScore ?? '—'}</div>
                    <div className="nb-card-copy">Guardian overall score from the latest content pass.</div>
                  </div>
                  <div className="nb-card">
                    <div className="nb-card-kicker">Pipeline Status</div>
                    <div className="nb-card-value">{data?.summary.contentStatus ?? data?.summary.scoutStatus ?? '—'}</div>
                    <div className="nb-card-copy">Latest scout/content completion state.</div>
                  </div>
                </div>

                <div className="nb-rows">
                  <div className="nb-row">
                    <div className="nb-label">Scout Priority Action</div>
                    <div className="nb-value">{data?.summary.scoutPriorityAction ?? 'No brief has been generated yet.'}</div>
                  </div>
                  <div className="nb-row">
                    <div className="nb-label">Weather Impact</div>
                    <div className="nb-value">{data?.summary.weatherImpact ?? 'No weather impact surfaced in the latest run.'}</div>
                  </div>
                  <div className="nb-row">
                    <div className="nb-label">Content Angle</div>
                    <div className="nb-value">{data?.summary.contentAngle ?? 'No content angle available yet.'}</div>
                  </div>
                </div>

                <div className="nb-rows">
                  <div className="nb-label">Review Insights</div>
                  {data?.summary.reviewInsights?.length ? data.summary.reviewInsights.map((item, index) => (
                    <div className="nb-row" key={`${item.source}-${index}`}>
                      <div className="nb-meta">{item.source}</div>
                      <div className="nb-value">{item.insight}</div>
                      {item.takeaway && <div className="nb-note">{item.takeaway}</div>}
                      {item.url && <a className="nb-link" href={item.url} target="_blank" rel="noreferrer">Source</a>}
                    </div>
                  )) : <div className="nb-empty">No review insights surfaced in the latest run.</div>}
                </div>

                <div className="nb-rows">
                  <div className="nb-label">Reddit Signals</div>
                  {data?.summary.redditSignals?.length ? data.summary.redditSignals.map((item, index) => (
                    <div className="nb-row" key={`${item.title}-${index}`}>
                      <div className="nb-meta">{item.subreddit || 'Reddit'}</div>
                      <div className="nb-value">{item.title}</div>
                      {item.summary && <div className="nb-note">{item.summary}</div>}
                      {item.takeaway && <div className="nb-note">{item.takeaway}</div>}
                      {item.url && <a className="nb-link" href={item.url} target="_blank" rel="noreferrer">Thread</a>}
                    </div>
                  )) : <div className="nb-empty">No Reddit signals surfaced in the latest run.</div>}
                </div>

                <div className="nb-row">
                  <div className="nb-label">Artifacts</div>
                  <div className="nb-note">{data?.artifacts.latestBriefJsonPath ?? '—'}</div>
                  <div className="nb-note">{data?.artifacts.latestContentJsonPath ?? '—'}</div>
                  <div className="nb-note">{data?.artifacts.latestMarkdownPath ?? '—'}</div>
                  <div className="nb-note">{data?.artifacts.latestHtmlPath ?? '—'}</div>
                </div>

                <div className="nb-rows">
                  <div className="nb-label">Instagram Asset</div>
                  {data?.generatedImage ? (
                    <div className="nb-row">
                      <div className="nb-meta">{data.generatedImage.canvasPreset}</div>
                      <img
                        src={data.generatedImage.renderDownloadURL}
                        alt="Generated Instagram creative"
                        style={{ display: 'block', width: '100%', borderRadius: 12, border: '1px solid #2E3828' }}
                      />
                      <div className="nb-note">
                        {data.latestContent?.content?.instagram_post_copy ?? 'No Instagram post copy saved in the latest content output.'}
                      </div>
                      <a className="nb-link" href={data.generatedImage.renderDownloadURL} target="_blank" rel="noreferrer">Open generated image</a>
                    </div>
                  ) : <div className="nb-empty">No generated image attached to the latest brief yet.</div>}
                </div>

                <div className="nb-rows">
                  <div className="nb-label">Previous Days</div>
                  {history.length ? history.map((item) => (
                    <button
                      key={item.id}
                      className="nb-row"
                      style={{
                        background: selectedHistoryId === item.id ? '#1F2318' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onClick={() => setSelectedHistoryId((current) => current === item.id ? null : item.id)}
                    >
                      <div className="nb-meta">{formatDate(item.createdAt)}</div>
                      <div className="nb-value">{item.scoutPriorityAction ?? 'No priority action captured.'}</div>
                      <div className="nb-note">
                        {item.qualityScore ?? '—'} / 100 · {item.readyToPublish ? 'Ready to publish' : 'Review required'}
                        {item.runCost ? ` · $${item.runCost.totalEstimatedUsd.toFixed(4)}` : ''}
                      </div>
                    </button>
                  )) : <div className="nb-empty">No brief history saved to Firebase yet.</div>}
                </div>
              </div>
            </div>

            <div className="nb-panel">
              <div className="nb-panel-head">
                <div>
                  <div className="nb-label">Founder HTML Brief</div>
                  <div className="nb-panel-title">Latest Rendered Brief</div>
                </div>
              </div>
              <div className="nb-preview">
                {selectedHistory ? (
                  <div className="nb-panel-body">
                    <div className="nb-row">
                      <div className="nb-label">Selected Run</div>
                      <div className="nb-value">{formatDate(selectedHistory.createdAt)}</div>
                      <div className="nb-note">{selectedHistory.scoutPriorityAction ?? 'No priority action captured.'}</div>
                    </div>
                    <div className="nb-row">
                      <div className="nb-label">Content Angle</div>
                      <div className="nb-value">{selectedHistory.contentAngle ?? 'No content angle saved for this run.'}</div>
                    </div>
                    <div className="nb-row">
                      <div className="nb-label">Saved Content</div>
                      <div className="nb-note">
                        {selectedHistory.content ? Object.entries(selectedHistory.content).map(([key, value]) => (
                          <div key={key} style={{ marginBottom: 12 }}>
                            <div className="nb-meta">{key.replace(/_/g, ' ')}</div>
                            <div className="nb-value">{value ?? '—'}</div>
                          </div>
                        )) : 'No saved content for this run.'}
                      </div>
                    </div>
                    {selectedHistory.generatedImage?.renderDownloadURL ? (
                      <div className="nb-row">
                        <div className="nb-label">Generated Image</div>
                        <img
                          src={selectedHistory.generatedImage.renderDownloadURL}
                          alt="Generated brief image"
                          style={{ display: 'block', width: '100%', borderRadius: 12, border: '1px solid #2E3828' }}
                        />
                        <a className="nb-link" href={selectedHistory.generatedImage.renderDownloadURL} target="_blank" rel="noreferrer">Open generated image</a>
                      </div>
                    ) : null}

                    {selectedHistory.runCost ? (
                      <div className="nb-row" id="brief-history-run-cost">
                        <div className="nb-label">Run Cost</div>
                        <div className="nb-value">${selectedHistory.runCost.totalEstimatedUsd.toFixed(4)} total · ${selectedHistory.runCost.aiEstimatedUsd.toFixed(4)} AI</div>
                        {selectedHistory.runCost.stageCosts && selectedHistory.runCost.stageCosts.length > 0 && (
                          <div style={{ display: 'grid', gap: 3 }}>
                            {selectedHistory.runCost.stageCosts.map((s, i) => (
                              <div key={i} className="nb-note">{s.stage}: ${s.estimatedUsd.toFixed(4)} ({s.inputTokens.toLocaleString()} in / {s.outputTokens.toLocaleString()} out)</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : loading ? (
                  <div className="nb-empty">Loading latest brief…</div>
                ) : html ? (
                  <iframe title="Latest Not The Rug brief" srcDoc={html} />
                ) : (
                  <div className="nb-empty">No HTML brief has been generated yet. Run the brief to create one.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
