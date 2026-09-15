'use client';

import type { GeneratorRender } from '@/lib/generator/types';

export type GenPhase = 'idle' | 'generating' | 'success' | 'error';

export function GeneratorExportOverlay({
  genPhase,
  genError,
  displayRender,
  renders,
  onClose,
  onSelectRender,
  onShare,
}: {
  genPhase: GenPhase;
  genError: string;
  displayRender: GeneratorRender | null;
  renders: GeneratorRender[];
  onClose: () => void;
  onSelectRender: (render: GeneratorRender) => void;
  onShare: (render: GeneratorRender) => void;
}) {
  return (
    <div className="ed-export" id="admin-gen-export-overlay">
      <div className="ed-export-bar">
        <span className="ed-export-title">
          {genPhase === 'generating' ? 'Generating' : genPhase === 'error' ? 'Generation Issue' : 'Export'}
        </span>
        <button className="ed-export-back" onClick={onClose}>← Back</button>
      </div>

      <div className="ed-export-preview">
        {genPhase === 'generating' && (
          <div className="ed-canvas-placeholder">
            <div className="ed-canvas-ph-text">[generating image]</div>
          </div>
        )}
        {genPhase === 'error' && (
          <div className="ed-canvas-placeholder" style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div className="ed-canvas-ph-text">[generation failed]</div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  color: 'var(--t1)',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  lineHeight: 1.5,
                  maxWidth: 260,
                }}
              >
                {genError || 'The image did not finish generating.'}
              </div>
              <button className="ed-export-share" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
        {genPhase !== 'generating' && genPhase !== 'error' && displayRender && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayRender.renderDownloadURL} alt="Generated output" />
        )}
        <button className="ed-export-close" id="admin-gen-export-close" onClick={onClose}>✕</button>
      </div>

      {displayRender && genPhase !== 'error' && (
        <div className="ed-export-panel">
          <div className="ed-export-btns">
            <a
              className="ed-export-dl"
              href={displayRender.renderDownloadURL}
              download={`ntr-${displayRender.id}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button className="ed-export-share" onClick={() => onShare(displayRender)}>
                Share
              </button>
            )}
          </div>
          <div className="ed-export-hint">Download or Share to save to Photos</div>

          {renders.length > 1 && (
            <div className="ed-history-strip" id="admin-gen-history-strip">
              {renders
                .filter((r) => r.id !== displayRender.id)
                .slice(0, 7)
                .map((r) => (
                  <div key={r.id} className="ed-history-thumb" title={r.id} onClick={() => onSelectRender(r)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.renderDownloadURL} alt="" />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
