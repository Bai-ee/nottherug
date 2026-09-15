'use client';

import {
  LOGO_ASSETS,
  LOGO_ASSET_ORDER,
  type LogoAssetKey,
  type NormalizedLogoPlacement,
} from '@/lib/generator/types';
import type { PhotoUpload } from '@/lib/photos/types';

type SourceMode = 'random' | 'selected';
type RendererPref = 'sharp' | 'ffmpeg';

export function GeneratorControls({
  placement,
  onPlacementSizeChange,
  onResetPlacement,
  logoAsset,
  onSelectLogo,
  sourceMode,
  onSourceModeChange,
  uploads,
  uploadsLoaded,
  randomSource,
  onShuffle,
  selectedUploadId,
  onSelectUpload,
  showAdvanced,
  onToggleAdvanced,
  rendererPref,
  onSelectRenderer,
}: {
  placement: NormalizedLogoPlacement;
  onPlacementSizeChange: (diameterRatio: number) => void;
  onResetPlacement: () => void;
  logoAsset: LogoAssetKey;
  onSelectLogo: (key: LogoAssetKey) => void;
  sourceMode: SourceMode;
  onSourceModeChange: (mode: SourceMode) => void;
  uploads: PhotoUpload[];
  uploadsLoaded: boolean;
  randomSource: PhotoUpload | null;
  onShuffle: () => void;
  selectedUploadId: string | null;
  onSelectUpload: (id: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  rendererPref: RendererPref;
  onSelectRenderer: (renderer: RendererPref) => void;
}) {
  return (
    <div className="ed-controls-panel" id="admin-gen-controls-panel">
      <div className="ed-controls-grid" id="admin-gen-controls-grid">

        <div className="ed-section" id="admin-gen-section-logo">
          <div className="ed-size-row" id="admin-gen-size-row">
            <span className="ed-size-lbl">Size</span>
            <input
              id="admin-gen-size-slider"
              type="range"
              min={5} max={60} step={1}
              value={Math.round(placement.diameterRatio * 100)}
              className="ed-size-range"
              onChange={(e) => onPlacementSizeChange(Number(e.target.value) / 100)}
            />
            <span className="ed-size-val">{Math.round(placement.diameterRatio * 100)}%</span>
            <button className="ed-reset-btn" onClick={onResetPlacement}>Reset</button>
          </div>

          <div className="ed-logo-swatches" id="admin-gen-logo-swatches">
            {LOGO_ASSET_ORDER.map((key) => {
              const l = LOGO_ASSETS[key];
              return (
                <div
                  key={key}
                  className={`ed-logo-swatch${logoAsset === key ? ' ed-logo-swatch-active' : ''}`}
                  onClick={() => onSelectLogo(key)}
                >
                  <div className="ed-logo-ring">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.previewSrc} alt={l.label} />
                  </div>
                  <div className="ed-logo-name">{l.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ed-section" id="admin-gen-section-source">
          <div className="ed-seg" id="admin-gen-source-seg">
            {(['random', 'selected'] as SourceMode[]).map((m) => (
              <button
                key={m}
                className={`ed-seg-btn${sourceMode === m ? ' ed-seg-btn-active' : ''}`}
                onClick={() => onSourceModeChange(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {sourceMode === 'random' && (
            uploads.length === 0 ? (
              <div className="ed-empty">No uploads yet</div>
            ) : randomSource ? (
              <div className="ed-random-row" id="admin-gen-random-row">
                <div className="ed-random-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={randomSource.downloadURL} alt={randomSource.fileName} />
                </div>
                <div className="ed-random-info">
                  <div className="ed-random-lock">Locked</div>
                  <div className="ed-random-file">{randomSource.fileName}</div>
                </div>
                <button className="ed-shuffle-btn" onClick={onShuffle}>Shuffle</button>
              </div>
            ) : (
              <div className="ed-empty">Picking…</div>
            )
          )}

          {sourceMode === 'selected' && (
            !uploadsLoaded ? (
              <div className="ed-empty">Loading…</div>
            ) : uploads.length === 0 ? (
              <div className="ed-empty">No uploads yet</div>
            ) : (
              <div className="ed-media-tray" id="admin-gen-media-tray">
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className={`ed-media-item${selectedUploadId === u.id ? ' ed-media-item-active' : ''}`}
                    onClick={() => onSelectUpload(u.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.downloadURL} alt={u.fileName} />
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>

      <div className="ed-section" id="admin-gen-section-advanced" style={{ borderBottom: 'none' }}>
        <button className="ed-advanced-toggle" onClick={onToggleAdvanced}>
          {showAdvanced ? '▾' : '▸'} Advanced
        </button>
        {showAdvanced && (
          <div className="ed-renderer-row" id="admin-gen-renderer-row">
            {(['sharp', 'ffmpeg'] as RendererPref[]).map((r) => (
              <button
                key={r}
                className={`ed-renderer-btn${rendererPref === r ? ' ed-renderer-btn-active' : ''}`}
                onClick={() => onSelectRenderer(r)}
              >{r}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
