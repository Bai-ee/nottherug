'use client';

import { formatCompactDate, generatedImageDimensions, truncate } from './overview';
import type { BriefHistoryItem } from './types';

/**
 * The "Previous Runs" rail: run controls plus the list of past runs to swap
 * the summary above to. Restyled onto the marketing skin — a paper `.card`
 * panel holding a horizontal scroll of `.card` run tiles, each with a
 * `.polaroid` thumbnail and `.rc-row` data.
 */
export function DashboardHistory({
  history,
  loading,
  selectedHistoryId,
  onSelectHistory,
  running,
  onRunBrief,
  downloadingRunId,
  onDownloadHtml,
}: {
  history: BriefHistoryItem[];
  loading: boolean;
  selectedHistoryId: string | null;
  onSelectHistory: (id: string) => void;
  running: boolean;
  onRunBrief: (fresh: boolean) => void;
  downloadingRunId: string | null;
  onDownloadHtml: (id: string) => void;
}) {
  return (
    <section className="card card-pad" id="dashboard-history-rail">
      <div className="stamp-label stamp-label-heading">Previous Runs</div>
      <span className="form-note">Swap the dashboard to a prior day</span>

      <div id="dashboard-history-run-actions">
        <button className="btn btn-primary booking-forward-btn btn-accent" onClick={() => onRunBrief(true)} disabled={running}>
          {running ? 'Running Brief…' : 'Run Brief'}
        </button>
        <button className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" onClick={() => onRunBrief(false)} disabled={running}>
          {running ? 'Refreshing…' : 'Use Cached Inputs'}
        </button>
      </div>

      {loading && !history.length ? (
        <div className="form-note">Loading recent runs…</div>
      ) : history.length ? (
        <div id="dashboard-history-scroll">
          {history.map((item) => {
            const isActive = selectedHistoryId === item.id;
            return (
              <div key={item.id} className="card card-hover" id={`dashboard-history-card-${item.id}`}>
                <button
                  type="button"
                  className="dashboard-history-item-btn"
                  onClick={() => onSelectHistory(item.id)}
                >
                  <div className={isActive ? 'form-note text-sage' : 'form-note'}>
                    {formatCompactDate(item.createdAt)}{isActive ? ' · Viewing' : ''}
                  </div>
                  {item.generatedImage?.renderDownloadURL ? (
                    <div className="polaroid dashboard-history-thumb" id={`dashboard-history-polaroid-${item.id}`}>
                      <div className="polaroid-window">
                        {/* Firebase Storage download URL for a per-run generated
                            render — an authenticated admin preview of dynamic
                            content, not a static public asset, so next/image
                            (and its remote-pattern allowlist) does not apply
                            here. Dimensions come from the run's own canvas
                            preset (see generatedImageDimensions in
                            ./overview.ts); the visible box is still governed
                            by the global img rule. */}
                        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated generator preview, remote per-run Storage URL, not a next/image candidate */}
                        <img
                          src={item.generatedImage.renderDownloadURL}
                          alt={`Generated image for brief run ${formatCompactDate(item.createdAt)}`}
                          {...generatedImageDimensions(item.generatedImage.canvasPreset)}
                          decoding="async"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="form-note">No generated image saved for this run.</div>
                  )}
                  <div className="value-num">{item.qualityScore ?? '—'}</div>
                  <div className="rc-label">{truncate(item.scoutPriorityAction ?? item.contentAngle, 70)}</div>
                </button>
                <button
                  className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
                  type="button"
                  onClick={() => onDownloadHtml(item.id)}
                  disabled={downloadingRunId === item.id}
                >
                  {downloadingRunId === item.id ? 'Downloading…' : 'Download HTML'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="form-note">No saved brief runs yet.</div>
      )}
    </section>
  );
}
