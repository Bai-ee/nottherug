'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PhotoUpload } from '@/lib/photos/types';
import {
  CANVAS_PRESETS,
  DEFAULT_CANVAS_PRESET,
  DEFAULT_LOGO_ASSET,
  DEFAULT_LOGO_PLACEMENT,
  clampPlacement,
  type CanvasPresetKey,
  type LogoAssetKey,
  type NormalizedLogoPlacement,
  type GeneratorRender,
} from '@/lib/generator/types';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { adminFetch, useAbortSignal, isAbortError, readBodyStringField, AdminRequestError, type GetIdToken } from '@/components/admin/adminFetch';
import { GeneratorCanvas } from '@/components/admin/generator/GeneratorCanvas';
import { GeneratorControls } from '@/components/admin/generator/GeneratorControls';
import { GeneratorUploadPanel } from '@/components/admin/generator/GeneratorUploadPanel';
import { GeneratorExportOverlay, type GenPhase } from '@/components/admin/generator/GeneratorExportOverlay';
import { DeleteConfirmModal } from '@/components/admin/generator/DeleteConfirmModal';

// ─── Design tokens ────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #55624C; overflow: hidden; }

:root {
  --bg:   #55624C;
  --s0:   #4A5640;
  --s1:   #4E5A42;
  --s2:   #3D4934;
  --bd0:  rgba(237,243,219,0.12);
  --bd1:  rgba(237,243,219,0.2);
  --bd2:  rgba(237,243,219,0.32);
  --t0:   rgba(237,243,219,0.3);
  --t1:   rgba(237,243,219,0.5);
  --t2:   rgba(237,243,219,0.7);
  --t3:   rgba(237,243,219,0.88);
  --t4:   #EDF3DB;
  --mono: 'Space Mono', monospace;
  --sans: 'Space Grotesk', sans-serif;
  --ease: cubic-bezier(0.25,0.1,0.25,1);
}

/* ── SHELL ──────────────────────────────────────────────────────────────────── */
.ed {
  background: var(--bg);
  color: var(--t3);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── TOPBAR ─────────────────────────────────────────────────────────────────── */
.ed-top {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--s0);
  border-bottom: 1px solid var(--bd0);
}
.ed-top-l { display: flex; align-items: center; gap: 14px; }
.ed-brand {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t1);
}
.ed-vsep { width: 1px; height: 12px; background: var(--bd1); }
.ed-top-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: var(--t4);
}
.ed-top-r { display: flex; align-items: center; gap: 20px; }
.ed-email {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--t0);
  display: none;
}
.ed-signout {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t1);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 150ms;
}
.ed-signout:hover { color: var(--t3); }

/* ── NAV BAR ─────────────────────────────────────────────────────────────────── */
.ed-nav {
  position: static;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--bd0);
  background: var(--s1);
  padding: 0 16px;
}
.ed-nav-link {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t1);
  padding: 0 16px;
  height: 42px;
  border-bottom: 2px solid transparent;
  text-decoration: none;
  transition: color 150ms;
  display: flex;
  align-items: center;
}
.ed-nav-link:hover { color: var(--t3); }
.ed-nav-active { color: var(--t4); border-bottom-color: var(--t3); }

/* ── BODY ───────────────────────────────────────────────────────────────────── */
.ed-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── CANVAS ZONE ────────────────────────────────────────────────────────────── */
.ed-canvas-zone {
  flex-shrink: 0;
  width: 100%;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg);
  overflow: hidden;
}
.ed-canvas-frame {
  position: relative;
  background: var(--s2);
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
  flex-shrink: 0;
  background-image: radial-gradient(circle, var(--bd1) 0.5px, transparent 0.5px);
  background-size: 14px 14px;
}
.ed-canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ed-canvas-ph-text {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t0);
}

/* ── PRESET STRIP ───────────────────────────────────────────────────────────── */
.ed-preset-strip {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 10px 16px;
  overflow-x: auto;
  border-top: 1px solid var(--bd0);
  background: var(--s0);
  scrollbar-width: none;
  align-items: flex-end;
  justify-content: center;
}
.ed-preset-strip::-webkit-scrollbar { display: none; }

