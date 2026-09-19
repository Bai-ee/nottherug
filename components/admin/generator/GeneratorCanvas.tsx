'use client';

import type { RefObject } from 'react';
import {
  CANVAS_PRESETS,
  CANVAS_PRESET_ORDER,
  LOGO_ASSETS,
  type CanvasPresetKey,
  type LogoAssetKey,
} from '@/lib/generator/types';
import { PREVIEW_COVER_STYLE } from '@/lib/generator/fitUtils';
import type { PhotoUpload } from '@/lib/photos/types';

function presetThumbSize(key: CanvasPresetKey): { w: number; h: number } {
  const maxH = 30;
  const p = CANVAS_PRESETS[key];
  const ar = p.width / p.height;
  const h = maxH;
  const w = Math.max(10, Math.round(h * ar));
  return { w, h };
}

/**
 * The editable canvas surface: source image + draggable logo overlay, and
 * the preset-size strip below it. Kept as one component because the preset
 * strip's active state and the canvas's aspect ratio are the same piece of
 * state (`preset`) — splitting them further would just push props back and
 * forth for no benefit.
 *
 * The canvas frame is a `.card` (paper background, border, shadow already
 * provide the "surface" reading) sized in JS against the viewport — see
 * canvasSize in the parent page — so nothing here sets its width/height.
 */
export function GeneratorCanvas({
  canvasZoneRef,
  canvasWrapperRef,
  canvasSize,
  resolvedSource,
  uploadsLoaded,
  uploadsCount,
  sourceMode,
  logoOverlayCss,
  logoAsset,
  onCanvasClick,
  onLogoPointerDown,
  onLogoPointerMove,
  onLogoPointerUp,
  preset,
  onSelectPreset,
}: {
  canvasZoneRef: RefObject<HTMLDivElement | null>;
  canvasWrapperRef: RefObject<HTMLDivElement | null>;
  canvasSize: { w: number; h: number };
  resolvedSource: PhotoUpload | null;
  uploadsLoaded: boolean;
  uploadsCount: number;
  sourceMode: 'random' | 'selected';
  logoOverlayCss: React.CSSProperties;
  logoAsset: LogoAssetKey;
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onLogoPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onLogoPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onLogoPointerUp: () => void;
  preset: CanvasPresetKey;
  onSelectPreset: (key: CanvasPresetKey) => void;
}) {
  return (
    <>
      <div
        ref={canvasZoneRef}
        id="admin-gen-canvas-zone"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}
      >
        <div
          ref={canvasWrapperRef}
          id="admin-gen-canvas-frame"
          className="card"
          style={{ position: 'relative', cursor: 'crosshair', userSelect: 'none', flexShrink: 0, width: canvasSize.w, height: canvasSize.h }}
          onClick={onCanvasClick}
        >
          {resolvedSource ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedSource.downloadURL}
                alt="source"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...PREVIEW_COVER_STYLE, zIndex: 1 }}
              />
              <div
                id="admin-gen-logo-overlay"
                style={logoOverlayCss}
                onPointerDown={onLogoPointerDown}
                onPointerMove={onLogoPointerMove}
                onPointerUp={onLogoPointerUp}
                title="Drag to reposition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGO_ASSETS[logoAsset].previewSrc}
                  alt="logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
                  draggable={false}
                />
              </div>
            </>
          ) : (
            <div id="admin-gen-canvas-placeholder" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="stamp-label">
                {!uploadsLoaded ? 'Loading' : uploadsCount === 0 ? 'No images' : sourceMode === 'selected' ? 'Select image' : 'Loading'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        id="admin-gen-preset-strip"
        style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        {CANVAS_PRESET_ORDER.map((key) => {
          const { w, h } = presetThumbSize(key);
          const p = CANVAS_PRESETS[key];
          const isActive = preset === key;
          return (
            <div
              key={key}
              id={`admin-gen-preset-chip-${key}`}
              onClick={() => onSelectPreset(key)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0, padding: '6px 8px' }}
            >
              <div
                style={{
                  width: w,
                  height: h,
                  border: isActive ? '2px solid var(--terracotta)' : '1.5px solid var(--olive)',
                  flexShrink: 0,
                }}
              />
              <span className={`badge${isActive ? ' badge-sage' : ''}`}>{p.aspectLabel}</span>
              <span className="form-note" style={{ margin: 0 }}>{p.width}×{p.height}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
