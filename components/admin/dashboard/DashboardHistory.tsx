'use client';

import { formatCompactDate, truncate } from './overview';
import type { BriefHistoryItem } from './types';

/** The "Previous Runs" rail: run controls plus the list of past runs to swap the summary above to. */
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
    <section className="db-rail" id="dashboard-history-rail">
      <div className="db-panel-head" style={{ padding: 0, borderBottom: 'none' }}>
        <h2 className="db-panel-title">Previous Runs</h2>
        <span className="db-note">Swap the dashboard to a prior day</span>
      </div>
      <div className="db-actions" style={{ paddingBottom: 4 }}>
        <button className="db-btn db-btn-primary" onClick={() => onRunBrief(true)} disabled={running}>
          {running ? 'Running Brief…' : 'Run Brief'}
        </button>
        <button className="db-btn" onClick={() => onRunBrief(false)} disabled={running}>
          {running ? 'Refreshing…' : 'Use Cached Inputs'}
        </button>
      </div>
      {loading && !history.length ? (
        <div className="db-empty">Loading recent runs…</div>
      ) : history.length ? (
        <div className="db-rail-scroll">
          {history.map((item) => (
            <div key={item.id} className="db-rail-card">
              <button
                className={`db-rail-item ${selectedHistoryId === item.id ? 'db-rail-item-active' : ''}`}
                onClick={() => onSelectHistory(item.id)}
              >
                <div className="db-rail-date">{formatCompactDate(item.createdAt)}</div>
                {item.generatedImage?.renderDownloadURL ? (
                  <div className="db-rail-thumb">
                    <img
                      src={item.generatedImage.renderDownloadURL}
                      alt={`Generated image for brief run ${formatCompactDate(item.createdAt)}`}
                    />
                  </div>
                ) : (
                  <div className="db-rail-thumb-empty">
                    <span>
                      <strong>Image Slot</strong>
                      <em>No generated image saved for this run</em>
                    </span>
                  </div>
                )}
                <div className="db-rail-score">{item.qualityScore ?? '—'}</div>
                <div className="db-rail-copy">{truncate(item.scoutPriorityAction ?? item.contentAngle, 70)}</div>
              </button>
              <div className="db-rail-actions">
                <button
                  className="db-rail-action"
                  type="button"
                  onClick={() => onDownloadHtml(item.id)}
                  disabled={downloadingRunId === item.id}
                >
                  {downloadingRunId === item.id ? 'Downloading…' : 'Download HTML'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="db-empty">No saved brief runs yet.</div>
      )}
    </section>
  );
}