.ed-preset-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-shrink: 0;
  padding: 7px 10px;
  border-radius: 5px;
  border: 1px solid transparent;
  transition: background 150ms var(--ease), border-color 150ms;
}
.ed-preset-chip:hover { background: var(--s1); }
.ed-preset-chip-active { background: var(--s2); border-color: var(--bd2); }
.ed-preset-thumb {
  border: 1.5px solid var(--bd2);
  background: transparent;
  transition: border-color 150ms;
  flex-shrink: 0;
}
.ed-preset-chip-active .ed-preset-thumb { border-color: var(--t4); }
.ed-preset-label {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--t1);
  white-space: nowrap;
  line-height: 1;
}
.ed-preset-chip-active .ed-preset-label { color: var(--t4); }
.ed-preset-dim {
  font-family: var(--mono);
  font-size: 7px;
  letter-spacing: 0.04em;
  color: var(--t0);
  white-space: nowrap;
  line-height: 1;
}
.ed-preset-chip-active .ed-preset-dim { color: var(--t1); }

/* ── CONTROLS PANEL ─────────────────────────────────────────────────────────── */
.ed-controls-panel {
  flex-shrink: 0;
  background: var(--s0);
  border-top: 1px solid var(--bd0);
}

/* ── SECTION BLOCK ──────────────────────────────────────────────────────────── */
.ed-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--bd0);
}
.ed-section:last-child { border-bottom: none; }
.ed-section-header {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t1);
  margin-bottom: 12px;
}

/* desktop grid: source & logo side-by-side */
.ed-controls-grid {
  display: grid;
  grid-template-columns: 1fr;
}

/* ── SOURCE CONTROLS ────────────────────────────────────────────────────────── */
.ed-seg {
  display: flex;
  border: 1px solid var(--bd1);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 12px;
}
.ed-seg-btn {
  flex: 1;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t1);
  background: transparent;
  border: none;
  padding: 9px 0;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.ed-seg-btn + .ed-seg-btn { border-left: 1px solid var(--bd1); }
.ed-seg-btn-active { background: var(--s2); color: var(--t4); }

.ed-random-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ed-random-img {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--bd2);
  flex-shrink: 0;
}
.ed-random-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ed-random-info { flex: 1; min-width: 0; }
.ed-random-lock {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t1);
  margin-bottom: 3px;
}
.ed-random-file {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--t3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-shuffle-btn {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--t2);
  background: transparent;
  border: 1px solid var(--bd1);
  border-radius: 999px;
  padding: 7px 14px;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 150ms, color 150ms;
  min-height: 32px;
}
.ed-shuffle-btn:hover { border-color: var(--bd2); color: var(--t3); }

.ed-media-tray {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.ed-media-tray::-webkit-scrollbar { display: none; }
.ed-media-item {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid transparent;
  transition: border-color 150ms;
}
.ed-media-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ed-media-item:hover { border-color: var(--bd2); }
.ed-media-item-active { border-color: var(--t3) !important; }

.ed-empty {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--t1);
  text-transform: uppercase;
}

/* ── LOGO CONTROLS ──────────────────────────────────────────────────────────── */
.ed-logo-swatches {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}
.ed-logo-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}
.ed-logo-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--bd1);
  transition: border-color 150ms, box-shadow 150ms;
}
.ed-logo-swatch:hover .ed-logo-ring { border-color: var(--bd2); }
.ed-logo-swatch-active .ed-logo-ring {
  border-color: var(--t4);
  box-shadow: 0 0 0 2px var(--t4);
}
.ed-logo-ring img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ed-logo-name {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--t1);
}
.ed-logo-swatch-active .ed-logo-name { color: var(--t3); }

/* size row */
.ed-size-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ed-size-lbl {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t1);
  flex-shrink: 0;
}
.ed-size-range {
  flex: 1;
  accent-color: var(--t3);
  cursor: pointer;
  height: 2px;
}
.ed-size-val {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--t3);
  flex-shrink: 0;
  min-width: 28px;
  text-align: right;
}
.ed-reset-btn {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t1);
  background: transparent;
  border: 1px solid var(--bd1);
  border-radius: 3px;
  padding: 5px 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 150ms, border-color 150ms;
}
.ed-reset-btn:hover { color: var(--t3); border-color: var(--bd2); }
.ed-placement-hint {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.06em;
  color: var(--t0);
  text-transform: uppercase;
}

