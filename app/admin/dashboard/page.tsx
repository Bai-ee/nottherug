'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CarouselApi } from '@/components/ui/carousel';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { adminFetch, useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';
import { DashboardSummary } from '@/components/admin/dashboard/DashboardSummary';
import { DashboardHistory } from '@/components/admin/dashboard/DashboardHistory';
import { buildHistoryOverview, buildLatestOverview } from '@/components/admin/dashboard/overview';
import type { BriefHistoryItem, LatestBriefResponse } from '@/components/admin/dashboard/types';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Outfit:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #55624C; }
body { font-family: 'Outfit', sans-serif; }

.db { --db-top-h: 48px; --db-nav-h: 51px; min-height: 100vh; background: #55624C; color: #EDF3DB; }
.db-top { position: sticky; top: 0; z-index: 30; height: var(--db-top-h); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid rgba(237,243,219,0.12); background: rgba(50,60,38,0.96); backdrop-filter: blur(12px); }
.db-top-l, .db-top-r { display: flex; align-items: center; gap: 14px; }
.db-brand, .db-nav-link, .db-email, .db-signout, .db-chip, .db-kicker, .db-note, .db-rail-date, .db-hero-meta, .db-meta { font-family: 'Space Mono', monospace; }
.db-brand { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(237,243,219,0.4); }
.db-vsep { width: 1px; height: 12px; background: rgba(237,243,219,0.15); }
.db-title { font-size: 14px; color: #EDF3DB; }
.db-email { display: none; font-size: 11px; color: rgba(237,243,219,0.4); }
.db-signout { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(237,243,219,0.4); border: none; background: none; cursor: pointer; }
.db-nav { position: sticky; top: var(--db-top-h); z-index: 29; display: flex; gap: 0; overflow-x: auto; min-height: var(--db-nav-h); padding: 0 20px; border-bottom: 1px solid rgba(237,243,219,0.12); background: rgba(50,60,38,0.96); backdrop-filter: blur(12px); }
.db-nav-link { display: block; padding: 12px 16px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; color: rgba(237,243,219,0.5); border-bottom: 2px solid transparent; white-space: nowrap; }
.db-nav-link-active { color: #EDF3DB; border-bottom-color: rgba(237,243,219,0.7); }
.db-page { max-width: 1280px; margin: 0 auto; padding: 20px 16px 72px; display: grid; gap: 18px; }

.db-hero { position: relative; overflow: hidden; border: 1px solid rgba(237,243,219,0.12); border-radius: 24px; background: #4A5640; min-height: 280px; }
.db-hero-bg, .db-hero-canvas, .db-hero-overlay { position: absolute; inset: 0; }
.db-hero-canvas { width: 100%; height: 100%; display: block; }
.db-hero-overlay { background:
  linear-gradient(180deg, rgba(50,62,38,0.12) 0%, rgba(50,62,38,0.34) 48%, rgba(50,62,38,0.88) 100%),
  linear-gradient(90deg, rgba(50,62,38,0.76) 0%, rgba(50,62,38,0.3) 46%, rgba(50,62,38,0.16) 100%);
}
.db-hero-inner { position: relative; z-index: 1; min-height: 280px; display: grid; grid-template-columns: 1fr; padding: 22px; gap: 18px; }
.db-hero-copy { display: grid; align-content: center; gap: 14px; }
.db-kicker { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(237,243,219,0.7); }
.db-heading { font-family: 'Fraunces', serif; font-size: clamp(36px, 7vw, 72px); line-height: 0.95; color: #EDF3DB; max-width: 9ch; }
.db-subhead { font-size: 15px; line-height: 1.7; color: rgba(237,243,219,0.82); max-width: 640px; }
.db-hero-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(237,243,219,0.5); }
.db-chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
.db-chip { display: inline-flex; align-items: center; min-height: 30px; padding: 6px 11px; border-radius: 999px; border: 1px solid rgba(237,243,219,0.2); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #EDF3DB; background: rgba(50,62,38,0.5); }
.db-chip-ready { border-color: rgba(237,243,219,0.35); color: #EDF3DB; }
.db-chip-review { border-color: rgba(232,212,168,0.34); color: #E8D4A8; }
.db-chip-error { border-color: rgba(196,103,75,0.32); color: #E9B5A6; }
.db-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.db-btn { min-height: 44px; padding: 11px 18px; border-radius: 999px; border: 1px solid rgba(237,243,219,0.2); background: rgba(50,62,38,0.9); color: #EDF3DB; cursor: pointer; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.db-btn-primary { background: #EDF3DB; border-color: transparent; color: #55624C; }
.db-btn:disabled { opacity: 0.6; cursor: default; }
.db-error { padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(196,103,75,0.25); background: rgba(196,103,75,0.08); color: #E8D4A8; font-size: 13px; line-height: 1.55; }

.db-hero-aside { display: grid; gap: 12px; align-content: center; }
.db-stat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.db-stat-card { padding: 16px; border-radius: 18px; border: 1px solid rgba(85,98,76,0.25); background: rgba(237,243,219,0.9); backdrop-filter: blur(10px); display: grid; gap: 6px; }
.db-stat-value { font-family: 'Fraunces', serif; font-size: 34px; line-height: 1; color: #55624C; }
.db-stat-copy { font-size: 13px; line-height: 1.55; color: #7A9068; }
.db-stat-copy span { display: block; }
.db-stat-copy strong { color: #3A4532; font-weight: 500; }

.db-band { display: grid; grid-template-columns: 1fr; gap: 18px; }
.db-panel { border: 1px solid rgba(85,98,76,0.2); border-radius: 20px; background: #EDF3DB; overflow: hidden; }
.db-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid rgba(85,98,76,0.15); }
.db-panel-title { font-family: 'Fraunces', serif; font-size: 21px; color: #55624C; }
.db-panel-body { padding: 18px; display: grid; gap: 14px; }
.db-note { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(85,98,76,0.6); }
.db-copy { font-size: 14px; line-height: 1.7; color: #7A9068; white-space: pre-line; }
.db-card-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.db-info-card { border: 1px solid rgba(85,98,76,0.18); border-radius: 16px; background: rgba(255,255,255,0.6); padding: 15px; display: grid; gap: 8px; }
.db-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(85,98,76,0.6); }
.db-value { font-size: 14px; line-height: 1.65; color: #55624C; }
.db-link { color: #55624C; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.db-link:hover { color: #3A4532; }
.db-post-package { display: grid; gap: 14px; }
.db-post-main { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; align-items: start; }
.db-post-copy-card { min-width: 0; max-width: 760px; }
.db-post-image-col { width: min(100%, 156px); max-width: 156px; display: grid; gap: 10px; align-content: start; justify-self: center; }
.db-post-image-wrap { border-radius: 18px; overflow: hidden; border: 1px solid rgba(85,98,76,0.18); background: rgba(85,98,76,0.06); }
.db-post-image { width: 100%; height: auto; display: block; }
.db-post-placeholder { width: 100%; aspect-ratio: 4 / 5; display: grid; place-items: center; padding: 18px; background:
  radial-gradient(circle at 30% 20%, rgba(85,98,76,0.12), transparent 34%),
  linear-gradient(180deg, #EDF3DB 0%, #D8E8C0 100%);
  color: #55624C; text-align: center; }
.db-post-placeholder-frame { width: min(82%, 260px); aspect-ratio: 4 / 5; border-radius: 16px; border: 1px dashed rgba(85,98,76,0.3); display: grid; place-items: center; padding: 16px; }
.db-post-placeholder-copy { display: grid; gap: 8px; }
.db-post-placeholder-title { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #55624C; }
.db-post-placeholder-note { font-size: 13px; line-height: 1.5; color: #6E8160; }
.db-post-placeholder-cta { display: inline-flex; align-items: center; justify-content: center; min-height: 34px; padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(85,98,76,0.3); background: rgba(85,98,76,0.9); color: #EDF3DB; text-decoration: none; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
.db-post-placeholder-cta:hover { background: #55624C; color: #EDF3DB; }
.db-post-actions { display: grid; gap: 8px; }
.db-post-actions .db-btn { width: 100%; justify-content: center; display: inline-flex; align-items: center; }

.db-intel-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.db-intel-grid .db-label { font-family: 'Fraunces', serif; font-size: 17px; letter-spacing: 0.01em; text-transform: none; color: #55624C; line-height: 1.2; }
.db-intel-list { display: grid; gap: 10px; }
.db-intel-item { border-top: 1px solid rgba(85,98,76,0.15); padding-top: 10px; display: grid; gap: 5px; }
.db-intel-item:first-child { border-top: none; padding-top: 0; }
.db-intel-name { font-size: 13px; font-weight: 500; color: #55624C; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.db-platform-badge { font-size: 9px; font-family: 'Space Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 5px; border-radius: 3px; background: rgba(85,98,76,0.12); color: rgba(85,98,76,0.75); flex-shrink: 0; align-self: center; }
.db-platform-badge[data-platform="tiktok"] { background: rgba(0,0,0,0.07); color: #1a1a1a; }
.db-platform-badge[data-platform="instagram"] { background: rgba(131,58,180,0.1); color: #833ab4; }
.db-platform-badge[data-platform="youtube"] { background: rgba(255,0,0,0.08); color: #cc0000; }
.db-platform-badge[data-platform="x"] { background: rgba(0,0,0,0.07); color: #555; }
.db-platform-badge[data-platform="reddit"] { background: rgba(255,69,0,0.1); color: #c44200; }
.db-intel-body { font-size: 13px; line-height: 1.55; color: #7A9068; }
.db-intel-takeaway { font-size: 12px; line-height: 1.55; color: rgba(85,98,76,0.7); border-left: 2px solid rgba(85,98,76,0.3); padding-left: 8px; }
.db-empty { font-size: 13px; color: rgba(85,98,76,0.5); font-style: italic; }

.db-rail { border: 1px solid rgba(85,98,76,0.2); border-radius: 18px; background: #EDF3DB; padding: 16px; display: grid; gap: 12px; }
.db-rail-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
.db-rail-card { flex: 0 0 auto; width: 172px; border-radius: 14px; border: 1px solid rgba(85,98,76,0.18); background: transparent; overflow: hidden; }
.db-rail-item { width: 100%; padding: 12px 14px; border: none; background: transparent; text-align: left; cursor: pointer; display: grid; gap: 8px; }
.db-rail-item-active { background: rgba(85,98,76,0.12); }
.db-rail-score { font-family: 'Fraunces', serif; font-size: 30px; line-height: 1; color: #55624C; }
.db-rail-date { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #7A9068; }
.db-rail-copy { font-size: 12px; line-height: 1.45; color: #7A9068; }
.db-rail-thumb { width: 100%; aspect-ratio: 4 / 5; border-radius: 10px; overflow: hidden; border: 1px solid rgba(85,98,76,0.18); background: rgba(85,98,76,0.08); }
.db-rail-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.db-rail-thumb-empty { width: 100%; aspect-ratio: 4 / 5; border-radius: 10px; border: 1px dashed rgba(85,98,76,0.2); display: grid; place-items: center; padding: 10px; text-align: center; background:
  radial-gradient(circle at 30% 20%, rgba(85,98,76,0.1), transparent 36%),
  linear-gradient(180deg, #EDF3DB 0%, #D8E8C0 100%); color: rgba(85,98,76,0.5); }
.db-rail-thumb-empty span { display: grid; gap: 6px; }
.db-rail-thumb-empty strong { font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(85,98,76,0.6); font-weight: 400; }
.db-rail-thumb-empty em { font-size: 11px; line-height: 1.4; color: rgba(85,98,76,0.5); font-style: normal; }
.db-rail-actions { display: flex; gap: 0; border-top: 1px solid rgba(85,98,76,0.18); }
.db-rail-action { flex: 1; min-height: 34px; display: inline-flex; align-items: center; justify-content: center; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #55624C; text-decoration: none; background: transparent; border: 0; cursor: pointer; }
.db-rail-action + .db-rail-action { border-left: 1px solid rgba(85,98,76,0.18); }
.db-rail-action:hover { color: #3A4532; background: rgba(85,98,76,0.08); }

/* ── INSTAGRAM POST CARD ─────────────────────────────────────────────────── */
.ig-card { background: #fff; border: 1px solid rgba(85,98,76,0.15); border-radius: 12px; overflow: hidden; width: 100%; }
.ig-header { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
.ig-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, #55624C 0%, #7A9068 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #7A9068; }
.ig-avatar-initials { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #EDF3DB; letter-spacing: 0.02em; }
.ig-header-info { flex: 1; min-width: 0; }
.ig-username { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; color: #0a0a0a; line-height: 1.2; }
.ig-location { font-family: 'Outfit', sans-serif; font-size: 11px; color: rgba(0,0,0,0.4); line-height: 1.2; }
.ig-more { font-size: 18px; color: rgba(0,0,0,0.45); background: none; border: none; cursor: default; padding: 0 2px; line-height: 1; letter-spacing: 1px; }
.ig-image { width: 100%; aspect-ratio: 1 / 1; overflow: hidden; background: #f3f3f3; }
.ig-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ig-image-ph { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; background: linear-gradient(180deg, #EDF3DB 0%, #D8E8C0 100%); }
.ig-image-ph-icon { opacity: 0.25; }
.ig-image-ph-text { font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(85,98,76,0.7); text-align: center; line-height: 1.6; }
.ig-image-ph-cta { display: inline-flex; align-items: center; justify-content: center; padding: 7px 14px; border-radius: 6px; background: #55624C; color: #EDF3DB; font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; text-decoration: none; }
.ig-actions { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px 4px; }
.ig-act-left { display: flex; align-items: center; gap: 14px; }
.ig-icon-btn { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: default; padding: 0; color: #0a0a0a; }
.ig-icon-btn svg { width: 22px; height: 22px; }
.ig-caption { padding: 2px 12px 6px; font-family: 'Outfit', sans-serif; font-size: 13px; line-height: 1.6; color: #262626; overflow-wrap: break-word; word-break: break-word; }
.ig-caption-user { font-weight: 700; color: #0a0a0a; margin-right: 5px; }
.ig-timestamp { padding: 2px 12px 12px; font-family: 'Outfit', sans-serif; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(0,0,0,0.3); }
.ig-post-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }

/* ── PLATFORM CAROUSEL (Embla) ───────────────────────────────────────────── */
.carousel-shell { display: flex; flex-direction: column; gap: 10px; overflow: hidden; min-width: 0; }
/* Track: explicit width=100% so slide width % resolves correctly */
.platform-track { width: 100%; }
/* Mobile: each slide = full track width */
.platform-slot { flex: none; width: 100%; min-width: 0; overflow: hidden; display: flex; flex-direction: column; gap: 6px; }
/* 640px+: 45% slides with gap → centered card shows ~22% peek on each side */
@media (min-width: 640px) {
  .platform-track { gap: 20px; }
  .platform-slot { width: 45%; }
}
.platform-label { font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(85,98,76,0.6); padding: 0 2px; }
/* Footer: prev arrow · dots · next arrow — sits below the track */
.carousel-footer { display: flex; align-items: center; justify-content: center; gap: 10px; }
.carousel-arrow { width: 32px; height: 32px; border-radius: 50%; background: #55624C; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #EDF3DB; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: opacity 0.15s, background 0.15s; flex-shrink: 0; }
.carousel-arrow:hover { background: #3A4532; }
.carousel-arrow:disabled { opacity: 0.2; cursor: default; pointer-events: none; }
.carousel-dots { display: flex; justify-content: center; align-items: center; gap: 7px; }
.carousel-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(85,98,76,0.22); border: none; cursor: pointer; padding: 0; transition: background 0.2s, transform 0.2s; }
.carousel-dot.active { background: #55624C; transform: scale(1.35); cursor: default; }

/* ── TWITTER/X POST CARD ─────────────────────────────────────────────────── */
.tw-card { background: #fff; border: 1px solid rgba(0,0,0,0.12); border-radius: 12px; overflow: hidden; width: 100%; }
.tw-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 6px; }
.tw-avatar-wrap { display: flex; align-items: center; gap: 10px; }
.tw-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #55624C 0%, #7A9068 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tw-avatar-initials { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700; color: #EDF3DB; }
.tw-name { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #0f1419; line-height: 1.2; }
.tw-handle { font-family: 'Outfit', sans-serif; font-size: 13px; color: rgba(0,0,0,0.45); line-height: 1.2; }
.tw-x-logo { color: #0f1419; flex-shrink: 0; }
.tw-body { padding: 4px 14px 10px; font-family: 'Outfit', sans-serif; font-size: 14px; line-height: 1.55; color: #0f1419; overflow-wrap: break-word; word-break: break-word; }
.tw-image { width: 100%; aspect-ratio: 1 / 1; overflow: hidden; background: #f7f9fa; border-top: 1px solid rgba(0,0,0,0.06); border-bottom: 1px solid rgba(0,0,0,0.06); }
.tw-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tw-image-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.tw-actions { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px 12px; }
.tw-act-btn { display: flex; align-items: center; gap: 5px; background: none; border: none; cursor: default; color: rgba(0,0,0,0.4); font-family: 'Outfit', sans-serif; font-size: 12px; padding: 0; }
.tw-act-btn svg { width: 18px; height: 18px; }

/* ── FACEBOOK POST CARD ──────────────────────────────────────────────────── */
.fb-card { background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden; width: 100%; }
.fb-header { display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px; }
.fb-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #55624C 0%, #7A9068 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fb-avatar-initials { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700; color: #EDF3DB; }
.fb-name { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #050505; line-height: 1.2; }
.fb-meta { font-family: 'Outfit', sans-serif; font-size: 11px; color: rgba(0,0,0,0.4); }
.fb-body { padding: 0 14px 10px; font-family: 'Outfit', sans-serif; font-size: 14px; line-height: 1.55; color: #050505; overflow-wrap: break-word; word-break: break-word; }
.fb-image { width: 100%; aspect-ratio: 1 / 1; overflow: hidden; background: #f0f2f5; }
.fb-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fb-image-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.fb-reactions { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px 4px; font-family: 'Outfit', sans-serif; font-size: 12px; color: rgba(0,0,0,0.45); }
.fb-btn-row { display: flex; border-top: 1px solid rgba(0,0,0,0.1); }
.fb-btn { flex: 1; min-height: 36px; display: flex; align-items: center; justify-content: center; gap: 5px; background: none; border: none; cursor: default; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; color: rgba(0,0,0,0.5); padding: 0; }
.fb-btn + .fb-btn { border-left: 1px solid rgba(0,0,0,0.1); }
.fb-btn svg { width: 18px; height: 18px; }

@media (min-width: 900px) {
  .db-email { display: block; }
  .db-page { padding: 24px 24px 96px; }
  .db-hero-inner { grid-template-columns: minmax(0, 1.6fr) minmax(300px, 360px); padding: 28px; }
  .db-band { grid-template-columns: minmax(0, 1.15fr) minmax(340px, 420px); align-items: start; }
  .db-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .db-intel-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 1280px) {
  /* Embla deactivated — all 3 cards sit side-by-side with gap */
  .carousel-footer { display: none; }
  .platform-track { gap: 24px; }
  .platform-slot { width: calc(33.333% - 16px); }
}
`;

function AdminDashboardPageContent({
  email,
  getToken,
  signOut,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<LatestBriefResponse | null>(null);
  const [history, setHistory] = useState<BriefHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);

  const abortSignal = useAbortSignal();

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    carouselApi.on('reInit', onSelect);
    return () => { carouselApi.off('select', onSelect); carouselApi.off('reInit', onSelect); };
  }, [carouselApi]);

  // Named, reusable version for runBrief below (an event-driven callback, not
  // an effect, so it may set state directly).
  const fetchOverview = useCallback(async () => {
    try {
      const [latestData, historyData] = await Promise.all([
        adminFetch<LatestBriefResponse>('/admin/not-the-rug/latest-brief', getToken, { cache: 'no-store', signal: abortSignal }),
        adminFetch<{ runs?: BriefHistoryItem[] }>('/admin/not-the-rug/history?limit=14', getToken, { cache: 'no-store', signal: abortSignal })
          .catch(() => ({ runs: [] })),
      ]);
      setLatest(latestData);
      setHistory(historyData.runs ?? []);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [getToken, abortSignal]);

  // Inlined rather than calling fetchOverview() by name: an effect that
  // directly calls a separately-defined function which sets state triggers
  // React's set-state-in-effect check. This is the one-time mount load;
  // runBrief calls the named fetchOverview() from its own event handler.
  useEffect(() => {
    (async () => {
      try {
        const [latestData, historyData] = await Promise.all([
          adminFetch<LatestBriefResponse>('/admin/not-the-rug/latest-brief', getToken, { cache: 'no-store', signal: abortSignal }),
          adminFetch<{ runs?: BriefHistoryItem[] }>('/admin/not-the-rug/history?limit=14', getToken, { cache: 'no-store', signal: abortSignal })
            .catch(() => ({ runs: [] })),
        ]);
        setLatest(latestData);
        setHistory(historyData.runs ?? []);
      } catch (err) {
        if (isAbortError(err)) return;
        setError(err instanceof Error ? err.message : 'Could not load dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, abortSignal]);

  const runBrief = useCallback(async (fresh: boolean) => {
    setRunning(true);
    setError('');
    try {
      await adminFetch('/admin/not-the-rug/run-brief', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fresh }),
        signal: abortSignal,
      });
      setSelectedHistoryId(null);
      setLoading(true);
      await fetchOverview();
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Brief run failed.');
    } finally {
      setRunning(false);
    }
  }, [fetchOverview, getToken, abortSignal]);

  const downloadRunHtml = useCallback(async (runId: string) => {
    setDownloadingRunId(runId);
    setError('');
    try {
      const token = await getToken();
      const response = await fetch(`/admin/not-the-rug/history/${encodeURIComponent(runId)}/html`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: abortSignal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTML brief download failed (${response.status})`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const fileName = disposition.match(/filename="([^"]+)"/i)?.[1] ?? `not-the-rug-brief-${runId}.html`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Could not download this HTML brief.');
    } finally {
      setDownloadingRunId(null);
    }
  }, [getToken, abortSignal]);

  const latestOverview = useMemo(() => buildLatestOverview(latest, history), [latest, history]);
  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );
  const active = useMemo(
    () => (selectedHistory ? buildHistoryOverview(selectedHistory) : latestOverview),
    [latestOverview, selectedHistory],
  );

  return (
    <>
      <style>{css}</style>
      <div className="db">
        <div className="db-top">
          <div className="db-top-l">
            <span className="db-brand">NTR</span>
            <div className="db-vsep" />
            <span className="db-title">Not The Rug · Daily Brief</span>
          </div>
          <div className="db-top-r">
            <span className="db-email">{email}</span>
            <button className="db-signout" onClick={() => void signOut()}>Sign Out</button>
          </div>
        </div>

        <nav className="db-nav">
          <a className="db-nav-link db-nav-link-active" href="/admin/dashboard">Overview</a>
          <a className="db-nav-link" href="/admin/dashboard/generator">Generator</a>
          <a className="db-nav-link" href="/admin/dashboard/leads">Leads</a>
          <a className="db-nav-link" href="/admin/dashboard/preview/founder-brief">Founder Brief</a>
        </nav>

        <div className="db-page">
          <DashboardSummary
            active={active}
            latest={latest}
            error={error}
            isHistorical={!!selectedHistory}
            carouselIndex={carouselIndex}
            setCarouselApi={setCarouselApi}
            onSelectSlide={(i) => carouselApi?.scrollTo(i)}
          />

          <DashboardHistory
            history={history}
            loading={loading}
            selectedHistoryId={selectedHistoryId}
            onSelectHistory={setSelectedHistoryId}
            running={running}
            onRunBrief={runBrief}
            downloadingRunId={downloadingRunId}
            onDownloadHtml={downloadRunHtml}
          />
        </div>
      </div>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <AdminDashboardPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
