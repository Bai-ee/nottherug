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
  const maxH = 38;
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
      <div ref={canvasZoneRef} className="ed-canvas-zone" id="admin-gen-canvas-zone">
        <div
          ref={canvasWrapperRef}
          id="admin-gen-canvas-frame"
          className="ed-canvas-frame"
          style={{ width: canvasSize.w, height: canvasSize.h }}
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
            <div className="ed-canvas-placeholder">
              <div className="ed-canvas-ph-text">
                {!uploadsLoaded ? '[loading]' : uploadsCount === 0 ? '[no images]' : sourceMode === 'selected' ? '[select image]' : '[loading]'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ed-preset-strip" id="admin-gen-preset-strip">
        {CANVAS_PRESET_ORDER.map((key) => {
          const { w, h } = presetThumbSize(key);
          const p = CANVAS_PRESETS[key];
          return (
            <div
              key={key}
              className={`ed-preset-chip${preset === key ? ' ed-preset-chip-active' : ''}`}
              onClick={() => onSelectPreset(key)}
            >
              <div className="ed-preset-thumb" style={{ width: w, height: h }} />
              <div className="ed-preset-label">{p.aspectLabel}</div>
              <div className="ed-preset-dim">{p.width}×{p.height}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