/* ── ADVANCED ───────────────────────────────────────────────────────────────── */
.ed-advanced-toggle {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t0);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 150ms;
}
.ed-advanced-toggle:hover { color: var(--t1); }
.ed-renderer-row { display: flex; gap: 6px; margin-top: 8px; }
.ed-renderer-btn {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t1);
  background: var(--s1);
  border: 1px solid var(--bd1);
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 150ms;
}
.ed-renderer-btn-active { border-color: var(--t3); color: var(--t3); }
.ed-renderer-btn:hover { border-color: var(--bd2); }

/* ── GENERATE BAR ───────────────────────────────────────────────────────────── */
.ed-gen-bar {
  flex-shrink: 0;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--bd0);
  background: var(--s0);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: sticky;
  bottom: 0;
  z-index: 10;
}
.ed-gen-btn {
  width: 100%;
  max-width: 400px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--t3);
  border: none;
  border-radius: 999px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 150ms var(--ease);
  min-height: 44px;
}
.ed-gen-btn:hover { background: var(--t4); }
.ed-gen-btn:disabled { background: var(--bd1); color: var(--t0); cursor: default; }


/* ── UPLOAD SECTION ─────────────────────────────────────────────────────────── */
.ed-upload-section {
  flex-shrink: 0;
  padding: 24px 16px 32px;
  border-top: 1px solid var(--bd0);
}
.ed-upload-cta {
  width: 100%;
  max-width: 400px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--t2);
  border: none;
  border-radius: 999px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 150ms;
  min-height: 44px;
}
.ed-upload-cta:hover { background: var(--t3); }
.ed-upload-cta:disabled { background: var(--bd1); color: var(--t0); cursor: default; }
.ed-upload-zone {
  background: var(--s1);
  border: 1px dashed var(--bd2);
  border-radius: 8px;
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
  margin-bottom: 14px;
}
.ed-upload-zone:hover, .ed-upload-zone-drag { border-color: var(--t2); background: var(--s2); }
.ed-upload-zone-icon { font-family: var(--mono); font-size: 20px; color: var(--t1); }
.ed-upload-zone-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t1);
  text-align: center;
}
.ed-upload-zone-hint { font-family: var(--mono); font-size: 9px; color: var(--t0); letter-spacing: 0.04em; text-align: center; }
.ed-upload-input { display: none; }
.ed-upload-prog-shell { width: 100%; height: 3px; background: var(--bd1); border-radius: 2px; overflow: hidden; }
.ed-upload-prog-fill { height: 100%; background: var(--t3); border-radius: 2px; transition: width 200ms; }
.ed-upload-prog-label {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t2);
  margin-top: 6px;
  text-align: center;
}
.ed-upload-ok {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--t3);
  background: rgba(180,200,158,0.07);
  border: 1px solid rgba(180,200,158,0.15);
  border-radius: 5px;
  padding: 8px 12px;
  margin-bottom: 12px;
}
.ed-upload-err {
  font-family: var(--mono);
  font-size: 10px;
  color: #C4674B;
  background: rgba(196,103,75,0.07);
  border: 1px solid rgba(196,103,75,0.15);
  border-radius: 5px;
  padding: 8px 12px;
  margin-bottom: 12px;
}
.ed-uploads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.ed-upload-item {
  background: var(--s1);
  border: 1px solid var(--bd1);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 150ms;
  position: relative;
}
.ed-upload-item:hover { border-color: var(--bd2); }
.ed-upload-item-selected { border-color: var(--t3) !important; }
.ed-upload-item img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.ed-upload-item-del {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 18, 12, 0.75);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  color: var(--t2);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: background 150ms, color 150ms;
}
.ed-upload-item-del:hover { background: #C4674B; color: #fff; border-color: transparent; }

/* ── LOAD MORE ───────────────────────────────────────────────────────────────── */
.ed-load-more {
  width: 100%;
  margin-top: 6px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t1);
  background: var(--s2);
  border: 1px solid var(--bd1);
  border-radius: 5px;
  padding: 7px 0;
  cursor: pointer;
  transition: color 150ms;
}
.ed-load-more:hover { color: var(--t4); }

