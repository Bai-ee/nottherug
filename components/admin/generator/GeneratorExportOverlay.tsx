'use client';

import type { GeneratorRender } from '@/lib/generator/types';

export type GenPhase = 'idle' | 'generating' | 'success' | 'error';

/** Full-viewport export overlay. Root is a `.paper-panel` so it reads as the
 * same paper page as the rest of the site instead of a separate dark modal. */
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
    <div
      className="paper-panel"
      id="admin-gen-export-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}
    >
      <div id="admin-gen-export-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
        <span className="stamp-label">
          {genPhase === 'generating' ? 'Generating' : genPhase === 'error' ? 'Generation Issue' : 'Export'}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Back</button>
      </div>

      <div id="admin-gen-export-preview" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
        {genPhase === 'generating' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="stamp-label">Generating image</span>
          </div>
        )}
        {genPhase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
            <span className="stamp-label">Generation failed</span>
            <p className="form-note" style={{ maxWidth: 280 }}>{genError || 'The image did not finish generating.'}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
          </div>
        )}
        {genPhase !== 'generating' && genPhase !== 'error' && displayRender && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayRender.renderDownloadURL} alt="Generated output" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          id="admin-gen-export-close"
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12 }}
        >✕</button>
      </div>

      {displayRender && genPhase !== 'error' && (
        <div id="admin-gen-export-panel" className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              href={displayRender.renderDownloadURL}
              download={`ntr-${displayRender.id}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button type="button" className="btn btn-outline" onClick={() => onShare(displayRender)}>
                Share
              </button>
            )}
          </div>
          <p className="form-note" style={{ textAlign: 'center', margin: 0 }}>Download or Share to save to Photos</p>

          {renders.length > 1 && (
            <div id="admin-gen-history-strip" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {renders
                .filter((r) => r.id !== displayRender.id)
                .slice(0, 7)
                .map((r) => (
                  <div
                    key={r.id}
                    className="card"
                    title={r.id}
                    onClick={() => onSelectRender(r)}
                    style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.renderDownloadURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
