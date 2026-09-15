'use client';

import type { LogoAsset } from '@/app/api/admin/photos/assets/route';

export type RenderPhase = 'idle' | 'rendering' | 'success' | 'error';

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
    <div className="ph-render-panel" id="admin-photos-render-panel">
      <div className="ph-field-group" id="admin-photos-logo-selector">
        <div className="ph-field-label">Select Logo</div>
        {logos.length === 0 ? (
          <div className="ph-no-logos">No logos in storage. Upload files to photos/logos/ in Firebase Storage.</div>
        ) : (
          <div className="ph-logo-grid">
            {logos.map((l) => (
              <div
                key={l.storagePath}
                className={`ph-logo-item${selectedLogoPath === l.storagePath ? ' ph-logo-item-selected' : ''}`}
                onClick={() => onSelectLogo(l.storagePath)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ph-logo-img" src={l.downloadURL} alt={l.name} />
                <div className="ph-logo-name">{l.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ph-field-group" id="admin-photos-placement-controls">
        <div className="ph-field-label">Logo Placement</div>
        <div className="ph-controls-grid">
          <div className="ph-control">
            <label className="ph-field-label" htmlFor="ph-x">X (px)</label>
            <input id="ph-x" className="ph-control-input" type="number" value={placementX} onChange={(e) => onPlacementChange('x', Number(e.target.value))} />
          </div>
          <div className="ph-control">
            <label className="ph-field-label" htmlFor="ph-y">Y (px)</label>
            <input id="ph-y" className="ph-control-input" type="number" value={placementY} onChange={(e) => onPlacementChange('y', Number(e.target.value))} />
          </div>
          <div className="ph-control">
            <label className="ph-field-label" htmlFor="ph-w">Width (px)</label>
            <input id="ph-w" className="ph-control-input" type="number" value={placementW} onChange={(e) => onPlacementChange('w', Number(e.target.value))} />
          </div>
          <div className="ph-control">
            <label className="ph-field-label" htmlFor="ph-h">Height (px)</label>
            <input id="ph-h" className="ph-control-input" type="number" value={placementH} onChange={(e) => onPlacementChange('h', Number(e.target.value))} />
          </div>
          <div className="ph-control">
            <label className="ph-field-label" htmlFor="ph-op">Opacity (0–1)</label>
            <input id="ph-op" className="ph-control-input" type="number" min={0} max={1} step={0.05} value={placementOpacity} onChange={(e) => onPlacementChange('opacity', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="ph-render-actions" id="admin-photos-render-actions">
        <button className="ph-btn" disabled={!canRender} onClick={onRender}>
          {isRendering ? 'Rendering…' : 'Render'}
        </button>
        {sourceFileName && (
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: '#4E5A42' }}>
            Source: {sourceFileName}
          </span>
        )}
      </div>

      {renderPhase === 'success' && <div className="ph-status-ok" id="admin-photos-render-success">{renderMsg}</div>}
      {renderPhase === 'error' && <div className="ph-status-err" id="admin-photos-render-error">Error: {renderMsg}</div>}
    </div>
  );
}