/* ── CONFIRM MODAL ───────────────────────────────────────────────────────────── */
.ed-confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 13, 8, 0.72);
  z-index: 60;
}
.ed-confirm-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 61;
  background: #111611;
  border: 1px solid rgba(237,243,219,0.18);
  border-radius: 10px;
  padding: 24px;
  width: calc(100% - 48px);
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ed-confirm-title {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t4);
}
.ed-confirm-body {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--t1);
  line-height: 1.5;
  word-break: break-all;
}
.ed-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.ed-confirm-cancel {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t1);
  background: var(--s2);
  border: 1px solid var(--bd1);
  border-radius: 5px;
  padding: 7px 14px;
  cursor: pointer;
  transition: color 150ms;
}
.ed-confirm-cancel:hover { color: var(--t4); }
.ed-confirm-delete {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: #C4674B;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 7px 14px;
  cursor: pointer;
  transition: background 150ms;
}
.ed-confirm-delete:hover { background: #a8503a; }

/* ── EXPORT OVERLAY ─────────────────────────────────────────────────────────── */
.ed-export {
  position: fixed;
  inset: 0;
  background: var(--s0);
  z-index: 50;
  display: flex;
  flex-direction: column;
}
.ed-export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--bd0);
  flex-shrink: 0;
}
.ed-export-title {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t3);
}
.ed-export-back {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t2);
  background: none;
  border: 1px solid var(--bd1);
  border-radius: 4px;
  padding: 5px 12px;
  cursor: pointer;
  transition: color 150ms, border-color 150ms;
}
.ed-export-back:hover { color: var(--t3); border-color: var(--bd2); }
.ed-export-preview {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg);
  position: relative;
}
.ed-export-preview img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.ed-export-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 18, 12, 0.7);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: var(--t2);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: background 150ms, color 150ms;
}
.ed-export-close:hover { background: rgba(15, 18, 12, 0.92); color: var(--t4); }
.ed-export-panel {
  padding: 16px;
  border-top: 1px solid var(--bd0);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ed-export-btns { display: flex; gap: 8px; }
.ed-export-dl {
  flex: 1;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--t3);
  text-decoration: none;
  border-radius: 999px;
  padding: 12px 16px;
  text-align: center;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms;
}
.ed-export-dl:hover { background: var(--t4); }
.ed-export-share {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t3);
  background: transparent;
  border: 1px solid var(--bd2);
  border-radius: 999px;
  padding: 12px 22px;
  cursor: pointer;
  min-height: 44px;
  transition: border-color 150ms, color 150ms;
}
.ed-export-share:hover { border-color: var(--t3); color: var(--t4); }
.ed-export-hint {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t1);
  text-align: center;
}
.ed-history-strip { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.ed-history-strip::-webkit-scrollbar { display: none; }
.ed-history-thumb {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--bd1);
  flex-shrink: 0;
  cursor: pointer;
}
.ed-history-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ── DESKTOP ────────────────────────────────────────────────────────────────── */
@media (min-width: 768px) {
  .ed-top { padding: 0 32px; }
  .ed-email { display: block; }
  .ed-nav { padding: 0 32px; }

  .ed-canvas-zone { height: 320px; padding: 24px; }

  /* preset strip slightly taller */
  .ed-preset-strip { padding: 12px 20px; }
  .ed-preset-chip { padding: 8px 12px; }
  .ed-controls-grid { grid-template-columns: 1fr 1fr; }
  .ed-controls-grid > .ed-section { border-bottom: none; border-right: 1px solid var(--bd0); }
  .ed-controls-grid > .ed-section:last-child { border-right: none; }

  /* logo swatches slightly larger on desktop */
  .ed-logo-ring { width: 72px; height: 72px; }
  .ed-media-item { width: 64px; height: 64px; }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceMode   = 'random' | 'selected';
type RendererPref = 'sharp' | 'ffmpeg';

// ─── Component ────────────────────────────────────────────────────────────────

function AdminGeneratorPageContent({
  email,
  getToken,
  signOut,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
}) {
  // Source
  const [sourceMode,       setSourceMode]       = useState<SourceMode>('random');
  const [uploads,          setUploads]          = useState<PhotoUpload[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [uploadsLoaded,    setUploadsLoaded]    = useState(false);
  const [randomSource,     setRandomSource]     = useState<PhotoUpload | null>(null);
  const [pendingDelete,    setPendingDelete]    = useState<{ id: string; storagePath: string; fileName: string } | null>(null);
  const [deleteError,      setDeleteError]      = useState<{ id: string; storagePath: string; fileName: string; message: string } | null>(null);
  const [visibleCount,     setVisibleCount]     = useState(20);

  // Canvas
  const [preset, setPreset] = useState<CanvasPresetKey>(DEFAULT_CANVAS_PRESET);

  // Logo
  const [logoAsset, setLogoAsset] = useState<LogoAssetKey>(DEFAULT_LOGO_ASSET);

  // Placement
  const [placement, setPlacement] = useState<NormalizedLogoPlacement>(DEFAULT_LOGO_PLACEMENT);

  // UI
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rendererPref, setRendererPref] = useState<RendererPref>('sharp');

  // Canvas display sizing
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Output
  const [genPhase,   setGenPhase]   = useState<GenPhase>('idle');
  const [renders,    setRenders]    = useState<GeneratorRender[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [activeRender, setActiveRender] = useState<GeneratorRender | null>(null);
  const [genError, setGenError] = useState('');

  // Upload
  const [uploadPhase,    setUploadPhase]    = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMsg,      setUploadMsg]      = useState('');
  const [dragOver,       setDragOver]       = useState(false);

  // Refs
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasZoneRef    = useRef<HTMLDivElement>(null);
  const isDraggingRef    = useRef(false);
  const fileInputRef     = useRef<HTMLInputElement>(null);

  const abortSignal = useAbortSignal();

  // ── Derived ──────────────────────────────────────────────────────────────────

  const currentPreset = CANVAS_PRESETS[preset];
  const aspectRatio   = currentPreset.width / currentPreset.height;

  const resolvedSource: PhotoUpload | null =
    sourceMode === 'selected'
      ? (uploads.find((u) => u.id === selectedUploadId) ?? null)
      : randomSource;

  const canGenerate =
    genPhase !== 'generating' &&
    (sourceMode === 'random'
      ? uploads.length === 0 || !!resolvedSource
      : !!selectedUploadId);

  const isGenerating = genPhase === 'generating';
  const isUploading  = uploadPhase === 'uploading';

  const logoOverlayCss = {
    position:     'absolute' as const,
    width:        `${placement.diameterRatio * 100}%`,
    aspectRatio:  '1',
    left:         `${(placement.xRatio - placement.diameterRatio / 2) * 100}%`,
    top:          `${(placement.yRatio - placement.diameterRatio * aspectRatio / 2) * 100}%`,
    borderRadius: '50%',
    overflow:     'hidden' as const,
    cursor:       'grab',
    touchAction:  'none' as const,
    boxShadow:    '0 2px 16px rgba(0,0,0,0.55)',
    zIndex:       2,
  };

  const latestRender = renders[0] ?? null;
  const displayRender = activeRender ?? latestRender;

  // ── Data load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const [origRes, histRes] = await Promise.allSettled([
        adminFetch<{ items: PhotoUpload[] }>('/api/admin/photos/list?type=originals', getToken, { signal: abortSignal }),
        adminFetch<{ renders: GeneratorRender[] }>('/api/admin/generator/list', getToken, { signal: abortSignal }),
      ]);

      if (origRes.status === 'fulfilled') {
        const items = origRes.value.items ?? [];
        setUploads(items);
        if (items.length > 0) {
          setRandomSource(items[Math.floor(Math.random() * items.length)]);
        }
      }
      setUploadsLoaded(true);

      if (histRes.status === 'fulfilled') {
        setRenders(histRes.value.renders ?? []);
      }
    })();
  }, [getToken, abortSignal]);

  // ── Canvas sizing via ResizeObserver ──────────────────────────────────────────

  useEffect(() => {
    const zone = canvasZoneRef.current;
    if (!zone) return;

    const compute = () => {
      const zoneW = zone.clientWidth;
      if (zoneW <= 0) return;
      // Use fixed zone heights matching the CSS constants — avoids relying on
      // clientHeight which may be 0 if the injected <style> hasn't been parsed yet.
      const zoneH = window.innerWidth >= 768 ? 320 : 260;
      const pad = 32; // 16px each side
      const availW = zoneW - pad;
      const availH = zoneH - pad;
      const ar = currentPreset.width / currentPreset.height;
      let w: number, h: number;
      if (ar > availW / availH) {
        w = availW;
        h = Math.round(w / ar);
      } else {
        h = availH;
        w = Math.round(h * ar);
      }
      setCanvasSize({ w: Math.max(80, w), h: Math.max(80, h) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(zone);
    return () => ro.disconnect();
  }, [currentPreset.width, currentPreset.height]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function shuffleRandom() {
    if (uploads.length === 0) return;
    setRandomSource(uploads[Math.floor(Math.random() * uploads.length)]);
  }

  const placementFromClientPos = useCallback((clientX: number, clientY: number) => {
    const el = canvasWrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPlacement((prev) =>
      clampPlacement({
        xRatio:        (clientX - rect.left) / rect.width,
        yRatio:        (clientY - rect.top)  / rect.height,
        diameterRatio: prev.diameterRatio,
      }),
    );
  }, []);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;
    placementFromClientPos(e.clientX, e.clientY);
  }, [placementFromClientPos]);

  const onLogoPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    isDraggingRef.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const onLogoPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    placementFromClientPos(e.clientX, e.clientY);
  }, [placementFromClientPos]);

  const onLogoPointerUp = useCallback(() => {
    setTimeout(() => { isDraggingRef.current = false; }, 50);
  }, []);

  async function uploadFile(file: File) {
    setUploadPhase('uploading');
    setUploadProgress(10);
    setUploadMsg('');

    const form = new FormData();
    form.append('file', file);
    setUploadProgress(30);

    try {
      const data = await adminFetch<{ upload: PhotoUpload }>('/api/admin/photos/upload', getToken, {
        method: 'POST',
        body: form,
        signal: abortSignal,
      });
      setUploadProgress(90);
      const upload = data.upload;
      setUploads((prev) => [upload, ...prev]);
      if (!randomSource) setRandomSource(upload);
      setUploadPhase('success');
      const thumbnailNote = upload.thumbnailStatus === 'failed'
        ? ` — thumbnail generation failed${upload.thumbnailError ? `: ${upload.thumbnailError}` : ''}`
        : '';
      setUploadMsg(`Uploaded: ${upload.fileName}${thumbnailNote}`);
      setUploadProgress(100);
    } catch (err) {
      if (isAbortError(err)) return;
      setUploadPhase('error');
      const cleanup = err instanceof AdminRequestError ? readBodyStringField(err.body, 'cleanup') : undefined;
      const base = err instanceof Error ? err.message : 'Upload failed';
      setUploadMsg(cleanup ? `${base} (storage cleanup: ${cleanup})` : base);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  // Only removes the upload from state once the API confirms `ok: true` — a
  // pending_cleanup / metadata_delete_failed response keeps it and surfaces
  // the error with a retry action instead of hiding the row.
  async function deleteUpload(id: string, storagePath: string, fileName: string) {
    try {
      await adminFetch<{ ok: true; status: 'deleted' }>('/api/admin/photos/delete', getToken, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'photoUploads', id }),
        signal: abortSignal,
      });
      setDeleteError((prev) => (prev?.id === id ? null : prev));
      setUploads((prev) => prev.filter((u) => u.id !== id));
      if (selectedUploadId === id) setSelectedUploadId(null);
      if (randomSource?.id === id) {
        const remaining = uploads.filter((u) => u.id !== id);
        setRandomSource(remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : null);
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setDeleteError({ id, storagePath, fileName, message: err instanceof Error ? err.message : 'Delete failed' });
    }
  }

  async function handleGenerate() {
    if (sourceMode === 'selected' && !selectedUploadId) return;
    if (sourceMode === 'random' && !randomSource && uploads.length > 0) {
      shuffleRandom(); return;
    }

    setShowExport(true);
    setActiveRender(null);
    setGenError('');
    setGenPhase('generating');

    try {
      const body = await adminFetch<{ render: GeneratorRender }>('/api/admin/generator/render', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceMode,
          sourcePhotoId: sourceMode === 'selected' ? selectedUploadId : randomSource?.id,
          canvasPreset: preset,
          logoAsset,
          placement,
          renderer: rendererPref,
        }),
        signal: abortSignal,
      });
      setActiveRender(body.render);
      setRenders((prev) => [body.render, ...prev.filter((render) => render.id !== body.render.id)]);
      setGenPhase('success');
    } catch (err) {
      if (isAbortError(err)) return;
      setGenPhase('error');
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    }
  }

  // ── Share handler ─────────────────────────────────────────────────────────────

  async function handleShare(r: GeneratorRender) {
    try {
      const blob = await fetch(r.renderDownloadURL).then((res) => res.blob());
      const file = new File([blob], `ntr-${r.id}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Not The Rug' });
      } else {
        await navigator.share({ title: 'Not The Rug', url: r.renderDownloadURL });
      }
    } catch {
      const link = document.createElement('a');
      link.href = r.renderDownloadURL;
      link.download = `ntr-${r.id}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{css}</style>
      <div className="ed" id="admin-gen-shell">

        <div className="ed-top" id="admin-gen-topbar">
          <div className="ed-top-l">
            <span className="ed-brand">NTR</span>
            <div className="ed-vsep" />
            <span className="ed-top-title">Admin</span>
          </div>
          <div className="ed-top-r">
            <span className="ed-email">{email}</span>
            <button className="ed-signout" onClick={() => void signOut()}>Sign Out</button>
          </div>
        </div>

        <nav className="ed-nav" id="admin-gen-nav">
          <a className="ed-nav-link" href="/admin/dashboard">Overview</a>
          <a className="ed-nav-link ed-nav-active" href="/admin/dashboard/generator">Generator</a>
        </nav>

        <div className="ed-body" id="admin-gen-body">
          <GeneratorCanvas
            canvasZoneRef={canvasZoneRef}
            canvasWrapperRef={canvasWrapperRef}
            canvasSize={canvasSize}
            resolvedSource={resolvedSource}
            uploadsLoaded={uploadsLoaded}
            uploadsCount={uploads.length}
            sourceMode={sourceMode}
            logoOverlayCss={logoOverlayCss}
            logoAsset={logoAsset}
            onCanvasClick={onCanvasClick}
            onLogoPointerDown={onLogoPointerDown}
            onLogoPointerMove={onLogoPointerMove}
            onLogoPointerUp={onLogoPointerUp}
            preset={preset}
            onSelectPreset={setPreset}
          />

          <GeneratorControls
            placement={placement}
            onPlacementSizeChange={(diameterRatio) => setPlacement((prev) => clampPlacement({ ...prev, diameterRatio }))}
            onResetPlacement={() => setPlacement(DEFAULT_LOGO_PLACEMENT)}
            logoAsset={logoAsset}
            onSelectLogo={setLogoAsset}
            sourceMode={sourceMode}
            onSourceModeChange={setSourceMode}
            uploads={uploads}
            uploadsLoaded={uploadsLoaded}
            randomSource={randomSource}
            onShuffle={shuffleRandom}
            selectedUploadId={selectedUploadId}
            onSelectUpload={setSelectedUploadId}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            rendererPref={rendererPref}
            onSelectRenderer={setRendererPref}
          />

          <div className="ed-gen-bar" id="admin-gen-bar">
            <button className="ed-gen-btn" disabled={!canGenerate} onClick={handleGenerate}>
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
            <button
              id="admin-gen-upload-cta"
              className="ed-upload-cta"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? 'Uploading…' : 'Upload Photo'}
            </button>
          </div>

          <GeneratorUploadPanel
            fileInputRef={fileInputRef}
            dragOver={dragOver}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onFileChange={onFileChange}
            onChooseClick={() => fileInputRef.current?.click()}
            isUploading={isUploading}
            uploadPhase={uploadPhase}
            uploadProgress={uploadProgress}
            uploadMsg={uploadMsg}
            uploads={uploads}
            visibleCount={visibleCount}
            onShowMore={() => setVisibleCount((n) => n + 20)}
            selectedUploadId={selectedUploadId}
            onSelectUpload={(id) => { setSourceMode('selected'); setSelectedUploadId(id); }}
            onRequestDelete={(u) => setPendingDelete({ id: u.id, storagePath: u.storagePath, fileName: u.fileName })}
            deleteError={deleteError}
            onRetryDelete={() => deleteError && void deleteUpload(deleteError.id, deleteError.storagePath, deleteError.fileName)}
            onDismissDeleteError={() => setDeleteError(null)}
          />
        </div>

        {showExport && (
          <GeneratorExportOverlay
            genPhase={genPhase}
            genError={genError}
            displayRender={displayRender}
            renders={renders}
            onClose={() => setShowExport(false)}
            onSelectRender={setActiveRender}
            onShare={handleShare}
          />
        )}

        {pendingDelete && (
          <DeleteConfirmModal
            fileName={pendingDelete.fileName}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              void deleteUpload(pendingDelete.id, pendingDelete.storagePath, pendingDelete.fileName);
              setPendingDelete(null);
            }}
          />
        )}

      </div>
    </>
  );
}

export default function AdminGeneratorPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <AdminGeneratorPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
