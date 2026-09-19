'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CarouselApi } from '@/components/ui/carousel';
import { BriefHtmlPreview } from '@/components/admin/brief/BriefHtmlPreview';
import { DashboardSummary } from '@/components/admin/brief/DashboardSummary';
import { DashboardHistory } from '@/components/admin/brief/DashboardHistory';
import { buildHistoryOverview, buildLatestOverview } from '@/components/admin/brief/overview';
import type { BriefHistoryItem, LatestBriefResponse } from '@/components/admin/brief/types';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';

// This page is the full founder workspace: the "Daily Brief" pipeline run
// controls, the rich per-run overview (weather, post preview, social/local
// intelligence, run cost) that used to live at /admin/dashboard, plus the
// rendered-HTML preview and artifact paths that only ever lived here. Phase
// A5 (plans/003-admin-dashboard-and-tracking.md) moved the former onto this
// route without dropping any feature — see that plan for the inventory this
// page is required to preserve.
//
// Presentation runs on the site's marketing skin (app/globals.css) — the
// same `.card` paper panels, `.stamp-label` stamped headings and `.rc-row`
// data rows every other restyled admin page uses — in place of the former
// standalone dark theme. What remains below is layout-only plumbing: sizing
// for the rendered-HTML iframe, the weather-canvas stage
// (components/admin/brief/WeatherBackdrop.tsx, which is untouched — its sky
// is drawn on a <canvas> with its own palette and cannot be expressed
// through the marketing class vocabulary), and small flex/grid rules the
// vocabulary itself doesn't cover (carousel slot widths, run-tile scroller).
const css = `
#admin-brief-page-shell { display: grid; gap: 24px; }

/* Every restyled panel is a stack of stamp-label / note / rows with no
   built-in gap between them (the site's reset is margin:0 on everything) —
   this is the one shared spacing rule the marketing vocabulary itself
   doesn't provide. */
.card-pad:not(.grid-2):not(.grid-3):not(.grid-4):not(.values-grid) > * + * { margin-top: 10px; }
#admin-brief-actions-row-controls { display: flex; gap: 10px; flex-wrap: wrap; }
#brief-hero-copy > * + * { margin-top: 8px; }

/* Weather canvas stage (WeatherBackdrop.tsx passthrough — untouched). No
   text is overlaid on top of it, so no scrim/gradient is needed. */
#brief-hero-weather-stage { position: relative; height: 220px; }
.db-hero-bg { position: absolute; inset: 0; }
.db-hero-canvas { width: 100%; height: 100%; display: block; }

#brief-hero-stats-grid > div { display: grid; gap: 4px; }

/* Post-of-the-day platform carousel — Embla slot sizing only. */
.carousel-shell { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.platform-track { width: 100%; }
.platform-slot { flex: none; width: 100%; min-width: 0; }
@media (min-width: 640px) { .platform-track { gap: 20px; } .platform-slot { width: 45%; } }
@media (min-width: 1280px) { .platform-track { gap: 24px; } .platform-slot { width: calc(33.333% - 16px); } }
.carousel-footer { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
#brief-post-carousel-slide-jumps { display: flex; gap: 8px; flex-wrap: wrap; }
#brief-post-of-day-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
#brief-post-instagram-polaroid .polaroid-window,
#brief-post-twitter-polaroid .polaroid-window,
#brief-post-facebook-polaroid .polaroid-window { width: 100%; aspect-ratio: 1 / 1; }
#brief-post-instagram-polaroid .polaroid-window img,
#brief-post-twitter-polaroid .polaroid-window img,
#brief-post-facebook-polaroid .polaroid-window img { width: 100%; height: 100%; object-fit: cover; display: block; }

#brief-social-signals-grid, #brief-local-intel-grid { margin-top: 12px; }

#brief-run-cost-breakdown { margin-top: 12px; }

/* Rendered-HTML preview — chrome only; the generated document inside is
   never restyled. */
#admin-brief-html-preview-frame { min-height: 60vh; }
#admin-brief-html-preview-frame iframe { width: 100%; min-height: 60vh; border: 0; display: block; }

#admin-brief-content-dump > div + div,
#admin-brief-artifacts-panel > div + div { margin-top: 10px; }

/* Previous-runs rail */
#dashboard-history-run-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
#dashboard-history-scroll { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 4px; margin-top: 14px; }
#dashboard-history-scroll > .card { flex: 0 0 auto; width: 200px; display: grid; }
.dashboard-history-item-btn { display: grid; gap: 8px; width: 100%; text-align: center; background: none; border: 0; padding: 16px; cursor: pointer; font: inherit; color: inherit; }
.dashboard-history-thumb .polaroid-window { width: 100%; aspect-ratio: 4 / 5; }
.dashboard-history-thumb .polaroid-window img { width: 100%; height: 100%; object-fit: cover; display: block; }
#dashboard-history-scroll .btn { margin: 0 16px 16px; }
`;

