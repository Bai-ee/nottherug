'use client';

import {
  LOGO_ASSETS,
  LOGO_ASSET_ORDER,
  type LogoAssetKey,
  type NormalizedLogoPlacement,
} from '@/lib/generator/types';
import type { PhotoUpload } from '@/lib/photos/types';

type SourceMode = 'random' | 'selected';

/** Logo + source controls. Two `.card card-pad` sections side by side on
 * desktop (see #admin-gen-controls-grid in the parent page), stacked on
 * mobile. Source mode is a two-button toggle (`.btn-primary` / `.btn-outline`)
 * rather than a custom segmented control — no such control exists in the
 * allowed vocabulary. */
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
}) {
  return (
    <div id="admin-gen-controls-grid">

      <div className="card card-pad" id="admin-gen-section-logo">
        <div className="stamp-label stamp-label-heading">Logo</div>

        <div id="admin-gen-size-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span className="form-note" style={{ margin: 0 }}>Size</span>
          <input
            id="admin-gen-size-slider"
            type="range"
            min={5} max={60} step={1}
            value={Math.round(placement.diameterRatio * 100)}
            style={{ flex: 1 }}
            onChange={(e) => onPlacementSizeChange(Number(e.target.value) / 100)}
          />
          <span className="form-note" style={{ margin: 0, minWidth: 32, textAlign: 'right' }}>{Math.round(placement.diameterRatio * 100)}%</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onResetPlacement}>Reset</button>
        </div>

        <div id="admin-gen-logo-swatches" style={{ display: 'flex', gap: 16 }}>
          {LOGO_ASSET_ORDER.map((key) => {
            const l = LOGO_ASSETS[key];
            const isActive = logoAsset === key;
            return (
              <div
                key={key}
                onClick={() => onSelectLogo(key)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: isActive ? '2px solid var(--sage-dark)' : '2px solid var(--light-gray)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.previewSrc} alt={l.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <span className="form-note" style={{ margin: 0 }}>{l.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card card-pad" id="admin-gen-section-source">
        <div className="stamp-label stamp-label-heading">Source</div>

        <div id="admin-gen-source-seg" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['random', 'selected'] as SourceMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`btn btn-sm ${sourceMode === m ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onSourceModeChange(m)}
            >
              {m === 'random' ? 'Random' : 'Selected'}
            </button>
          ))}
        </div>

        {sourceMode === 'random' && (
          uploads.length === 0 ? (
            <p className="form-note" style={{ margin: 0 }}>No uploads yet</p>
          ) : randomSource ? (
            <div id="admin-gen-random-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 52, height: 52, overflow: 'hidden', flexShrink: 0 }} className="card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={randomSource.downloadURL} alt={randomSource.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="form-note" style={{ margin: '0 0 3px' }}>Locked</div>
                <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{randomSource.fileName}</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onShuffle}>Shuffle</button>
            </div>
          ) : (
            <p className="form-note" style={{ margin: 0 }}>Picking…</p>
          )
        )}

        {sourceMode === 'selected' && (
          !uploadsLoaded ? (
            <p className="form-note" style={{ margin: 0 }}>Loading…</p>
          ) : uploads.length === 0 ? (
            <p className="form-note" style={{ margin: 0 }}>No uploads yet</p>
          ) : (
            <div id="admin-gen-media-tray" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {uploads.map((u) => {
                const isActive = selectedUploadId === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => onSelectUpload(u.id)}
                    style={{
                      width: 60,
                      height: 60,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      flexShrink: 0,
                      outline: isActive ? '2px solid var(--sage-dark)' : undefined,
                      outlineOffset: isActive ? -2 : undefined,
                    }}
                    className="card"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.downloadURL} alt={u.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
}
