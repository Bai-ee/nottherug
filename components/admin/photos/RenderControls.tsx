'use client';

import type { LogoAsset } from '@/app/api/admin/photos/assets/route';

export type RenderPhase = 'idle' | 'rendering' | 'success' | 'error';

/** Render options panel: logo picker + placement fields inside a marketing
 * `.card card-pad`, numeric inputs as `.form-control` in `.form-group`s. */
export function RenderControls({
  logos,
  selectedLogoPath,
  onSelectLogo,
  placementX,
  placementY,
  placementW,
  placementH,
  placementOpacity,
  onPlacementChange,
  canRender,
  isRendering,
  onRender,
  sourceFileName,
  renderPhase,
  renderMsg,
}: {
  logos: LogoAsset[];
  selectedLogoPath: string | null;
  onSelectLogo: (storagePath: string) => void;
  placementX: number;
  placementY: number;
  placementW: number;
  placementH: number;
  placementOpacity: number;
  onPlacementChange: (field: 'x' | 'y' | 'w' | 'h' | 'opacity', value: number) => void;
  canRender: boolean;
  isRendering: boolean;
  onRender: () => void;
  sourceFileName: string | undefined;
  renderPhase: RenderPhase;
  renderMsg: string;
}) {
  return (
    <div className="card card-pad" id="admin-photos-render-panel">
      <div className="form-group" id="admin-photos-logo-selector">
        <div className="stamp-label">Select Logo</div>
        {logos.length === 0 ? (
          <p className="form-note" id="admin-photos-no-logos">No logos in storage. Upload files to photos/logos/ in Firebase Storage.</p>
        ) : (
          <div className="grid-4" id="admin-photos-logo-grid">
            {logos.map((l) => (
              <div
                key={l.storagePath}
                className="card"
                onClick={() => onSelectLogo(l.storagePath)}
                style={{
                  cursor: 'pointer',
                  padding: 8,
                  textAlign: 'center',
                  outline: selectedLogoPath === l.storagePath ? '2px solid var(--sage)' : undefined,
                  outlineOffset: selectedLogoPath === l.storagePath ? -2 : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.downloadURL}
                  alt={l.name}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', display: 'block' }}
                />
                <p className="form-note" style={{ margin: '6px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group" id="admin-photos-placement-controls" style={{ marginTop: 24 }}>
        <div className="stamp-label">Logo Placement</div>
        <div className="grid-3" id="admin-photos-placement-grid">
          <div className="form-group">
            <label htmlFor="ph-x">X (px)</label>
            <input id="ph-x" className="form-control" type="number" value={placementX} onChange={(e) => onPlacementChange('x', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="ph-y">Y (px)</label>
            <input id="ph-y" className="form-control" type="number" value={placementY} onChange={(e) => onPlacementChange('y', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="ph-w">Width (px)</label>
            <input id="ph-w" className="form-control" type="number" value={placementW} onChange={(e) => onPlacementChange('w', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="ph-h">Height (px)</label>
            <input id="ph-h" className="form-control" type="number" value={placementH} onChange={(e) => onPlacementChange('h', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="ph-op">Opacity (0–1)</label>
            <input
              id="ph-op"
              className="form-control"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={placementOpacity}
              onChange={(e) => onPlacementChange('opacity', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div id="admin-photos-render-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
        <button type="button" className="btn btn-primary" disabled={!canRender} onClick={onRender}>
          {isRendering ? 'Rendering…' : 'Render'}
        </button>
        {sourceFileName && <span className="form-note" style={{ margin: 0 }}>Source: {sourceFileName}</span>}
      </div>

      {renderPhase === 'success' && <p className="form-note text-sage" id="admin-photos-render-success">{renderMsg}</p>}
      {renderPhase === 'error' && <p className="form-note text-terra" id="admin-photos-render-error">Error: {renderMsg}</p>}
    </div>
  );
}
