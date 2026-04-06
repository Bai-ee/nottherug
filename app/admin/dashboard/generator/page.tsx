'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User, getIdToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { PhotoUpload } from '@/lib/photos/types';
import {
  CANVAS_PRESETS,
  CANVAS_PRESET_ORDER,
  DEFAULT_CANVAS_PRESET,
  LOGO_ASSETS,
  LOGO_ASSET_ORDER,
  DEFAULT_LOGO_ASSET,
  DEFAULT_LOGO_PLACEMENT,
  clampPlacement,
  type CanvasPresetKey,
  type LogoAssetKey,
  type NormalizedLogoPlacement,
  type GeneratorRender,
} from '@/lib/generator/types';
import { PREVIEW_COVER_STYLE } from '@/lib/generator/fitUtils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #0C0F09; overflow: hidden; }

:root {
  --bg:   #0C0F09;
  --s0:   #111510;
  --s1:   #161B11;
  --s2:   #1A1F14;
  --bd0:  #1C2118;
  --bd1:  #252D1E;
  --bd2:  #333D2A;
  --t0:   #3A4532;
  --t1:   #4E5A42;
  --t2:   #7A9068;
  --t3:   #B4C89E;
  --t4:   #EEF4DB;
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
  background: rgba(10, 13, 8, 0.7);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.ed-confirm-modal {
  background: var(--s1);
  border: 1px solid var(--bd1);
  border-radius: 10px;
  padding: 24px;
  width: 100%;
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
type GenPhase     = 'idle' | 'generating' | 'success' | 'error';
type RendererPref = 'sharp' | 'ffmpeg';

// ─── Preset thumbnail dimensions ─────────────────────────────────────────────

function presetThumbSize(key: CanvasPresetKey): { w: number; h: number } {
  const maxH = 38;
  const p = CANVAS_PRESETS[key];
  const ar = p.width / p.height;
  const h = maxH;
  const w = Math.max(10, Math.round(h * ar));
  return { w, h };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminGeneratorPage() {
  const router = useRouter();
  const [user,         setUser]        = useState<User | null>(null);
  const [authChecked,  setAuthChecked] = useState(false);

  // Source
  const [sourceMode,       setSourceMode]       = useState<SourceMode>('random');
  const [uploads,          setUploads]          = useState<PhotoUpload[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [uploadsLoaded,    setUploadsLoaded]    = useState(false);
  const [randomSource,     setRandomSource]     = useState<PhotoUpload | null>(null);
  const [pendingDelete,    setPendingDelete]    = useState<{ id: string; storagePath: string; fileName: string } | null>(null);
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

  // ── Auth + data load ──────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser?.email) { router.push('/admin'); return; }
      const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
      if (!snap.exists()) { router.push('/admin'); return; }
      setUser(firebaseUser);
      setAuthChecked(true);

      const token = await getIdToken(firebaseUser, true);
      const headers = { Authorization: `Bearer ${token}` };

      const [origRes, histRes] = await Promise.all([
        fetch('/api/admin/photos/list?type=originals', { headers }),
        fetch('/api/admin/generator/list',             { headers }),
      ]);

      if (origRes.ok) {
        const data = await origRes.json();
        const items: PhotoUpload[] = data.items ?? [];
        setUploads(items);
        if (items.length > 0) {
          setRandomSource(items[Math.floor(Math.random() * items.length)]);
        }
      }
      setUploadsLoaded(true);

      if (histRes.ok) {
        const histData = await histRes.json();
        setRenders(histData.renders ?? []);
      }
    });
    return () => unsub();
  }, [router]);

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
  }, [currentPreset.width, currentPreset.height, authChecked]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function shuffleRandom() {
    if (uploads.length === 0) return;
    setRandomSource(uploads[Math.floor(Math.random() * uploads.length)]);
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push('/admin');
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
    if (!user) return;
    setUploadPhase('uploading');
    setUploadProgress(10);
    setUploadMsg('');

    let token: string;
    try { token = await getIdToken(user, true); }
    catch { setUploadPhase('error'); setUploadMsg('Auth error.'); return; }

    setUploadProgress(30);
    const form = new FormData();
    form.append('file', file);

    let res: Response;
    try {
      res = await fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    } catch { setUploadPhase('error'); setUploadMsg('Network error.'); return; }

    setUploadProgress(90);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUploadPhase('error');
      setUploadMsg(body.error ?? `Upload failed (${res.status})`);
      return;
    }

    const data = await res.json();
    const upload: PhotoUpload = data.upload;
    setUploads((prev) => [upload, ...prev]);
    if (!randomSource) setRandomSource(upload);
    setUploadPhase('success');
    setUploadMsg(`Uploaded: ${upload.fileName}`);
    setUploadProgress(100);
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

  async function deleteUpload(id: string, storagePath: string) {
    if (!user) return;
    const token = await getIdToken(user, true);
    await fetch('/api/admin/photos/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ collection: 'photoUploads', id, storagePath }),
    });
    setUploads((prev) => prev.filter((u) => u.id !== id));
    if (selectedUploadId === id) setSelectedUploadId(null);
    if (randomSource?.id === id) {
      const remaining = uploads.filter((u) => u.id !== id);
      setRandomSource(remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : null);
    }
  }

  async function handleGenerate() {
    if (!user) return;
    if (sourceMode === 'selected' && !selectedUploadId) return;
    if (sourceMode === 'random' && !randomSource && uploads.length > 0) {
      shuffleRandom(); return;
    }

    setShowExport(true);
    setActiveRender(null);
    setGenError('');
    setGenPhase('generating');

    let token: string;
    try { token = await getIdToken(user, true); }
    catch {
      setGenPhase('error');
      setGenError('Could not verify your admin session.');
      return;
    }

    let res: Response;
    try {
      res = await fetch('/api/admin/generator/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sourceMode,
          sourcePhotoId: sourceMode === 'selected' ? selectedUploadId : randomSource?.id,
          canvasPreset: preset,
          logoAsset,
          placement,
          renderer: rendererPref,
        }),
      });
    } catch {
      setGenPhase('error');
      setGenError('Network error while generating the image.');
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setGenPhase('error');
      setGenError(body.error ?? `Generation failed (${res.status})`);
      return;
    }

    const body = await res.json();
    setActiveRender(body.render);
    setRenders((prev) => [body.render, ...prev.filter((render) => render.id !== body.render.id)]);
    setGenPhase('success');
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

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (!authChecked) {
    return <div style={{ background: '#0C0F09', height: '100dvh' }} />;
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{css}</style>
      <div className="ed" id="admin-gen-shell">

        {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
        <div className="ed-top" id="admin-gen-topbar">
          <div className="ed-top-l">
            <span className="ed-brand">NTR</span>
            <div className="ed-vsep" />
            <span className="ed-top-title">Admin</span>
          </div>
          <div className="ed-top-r">
            <span className="ed-email">{user?.email}</span>
            <button className="ed-signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        {/* ── NAV BAR ────────────────────────────────────────────────────────── */}
        <nav className="ed-nav" id="admin-gen-nav">
          <a className="ed-nav-link" href="/admin/dashboard">Overview</a>
          <a className="ed-nav-link" href="/admin/dashboard/photos">Photos</a>
          <a className="ed-nav-link ed-nav-active" href="/admin/dashboard/generator">Generator</a>
          <a className="ed-nav-link" href="/admin/dashboard/brief">Brief</a>
        </nav>

        {/* ── BODY ───────────────────────────────────────────────────────────── */}
        <div className="ed-body" id="admin-gen-body">

          {/* ── CANVAS ZONE ────────────────────────────────────────────────── */}
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
                    {!uploadsLoaded ? '[loading]' : uploads.length === 0 ? '[no images]' : sourceMode === 'selected' ? '[select image]' : '[loading]'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PRESET STRIP ───────────────────────────────────────────────── */}
          <div className="ed-preset-strip" id="admin-gen-preset-strip">
            {CANVAS_PRESET_ORDER.map((key) => {
              const { w, h } = presetThumbSize(key);
              const p = CANVAS_PRESETS[key];
              return (
                <div
                  key={key}
                  className={`ed-preset-chip${preset === key ? ' ed-preset-chip-active' : ''}`}
                  onClick={() => setPreset(key)}
                >
                  <div className="ed-preset-thumb" style={{ width: w, height: h }} />
                  <div className="ed-preset-label">{p.aspectLabel}</div>
                  <div className="ed-preset-dim">{p.width}×{p.height}</div>
                </div>
              );
            })}
          </div>

          {/* ── CONTROLS PANEL ─────────────────────────────────────────────── */}
          <div className="ed-controls-panel" id="admin-gen-controls-panel">
            <div className="ed-controls-grid" id="admin-gen-controls-grid">

              {/* Logo section */}
              <div className="ed-section" id="admin-gen-section-logo">

                <div className="ed-size-row" id="admin-gen-size-row">
                  <span className="ed-size-lbl">Size</span>
                  <input
                    id="admin-gen-size-slider"
                    type="range"
                    min={5} max={60} step={1}
                    value={Math.round(placement.diameterRatio * 100)}
                    className="ed-size-range"
                    onChange={(e) =>
                      setPlacement((prev) =>
                        clampPlacement({ ...prev, diameterRatio: Number(e.target.value) / 100 }),
                      )
                    }
                  />
                  <span className="ed-size-val">{Math.round(placement.diameterRatio * 100)}%</span>
                  <button className="ed-reset-btn" onClick={() => setPlacement(DEFAULT_LOGO_PLACEMENT)}>Reset</button>
                </div>

                <div className="ed-logo-swatches" id="admin-gen-logo-swatches">
                  {LOGO_ASSET_ORDER.map((key) => {
                    const l = LOGO_ASSETS[key];
                    return (
                      <div
                        key={key}
                        className={`ed-logo-swatch${logoAsset === key ? ' ed-logo-swatch-active' : ''}`}
                        onClick={() => setLogoAsset(key)}
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

              {/* Source section */}
              <div className="ed-section" id="admin-gen-section-source">

                <div className="ed-seg" id="admin-gen-source-seg">
                  {(['random', 'selected'] as SourceMode[]).map((m) => (
                    <button
                      key={m}
                      className={`ed-seg-btn${sourceMode === m ? ' ed-seg-btn-active' : ''}`}
                      onClick={() => setSourceMode(m)}
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
                      <button className="ed-shuffle-btn" onClick={shuffleRandom}>Shuffle</button>
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
                          onClick={() => setSelectedUploadId(u.id)}
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

            {/* Advanced */}
            <div className="ed-section" id="admin-gen-section-advanced" style={{ borderBottom: 'none' }}>
              <button className="ed-advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
                {showAdvanced ? '▾' : '▸'} Advanced
              </button>
              {showAdvanced && (
                <div className="ed-renderer-row" id="admin-gen-renderer-row">
                  {(['sharp', 'ffmpeg'] as RendererPref[]).map((r) => (
                    <button
                      key={r}
                      className={`ed-renderer-btn${rendererPref === r ? ' ed-renderer-btn-active' : ''}`}
                      onClick={() => setRendererPref(r)}
                    >{r}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── GENERATE + UPLOAD BAR ──────────────────────────────────────── */}
          <div className="ed-gen-bar" id="admin-gen-bar">
            <button
              className="ed-gen-btn"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
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

          {/* ── UPLOAD SECTION ─────────────────────────────────────────────── */}
          <div className="ed-upload-section" id="admin-gen-upload-section">
            <div
              id="admin-gen-upload-zone"
              className={`ed-upload-zone${dragOver ? ' ed-upload-zone-drag' : ''}`}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="ed-upload-zone-icon">[↑]</div>
              <div className="ed-upload-zone-label">Tap to choose from camera roll or drag an image</div>
              <div className="ed-upload-zone-hint">JPEG · PNG · HEIC · camera library supported</div>
              {isUploading && (
                <div style={{ width: '100%', maxWidth: 280 }}>
                  <div className="ed-upload-prog-shell">
                    <div className="ed-upload-prog-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="ed-upload-prog-label">Uploading…</div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              className="ed-upload-input"
              type="file"
              accept="image/*"
              onChange={onFileChange}
            />

            {uploadPhase === 'success' && <div className="ed-upload-ok" id="admin-gen-upload-ok">{uploadMsg}</div>}
            {uploadPhase === 'error'   && <div className="ed-upload-err" id="admin-gen-upload-err">Error: {uploadMsg}</div>}

            {uploads.length > 0 && (
              <>
                <div className="ed-uploads-grid" id="admin-gen-uploads-grid">
                  {uploads.slice(0, visibleCount).map((u) => (
                    <div
                      key={u.id}
                      className={`ed-upload-item${selectedUploadId === u.id ? ' ed-upload-item-selected' : ''}`}
                      onClick={() => { setSourceMode('selected'); setSelectedUploadId(u.id); }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.thumbnailURL ?? u.downloadURL}
                        alt={u.fileName}
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        className="ed-upload-item-del"
                        onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: u.id, storagePath: u.storagePath, fileName: u.fileName }); }}
                      >✕</button>
                    </div>
                  ))}
                </div>
                {visibleCount < uploads.length && (
                  <button
                    className="ed-load-more"
                    id="admin-gen-load-more"
                    onClick={() => setVisibleCount((n) => n + 20)}
                  >
                    Load more ({uploads.length - visibleCount} remaining)
                  </button>
                )}
              </>
            )}
          </div>

        </div>

        {/* ── EXPORT OVERLAY ─────────────────────────────────────────────────── */}
        {showExport && (
          <div className="ed-export" id="admin-gen-export-overlay">
            <div className="ed-export-bar">
              <span className="ed-export-title">
                {genPhase === 'generating' ? 'Generating' : genPhase === 'error' ? 'Generation Issue' : 'Export'}
              </span>
              <button className="ed-export-back" onClick={() => setShowExport(false)}>← Back</button>
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
                    <button className="ed-export-share" onClick={() => setShowExport(false)}>
                      Close
                    </button>
                  </div>
                </div>
              )}
              {genPhase !== 'generating' && genPhase !== 'error' && displayRender && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayRender.renderDownloadURL} alt="Generated output" />
                </>
              )}
              <button className="ed-export-close" id="admin-gen-export-close" onClick={() => setShowExport(false)}>✕</button>
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
                    <button className="ed-export-share" onClick={() => handleShare(displayRender)}>
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
                        <div
                          key={r.id}
                          className="ed-history-thumb"
                          title={r.id}
                          onClick={() => setActiveRender(r)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.renderDownloadURL} alt="" />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRM DELETE MODAL ──────────────────────────────────────────── */}
        {pendingDelete && (
          <div className="ed-confirm-backdrop" id="admin-gen-confirm-backdrop" onClick={() => setPendingDelete(null)}>
            <div className="ed-confirm-modal" id="admin-gen-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ed-confirm-title">Delete photo?</div>
              <div className="ed-confirm-body">{pendingDelete.fileName}</div>
              <div className="ed-confirm-actions">
                <button className="ed-confirm-cancel" onClick={() => setPendingDelete(null)}>Cancel</button>
                <button
                  className="ed-confirm-delete"
                  onClick={() => { deleteUpload(pendingDelete.id, pendingDelete.storagePath); setPendingDelete(null); }}
                >Delete</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