function AdminBriefPageContent({
  email,
  getToken,
  signOut,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<LatestBriefResponse | null>(null);
  const [history, setHistory] = useState<BriefHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [html, setHtml] = useState('');
  // Decision 11 (admin footer, plans/003-admin-dashboard-and-tracking.md):
  // the footer must show a real refresh time, not a fabricated one, so this
  // stays null until a fetch actually completes.
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);

  const abortSignal = useAbortSignal();

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    carouselApi.on('reInit', onSelect);
    return () => { carouselApi.off('select', onSelect); carouselApi.off('reInit', onSelect); };
  }, [carouselApi]);

  // Named, reusable version for runBrief and the "Refresh Latest" button
  // below (an event-driven callback, not an effect, so it may set state
  // directly). Fetches the overview JSON, the run history, and the raw
  // rendered-HTML preview together — all three used to be split across two
  // pages; this is the merged, single fetch.
  const fetchOverview = useCallback(async () => {
    try {
      const token = await getToken();
      const [latestData, historyData, htmlRes] = await Promise.all([
        adminFetch<LatestBriefResponse>('/admin/not-the-rug/latest-brief', getToken, { cache: 'no-store', signal: abortSignal }),
        adminFetch<{ runs?: BriefHistoryItem[] }>('/admin/not-the-rug/history?limit=14', getToken, { cache: 'no-store', signal: abortSignal })
          .catch(() => ({ runs: [] })),
        // Raw HTML, not JSON — adminFetch always parses JSON, so this route is
        // fetched directly and its ok/failure tolerated like the original.
        fetch('/admin/not-the-rug/latest-brief/html', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: abortSignal }),
      ]);
      setLatest(latestData);
      setHistory(historyData.runs ?? []);
      setHtml(htmlRes.ok ? await htmlRes.text() : '');
      setLastRefreshed(new Date());
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Could not load the latest brief.');
    } finally {
      setLoading(false);
    }
  }, [getToken, abortSignal]);

  // Inlined rather than calling fetchOverview() by name: an effect that
  // directly calls a separately-defined function which sets state triggers
  // React's set-state-in-effect check (see the other admin pages for the
  // same pattern).
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const [latestData, historyData, htmlRes] = await Promise.all([
          adminFetch<LatestBriefResponse>('/admin/not-the-rug/latest-brief', getToken, { cache: 'no-store', signal: abortSignal }),
          adminFetch<{ runs?: BriefHistoryItem[] }>('/admin/not-the-rug/history?limit=14', getToken, { cache: 'no-store', signal: abortSignal })
            .catch(() => ({ runs: [] })),
          fetch('/admin/not-the-rug/latest-brief/html', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: abortSignal }),
        ]);
        setLatest(latestData);
        setHistory(historyData.runs ?? []);
        setHtml(htmlRes.ok ? await htmlRes.text() : '');
        setLastRefreshed(new Date());
      } catch (err) {
        if (isAbortError(err)) return;
        setError(err instanceof Error ? err.message : 'Could not load the latest brief.');
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, abortSignal]);

  const runBrief = useCallback(async (fresh: boolean) => {
    setRunning(true);
    setError('');
    try {
      await adminFetch('/admin/not-the-rug/run-brief', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fresh }),
        signal: abortSignal,
      });
      setSelectedHistoryId(null);
      setLoading(true);
      await fetchOverview();
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Brief run failed.');
    } finally {
      setRunning(false);
    }
  }, [fetchOverview, getToken, abortSignal]);

  // Per-run HTML download — this was previously dashboard-only; moved here
  // unchanged so the brief workspace keeps every prior-runs action.
  const downloadRunHtml = useCallback(async (runId: string) => {
    setDownloadingRunId(runId);
    setError('');
    try {
      const token = await getToken();
      const response = await fetch(`/admin/not-the-rug/history/${encodeURIComponent(runId)}/html`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: abortSignal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTML brief download failed (${response.status})`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const fileName = disposition.match(/filename="([^"]+)"/i)?.[1] ?? `not-the-rug-brief-${runId}.html`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Could not download this HTML brief.');
    } finally {
      setDownloadingRunId(null);
    }
  }, [getToken, abortSignal]);

  const latestOverview = useMemo(() => buildLatestOverview(latest, history), [latest, history]);
  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );
  const active = useMemo(
    () => (selectedHistory ? buildHistoryOverview(selectedHistory) : latestOverview),
    [latestOverview, selectedHistory],
  );

  // Ready/Review/No-verdict — three distinct states, not collapsed to a
  // boolean, because "no run yet" and "run reviewed and flagged" are
  // different facts the founder needs to tell apart at a glance. Always
  // reflects the LATEST run specifically (not whatever history item is
  // selected below), matching this page's original behavior.
  const readinessChip = useMemo(() => {
    const ready = latest?.summary.readyToPublish;
    if (ready === true) return <span className="badge badge-sage">Ready To Publish</span>;
    if (ready === false) return <span className="badge badge-terra">Review Required</span>;
    return <span className="badge">No Guardian Verdict Yet</span>;
  }, [latest]);

  // Generic dump of every saved content field for the active run (latest or
  // a selected history item) — DashboardSummary only surfaces the specific
  // fields it knows how to lay out (instagram_post_copy, content_angle);
  // this keeps every other saved field (blog copy, email subject, etc.)
  // visible instead of silently dropping whatever isn't named there.
  const contentEntries = useMemo(
    () => Object.entries(active?.content ?? {}),
    [active],
  );

  return (
    <>
      <style>{css}</style>
      <AdminShell title="Daily Brief" email={email} onSignOut={signOut} lastRefreshed={lastRefreshed}>
        <div id="admin-brief-page-shell">

          <section id="admin-brief-actions-row" className="card card-pad">
            <div className="stamp-label stamp-label-heading">Scout, Scribe, Guardian, Reporter</div>
            {readinessChip}
            <div id="admin-brief-actions-row-controls">
              <button className="btn btn-primary booking-forward-btn btn-accent" disabled={loading || running} onClick={() => void fetchOverview()}>
                Refresh Latest
              </button>
            </div>
            {error ? <div className="form-note text-terra">{error}</div> : null}
          </section>

          <DashboardSummary
            active={active}
            latest={latest}
            error=""
            isHistorical={!!selectedHistory}
            carouselIndex={carouselIndex}
            setCarouselApi={setCarouselApi}
            onSelectSlide={(i) => carouselApi?.scrollTo(i)}
          />

          <section id="admin-brief-render-detail-panel" className="card card-pad">
            <div className="stamp-label stamp-label-heading">Generated Image Detail</div>
            <span className="form-note">Canvas preset for the active run</span>
            {active?.generatedImage ? (
              <div className="rc-row">
                <div>
                  <div className="rc-label">Canvas Preset</div>
                  <div className="rc-value">{active.generatedImage.canvasPreset}</div>
                  <a href={active.generatedImage.renderDownloadURL} target="_blank" rel="noreferrer">Open generated image</a>
                </div>
              </div>
            ) : (
              <div className="form-note">No generated image attached to this run.</div>
            )}
          </section>

          <section id="admin-brief-saved-content-panel" className="card card-pad">
            <div className="stamp-label stamp-label-heading">Saved Content — All Fields</div>
            <span className="form-note">Everything saved for the active run</span>
            {contentEntries.length ? (
              <div id="admin-brief-content-dump">
                {contentEntries.map(([key, value]) => (
                  <div key={key} className="rc-row">
                    <div>
                      <div className="rc-label">{key.replace(/_/g, ' ')}</div>
                      <div className="rc-value">{value ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No saved content for this run.</div>
            )}
          </section>

          <section id="admin-brief-html-preview-panel" className="card card-pad">
            <div className="form-note">Founder HTML Brief</div>
            <div className="stamp-label stamp-label-heading">Latest Rendered Brief</div>
            <div id="admin-brief-html-preview-frame">
              <BriefHtmlPreview loading={loading} html={html} />
            </div>
          </section>

          <section id="admin-brief-artifacts-panel" className="card card-pad">
            <div className="stamp-label stamp-label-heading">Artifacts</div>
            <span className="form-note">Latest run&apos;s saved storage paths</span>
            <div className="rc-row">
              <div><div className="rc-label">Brief JSON</div><div className="rc-value">{latest?.artifacts?.latestBriefJsonPath ?? '—'}</div></div>
            </div>
            <div className="rc-row">
              <div><div className="rc-label">Content JSON</div><div className="rc-value">{latest?.artifacts?.latestContentJsonPath ?? '—'}</div></div>
            </div>
            <div className="rc-row">
              <div><div className="rc-label">Markdown</div><div className="rc-value">{latest?.artifacts?.latestMarkdownPath ?? '—'}</div></div>
            </div>
            <div className="rc-row">
              <div><div className="rc-label">HTML</div><div className="rc-value">{latest?.artifacts?.latestHtmlPath ?? '—'}</div></div>
            </div>
          </section>

          <DashboardHistory
            history={history}
            loading={loading}
            selectedHistoryId={selectedHistoryId}
            onSelectHistory={setSelectedHistoryId}
            running={running}
            onRunBrief={runBrief}
            downloadingRunId={downloadingRunId}
            onDownloadHtml={downloadRunHtml}
          />

        </div>
      </AdminShell>
    </>
  );
}

export default function AdminBriefPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <AdminBriefPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
