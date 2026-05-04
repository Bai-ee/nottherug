'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User, getIdToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';

interface BriefSummary {
  latestRunAt: string | null;
  scoutStatus: string | null;
  contentStatus: string | null;
  readyToPublish: boolean | null;
  qualityScore: number | null;
  scoutPriorityAction: string | null;
  weatherImpact: string | null;
  reviewInsights: Array<{
    source: string;
    insight: string;
    takeaway: string;
    url: string;
  }>;
  competitorIntel: Array<{
    competitor: string;
    finding: string;
    impact: string;
    url: string;
  }>;
  relationshipSignals: Array<{
    name: string;
    summary: string;
    priority: string;
    type: string;
    url: string;
  }>;
  localEvents: Array<{
    event: string;
    date: string;
    impact: string;
    opportunity: string;
    url: string;
  }>;
  primarySignals: Array<{
    title: string;
    detail: string;
    relevance: string;
  }>;
  redditSignals: Array<{
    title: string;
    subreddit: string;
    summary: string;
    takeaway: string;
    url: string;
  }>;
  brandMentions: Array<{
    source: string;
    author: string;
    content: string;
    url: string;
  }>;
  contentOpportunities: Array<{
    title: string;
    summary: string;
    priority: string;
    format: string;
    source: string;
    url: string;
  }>;
  contentAngle: string | null;
}

interface LatestBriefResponse {
  summary: BriefSummary;
  generatedImage: {
    renderId: string;
    renderDownloadURL: string;
    renderStoragePath: string;
    canvasPreset: string;
    logoAsset: string;
    sourcePhotoId: string;
    sourceStoragePath: string;
  } | null;
  latestBrief: {
    timestamp?: string;
    status?: string;
  } | null;
  latestContent: {
    timestamp?: string;
    status?: string;
    content?: Record<string, string | null>;
    guardianFlags?: {
      readyToPublish?: boolean;
      overallScore?: number | null;
    } | null;
  } | null;
  leadStats?: LeadStatsSummary | null;
}

interface LeadStatsSummary {
  rangeDays: number;
  timezone: string;
  today: { dateLabel: string; count: number };
  yesterday: { dateLabel: string; count: number };
  totals: { allTime: number; last7Days: number; last30Days: number };
  byDay?: Array<{ date: string; count: number }>;
  bySource?: Record<string, number>;
}

interface StageCost {
  stage: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
}

interface RunCostSummary {
  totalEstimatedUsd: number;
  aiEstimatedUsd: number;
  firebaseEstimatedUsd?: number;
  stageCosts?: StageCost[];
}

interface BriefHistoryItem {
  id: string;
  createdAt: string;
  status: 'success' | 'error';
  readyToPublish: boolean | null;
  qualityScore: number | null;
  scoutPriorityAction: string | null;
  weatherImpact: string | null;
  reviewInsights: BriefSummary['reviewInsights'];
  competitorIntel?: BriefSummary['competitorIntel'];
  relationshipSignals?: BriefSummary['relationshipSignals'];
  localEvents?: BriefSummary['localEvents'];
  primarySignals?: BriefSummary['primarySignals'];
  redditSignals: BriefSummary['redditSignals'];
  brandMentions?: BriefSummary['brandMentions'];
  contentOpportunities?: BriefSummary['contentOpportunities'];
  contentAngle: string | null;
  content: Record<string, string | null> | null;
  generatedImage?: LatestBriefResponse['generatedImage'] | null;
  runCost?: RunCostSummary | null;
}

interface OverviewRun {
  id: string;
  createdAt: string | null;
  status: string | null;
  readyToPublish: boolean | null;
  qualityScore: number | null;
  scoutPriorityAction: string | null;
  weatherImpact: string | null;
  reviewInsights: BriefSummary['reviewInsights'];
  competitorIntel: BriefSummary['competitorIntel'];
  relationshipSignals: BriefSummary['relationshipSignals'];
  localEvents: BriefSummary['localEvents'];
  primarySignals: BriefSummary['primarySignals'];
  redditSignals: BriefSummary['redditSignals'];
  brandMentions: BriefSummary['brandMentions'];
  contentOpportunities: BriefSummary['contentOpportunities'];
  contentAngle: string | null;
  content: Record<string, string | null> | null;
  generatedImage: LatestBriefResponse['generatedImage'] | null;
  runCost: RunCostSummary | null;
}

type WeatherKey = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'default';
type CloudPuff = [number, number, number, number];
type CloudBank = { x: number; y: number; vx: number; depth: number; puffs: CloudPuff[] };
type RainDrop = { x: number; y: number; vx: number; vy: number; len: number; w: number; a: number };
type SnowFlake = { x: number; y: number; vy: number; r: number; phase: number; ps: number; a: number };

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

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No runs yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

function formatCompactDate(value: string | null | undefined): string {
  if (!value) return 'No run';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatUsd(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 0.01 ? 4 : 2 }).format(value);
}

function truncate(value: string | null | undefined, limit = 160): string {
  if (!value) return 'No note for this run.';
  return value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;
}

function extractWeatherDisplay(input: string | null | undefined): { headline: string; lineOne: string; lineTwo: string } {
  const value = (input ?? '').trim();
  if (!value) {
    return {
      headline: 'n/a',
      lineOne: 'Weather impact unavailable for this run.',
      lineTwo: '',
    };
  }

  const tempMatch = value.match(/(?:max temp|temp)\s+(-?\d+)\s*F\b/i) || value.match(/\b(-?\d+)\s*F\b/i);
  const precipMatch = value.match(/(?:max precip|precip(?:itation)?(?: chance)?)\s+(\d+)%/i) || value.match(/up to\s+(\d+)%\s+precip/i);
  const windMatch = value.match(/(?:max wind|winds? up to)\s+(\d+)\s*mph/i) || value.match(/\b(\d+)\s*mph\b/i);
  const timeMatch = value.match(/\b\d{1,2}:\d{2}\s(?:AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s(?:AM|PM)\b/i);
  const segments = value.split('·').map((segment) => segment.trim()).filter(Boolean);
  const location = segments.find((segment) =>
    !/\d{1,2}:\d{2}\s(?:AM|PM)/i.test(segment)
    && !/(?:max temp|max precip|max wind|\d+\s*F\b|\d+\s*mph\b)/i.test(segment)
    && !/(?:sun|clear|bright|cloud|overcast|fog|mist|rain|drizzle|showers|storm|thunder|snow|ice)/i.test(segment)
  ) ?? '';
  const condition = segments.find((segment) => /(sun|clear|bright|cloud|overcast|fog|mist|rain|drizzle|showers|storm|thunder|snow|ice)/i.test(segment))
    ?? '';

  const temp = tempMatch ? `${tempMatch[1]}F` : null;
  const lineOne = [location, timeMatch ? timeMatch[0].replace(/\s*[–-]\s*/i, '–') : ''].filter(Boolean).join(' · ');
  const lineTwo = [
    condition,
    precipMatch ? `${precipMatch[1]}% precip` : null,
    windMatch ? `${windMatch[1]} mph wind` : null,
  ].filter(Boolean);

  return {
    headline: temp ?? 'n/a',
    lineOne: lineOne || value,
    lineTwo: lineTwo.join(' · '),
  };
}

function getWeatherKey(input: string | null | undefined): WeatherKey {
  const value = (input ?? '').toLowerCase();
  if (value.includes('storm') || value.includes('thunder')) return 'storm';
  if (/\b(snow|snowing|snowy|ice|icy|sleet|flurries)\b/.test(value)) return 'snow';
  if (value.includes('rain') || value.includes('drizzle') || value.includes('showers')) return 'rain';
  if (value.includes('cloud') || value.includes('overcast') || value.includes('fog') || value.includes('mist')) return 'cloudy';
  if (value.includes('sun') || value.includes('clear') || value.includes('bright')) return 'sunny';
  return 'default';
}

function drawSkyBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, weatherKey: WeatherKey) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  if (weatherKey === 'sunny') {
    g.addColorStop(0, '#FFDE95');
    g.addColorStop(0.25, '#EFAE63');
    g.addColorStop(0.6, '#5D7FA0');
    g.addColorStop(1, '#15222A');
  } else if (weatherKey === 'cloudy') {
    g.addColorStop(0, '#8C98A3');
    g.addColorStop(0.35, '#63717E');
    g.addColorStop(0.7, '#36414D');
    g.addColorStop(1, '#182027');
  } else if (weatherKey === 'rain') {
    g.addColorStop(0, '#657B89');
    g.addColorStop(0.35, '#435764');
    g.addColorStop(0.72, '#24343E');
    g.addColorStop(1, '#0E151A');
  } else if (weatherKey === 'storm') {
    g.addColorStop(0, '#505974');
    g.addColorStop(0.3, '#343A56');
    g.addColorStop(0.65, '#1B2033');
    g.addColorStop(1, '#090B12');
  } else if (weatherKey === 'snow') {
    g.addColorStop(0, '#CBD8E3');
    g.addColorStop(0.36, '#9AAEBC');
    g.addColorStop(0.7, '#5F7482');
    g.addColorStop(1, '#22303A');
  } else {
    g.addColorStop(0, '#B8C4A4');
    g.addColorStop(0.4, '#6A7D62');
    g.addColorStop(1, '#1B241B');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const haze = ctx.createLinearGradient(0, height * 0.38, 0, height);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, weatherKey === 'sunny' ? 'rgba(252,214,156,0.18)' : 'rgba(218,230,240,0.14)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
}

function drawSunScene(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const sx = width * 0.78;
  const sy = height * 0.2;
  const pulse = 1 + Math.sin(time * 0.7) * 0.03;

  const atmosphere = ctx.createRadialGradient(sx, sy, 0, sx, sy, width * 0.7);
  atmosphere.addColorStop(0, 'rgba(255,238,181,0.55)');
  atmosphere.addColorStop(0.22, 'rgba(255,204,118,0.22)');
  atmosphere.addColorStop(0.55, 'rgba(255,174,78,0.08)');
  atmosphere.addColorStop(1, 'rgba(255,166,66,0)');
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(sx, sy);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + time * 0.08;
    const spread = 0.16;
    const len = width * 1.2;
    ctx.save();
    ctx.rotate(angle);
    const beam = ctx.createLinearGradient(0, 0, len, 0);
    beam.addColorStop(0, 'rgba(255,231,165,0.14)');
    beam.addColorStop(0.12, 'rgba(255,208,109,0.09)');
    beam.addColorStop(0.45, 'rgba(255,184,79,0.02)');
    beam.addColorStop(1, 'rgba(255,184,79,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, -spread, spread);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 58 * pulse);
  core.addColorStop(0, 'rgba(255,252,227,1)');
  core.addColorStop(0.25, 'rgba(255,229,154,0.95)');
  core.addColorStop(0.65, 'rgba(255,202,96,0.55)');
  core.addColorStop(1, 'rgba(255,184,66,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sx, sy, 58 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudBank(ctx: CanvasRenderingContext2D, bank: CloudBank, tint: { inner: string; outer: string }) {
  for (const [dx, dy, r, alpha] of bank.puffs) {
    const px = bank.x + dx;
    const py = bank.y + dy;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, r);
    gradient.addColorStop(0, tint.inner.replace('__A__', String(alpha * (0.9 + bank.depth * 0.25))));
    gradient.addColorStop(0.55, tint.outer.replace('__A__', String(alpha * 0.5)));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHorizon(ctx: CanvasRenderingContext2D, width: number, height: number, weatherKey: WeatherKey) {
  const ridgeFill = ctx.createLinearGradient(0, height * 0.66, 0, height);
  if (weatherKey === 'sunny') {
    ridgeFill.addColorStop(0, 'rgba(30,48,45,0.22)');
    ridgeFill.addColorStop(1, 'rgba(8,14,16,0.72)');
  } else if (weatherKey === 'rain' || weatherKey === 'storm') {
    ridgeFill.addColorStop(0, 'rgba(34,50,58,0.2)');
    ridgeFill.addColorStop(1, 'rgba(4,8,10,0.82)');
  } else {
    ridgeFill.addColorStop(0, 'rgba(32,46,52,0.18)');
    ridgeFill.addColorStop(1, 'rgba(8,12,14,0.78)');
  }

  const water = ctx.createLinearGradient(0, height * 0.72, 0, height);
  water.addColorStop(0, 'rgba(255,255,255,0)');
  water.addColorStop(0.3, weatherKey === 'sunny' ? 'rgba(255,211,148,0.08)' : 'rgba(173,197,214,0.06)');
  water.addColorStop(1, 'rgba(4,8,10,0.76)');
  ctx.fillStyle = water;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  const ridge = new Path2D();
  ridge.moveTo(0, height);
  ridge.lineTo(0, height * 0.78);
  ridge.bezierCurveTo(width * 0.1, height * 0.7, width * 0.18, height * 0.83, width * 0.3, height * 0.74);
  ridge.bezierCurveTo(width * 0.4, height * 0.66, width * 0.5, height * 0.82, width * 0.64, height * 0.73);
  ridge.bezierCurveTo(width * 0.75, height * 0.66, width * 0.85, height * 0.8, width, height * 0.7);
  ridge.lineTo(width, height);
  ridge.closePath();
  ctx.fillStyle = ridgeFill;
  ctx.fill(ridge);

  const foreground = new Path2D();
  foreground.moveTo(0, height);
  foreground.lineTo(0, height * 0.86);
  foreground.bezierCurveTo(width * 0.16, height * 0.8, width * 0.26, height * 0.93, width * 0.42, height * 0.84);
  foreground.bezierCurveTo(width * 0.55, height * 0.78, width * 0.7, height * 0.95, width * 0.84, height * 0.86);
  foreground.bezierCurveTo(width * 0.92, height * 0.82, width * 0.97, height * 0.88, width, height * 0.84);
  foreground.lineTo(width, height);
  foreground.closePath();
  ctx.fillStyle = weatherKey === 'sunny' ? 'rgba(11,18,18,0.54)' : 'rgba(8,12,14,0.64)';
  ctx.fill(foreground);

  const groundGlow = ctx.createLinearGradient(0, height * 0.72, 0, height);
  groundGlow.addColorStop(0, 'rgba(255,255,255,0)');
  groundGlow.addColorStop(1, weatherKey === 'rain' ? 'rgba(112,160,178,0.12)' : 'rgba(255,223,156,0.06)');
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, height * 0.68, width, height * 0.32);
}

function createCloudBanks(width: number, height: number, dense = false): CloudBank[] {
  const scale = dense ? 1.2 : 1;
  return [
    { x: width * 0.04, y: height * 0.2, vx: 0.12, depth: 0.1, puffs: [[-80, 0, 115 * scale, 0.22], [-5, -48, 95 * scale, 0.17], [70, -18, 108 * scale, 0.19], [154, 9, 84 * scale, 0.15]] },
    { x: width * 0.5, y: height * 0.1, vx: 0.08, depth: 0.2, puffs: [[-64, 0, 88 * scale, 0.16], [0, -34, 72 * scale, 0.14], [62, -18, 82 * scale, 0.15], [126, 4, 66 * scale, 0.11]] },
    { x: width * 0.72, y: height * 0.38, vx: 0.16, depth: 0.3, puffs: [[-72, 0, 100 * scale, 0.18], [-10, -42, 80 * scale, 0.15], [52, -18, 88 * scale, 0.17], [122, 6, 68 * scale, 0.12]] },
    { x: -220, y: height * 0.58, vx: 0.1, depth: 0.42, puffs: [[-70, 0, 96 * scale, 0.14], [0, -36, 78 * scale, 0.12], [64, -14, 88 * scale, 0.14], [132, 8, 72 * scale, 0.1]] },
  ];
}

function WeatherCanvas({ weatherKey }: { weatherKey: WeatherKey }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || canvas.clientWidth || 1200;
      canvas.height = canvas.offsetHeight || canvas.clientHeight || 420;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let frame = 0;
    let t = 0;
    let flashAlpha = 0;
    let flashCooldown = 180;

    const denseClouds = weatherKey === 'cloudy' || weatherKey === 'rain' || weatherKey === 'storm' || weatherKey === 'snow';
    const clouds = createCloudBanks(canvas.width, canvas.height, denseClouds);
    const rainDrops: RainDrop[] = (weatherKey === 'rain' || weatherKey === 'storm')
      ? Array.from({ length: weatherKey === 'storm' ? 260 : 190 }, () => ({
          x: Math.random() * (canvas.width + 120) - 60,
          y: Math.random() * canvas.height,
          vx: -(2.5 + Math.random() * 3),
          vy: 14 + Math.random() * 16,
          len: 16 + Math.random() * 30,
          w: 0.5 + Math.random() * 0.9,
          a: 0.2 + Math.random() * 0.45,
        }))
      : [];
    const snowFlakes: SnowFlake[] = weatherKey === 'snow'
      ? Array.from({ length: 140 }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vy: 0.5 + Math.random() * 1.6,
          r: 1.5 + Math.random() * 4.5,
          phase: Math.random() * Math.PI * 2,
          ps: 0.007 + Math.random() * 0.014,
          a: 0.45 + Math.random() * 0.45,
        }))
      : [];

    const cloudTint = weatherKey === 'sunny'
      ? { inner: 'rgba(255,244,228,__A__)', outer: 'rgba(255,212,170,__A__)' }
      : weatherKey === 'storm'
        ? { inner: 'rgba(104,116,150,__A__)', outer: 'rgba(58,66,90,__A__)' }
        : weatherKey === 'rain'
          ? { inner: 'rgba(150,170,186,__A__)', outer: 'rgba(92,110,126,__A__)' }
          : { inner: 'rgba(219,229,239,__A__)', outer: 'rgba(132,148,166,__A__)' };

    const drawSceneBase = () => {
      drawSkyBackdrop(ctx, canvas.width, canvas.height, weatherKey);

      if (weatherKey === 'sunny') {
        drawSunScene(ctx, canvas.width, canvas.height, t);
      } else if (weatherKey === 'cloudy') {
        const haze = ctx.createRadialGradient(canvas.width * 0.66, canvas.height * 0.22, 0, canvas.width * 0.66, canvas.height * 0.22, canvas.width * 0.44);
        haze.addColorStop(0, 'rgba(246,248,255,0.12)');
        haze.addColorStop(0.45, 'rgba(214,224,236,0.06)');
        haze.addColorStop(1, 'rgba(214,224,236,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (weatherKey === 'rain' || weatherKey === 'storm') {
        const gloom = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gloom.addColorStop(0, 'rgba(17,23,29,0.12)');
        gloom.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = gloom;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      for (const cloud of clouds) {
        drawCloudBank(ctx, cloud, cloudTint);
        cloud.x += cloud.vx * (cloud.depth > 0.25 ? 1.15 : 1);
        if (cloud.x > canvas.width + 320) cloud.x = -340;
      }

      drawHorizon(ctx, canvas.width, canvas.height, weatherKey);
    };

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSceneBase();

      if (weatherKey === 'rain' || weatherKey === 'storm') {
        if (weatherKey === 'storm') {
          flashCooldown--;
          if (flashCooldown <= 0 && Math.random() < 0.016) {
            flashAlpha = 0.28;
            flashCooldown = 160 + Math.floor(Math.random() * 220);
          }
        }

        for (const drop of rainDrops) {
          ctx.save();
          ctx.globalAlpha = drop.a;
          ctx.strokeStyle = weatherKey === 'storm' ? '#D5E8FF' : '#B7D5E7';
          ctx.lineWidth = drop.w;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + drop.vx * (drop.len / drop.vy), drop.y + drop.len);
          ctx.stroke();
          ctx.restore();
          drop.x += drop.vx;
          drop.y += drop.vy;
          if (drop.y > canvas.height + 30 || drop.x < -60) {
            drop.y = -40 - Math.random() * 80;
            drop.x = Math.random() * (canvas.width + 120);
          }
        }

        const gloss = ctx.createLinearGradient(0, canvas.height * 0.72, 0, canvas.height);
        gloss.addColorStop(0, 'rgba(255,255,255,0)');
        gloss.addColorStop(1, 'rgba(145,196,214,0.12)');
        ctx.fillStyle = gloss;
        ctx.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.28);

        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(225,235,255,${flashAlpha})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          flashAlpha = Math.max(0, flashAlpha - 0.035);
        }
      } else if (weatherKey === 'snow') {
        for (const flake of snowFlakes) {
          flake.phase += flake.ps;
          flake.x += Math.sin(flake.phase) * 0.7;
          flake.y += flake.vy;
          if (flake.y > canvas.height + flake.r) {
            flake.y = -flake.r;
            flake.x = Math.random() * canvas.width;
          }
          ctx.save();
          ctx.globalAlpha = flake.a;
          ctx.fillStyle = '#F3F8FF';
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      frame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [weatherKey]);

  return <canvas ref={ref} className="db-hero-canvas" aria-hidden="true" />;
}

function WeatherBackground({ weatherKey }: { weatherKey: WeatherKey }) {
  return (
    <div className="db-hero-bg">
      <WeatherCanvas weatherKey={weatherKey} />
      <div className="db-hero-overlay" />
    </div>
  );
}

function buildLatestOverview(latest: LatestBriefResponse | null, history: BriefHistoryItem[]): OverviewRun | null {
  if (!latest) return null;
  const matching = history.find((item) => item.createdAt === latest.summary.latestRunAt) ?? history[0] ?? null;
  return {
    id: matching?.id ?? latest.summary.latestRunAt ?? 'latest',
    createdAt: latest.summary.latestRunAt,
    status: latest.summary.contentStatus ?? latest.summary.scoutStatus,
    readyToPublish: latest.summary.readyToPublish,
    qualityScore: latest.summary.qualityScore,
    scoutPriorityAction: latest.summary.scoutPriorityAction,
    weatherImpact: latest.summary.weatherImpact,
    reviewInsights: latest.summary.reviewInsights ?? [],
    competitorIntel: latest.summary.competitorIntel ?? [],
    relationshipSignals: latest.summary.relationshipSignals ?? [],
    localEvents: latest.summary.localEvents ?? [],
    primarySignals: latest.summary.primarySignals ?? [],
    redditSignals: latest.summary.redditSignals ?? [],
    brandMentions: latest.summary.brandMentions ?? [],
    contentOpportunities: latest.summary.contentOpportunities ?? [],
    contentAngle: latest.summary.contentAngle,
    content: latest.latestContent?.content ?? null,
    generatedImage: latest.generatedImage ?? matching?.generatedImage ?? null,
    runCost: matching?.runCost ?? null,
  };
}

function buildHistoryOverview(item: BriefHistoryItem): OverviewRun {
  return {
    id: item.id,
    createdAt: item.createdAt,
    status: item.status,
    readyToPublish: item.readyToPublish,
    qualityScore: item.qualityScore,
    scoutPriorityAction: item.scoutPriorityAction,
    weatherImpact: item.weatherImpact,
    reviewInsights: item.reviewInsights ?? [],
    competitorIntel: item.competitorIntel ?? [],
    relationshipSignals: item.relationshipSignals ?? [],
    localEvents: item.localEvents ?? [],
    primarySignals: item.primarySignals ?? [],
    redditSignals: item.redditSignals ?? [],
    brandMentions: item.brandMentions ?? [],
    contentOpportunities: item.contentOpportunities ?? [],
    contentAngle: item.contentAngle,
    content: item.content ?? null,
    generatedImage: item.generatedImage ?? null,
    runCost: item.runCost ?? null,
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<LatestBriefResponse | null>(null);
  const [history, setHistory] = useState<BriefHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    carouselApi.on('reInit', onSelect);
    return () => { carouselApi.off('select', onSelect); carouselApi.off('reInit', onSelect); };
  }, [carouselApi]);

  const fetchOverview = useCallback(async (firebaseUser: User) => {
    setLoading(true);
    setError('');
    try {
      const token = await getIdToken(firebaseUser, true);
      const headers = { Authorization: `Bearer ${token}` };
      const [latestRes, historyRes] = await Promise.all([
        fetch('/admin/not-the-rug/latest-brief', { headers, cache: 'no-store' }),
        fetch('/admin/not-the-rug/history?limit=14', { headers, cache: 'no-store' }),
      ]);

      if (!latestRes.ok) {
        const body = await latestRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Dashboard load failed (${latestRes.status})`);
      }

      const latestData = (await latestRes.json()) as LatestBriefResponse;
      setLatest(latestData);

      if (historyRes.ok) {
        const historyData = (await historyRes.json()) as { runs?: BriefHistoryItem[] };
        setHistory(historyData.runs ?? []);
      } else {
        setHistory([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser?.email) {
        router.push('/admin');
        return;
      }

      const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
      if (!snap.exists()) {
        router.push('/admin');
        return;
      }

      setUser(firebaseUser);
      setAuthChecked(true);
      await fetchOverview(firebaseUser);
    });

    return () => unsub();
  }, [fetchOverview, router]);

  const runBrief = useCallback(async (fresh: boolean) => {
    if (!user) return;
    setRunning(true);
    setError('');

    try {
      const token = await getIdToken(user, true);
      const res = await fetch('/admin/not-the-rug/run-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fresh }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `Brief run failed (${res.status})`);
      }

      setSelectedHistoryId(null);
      await fetchOverview(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brief run failed.');
    } finally {
      setRunning(false);
    }
  }, [fetchOverview, user]);

  const downloadRunHtml = useCallback(async (runId: string) => {
    if (!user) return;

    setDownloadingRunId(runId);
    setError('');
    try {
      const token = await getIdToken(user, true);
      const response = await fetch(`/admin/not-the-rug/history/${encodeURIComponent(runId)}/html`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
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
      setError(err instanceof Error ? err.message : 'Could not download this HTML brief.');
    } finally {
      setDownloadingRunId(null);
    }
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    router.push('/admin');
  }, [router]);

  const latestOverview = useMemo(() => buildLatestOverview(latest, history), [latest, history]);
  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );
  const active = useMemo(
    () => (selectedHistory ? buildHistoryOverview(selectedHistory) : latestOverview),
    [latestOverview, selectedHistory],
  );

  const weatherKey = getWeatherKey(active?.weatherImpact);
  const weatherDisplay = extractWeatherDisplay(active?.weatherImpact);
  const instagramCopy = active?.content?.instagram_post_copy ?? null;
  const contentAngle = active?.content?.content_angle ?? active?.contentAngle ?? null;
  const stageCosts = active?.runCost?.stageCosts ?? [];
  const yelpSignals = useMemo(() => {
    const insights = active?.reviewInsights ?? [];
    const filtered = insights.filter((item) => /yelp/i.test(`${item.source} ${item.url}`));
    return filtered.length ? filtered : insights;
  }, [active]);
  const googleBusinessSignals = useMemo(
    () => (active?.reviewInsights ?? []).filter((item) => /google/i.test(`${item.source} ${item.url}`)),
    [active],
  );
  const instagramSignals = useMemo(
    () => (active?.brandMentions ?? []).filter((item) => /instagram/i.test(`${item.source} ${item.author} ${item.url}`)),
    [active],
  );

  if (!authChecked) {
    return (
      <div style={{ background: '#1F2318', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{css}</style>
        <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '11px', letterSpacing: '0.1em', color: '#4E5A42', textTransform: 'uppercase' }}>[LOADING...]</span>
      </div>
    );
  }

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
            <span className="db-email">{user?.email}</span>
            <button className="db-signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        <nav className="db-nav">
          <a className="db-nav-link db-nav-link-active" href="/admin/dashboard">Overview</a>
          {/* <a className="db-nav-link" href="/admin/dashboard/brief">Brief</a> */}
          {/* <a className="db-nav-link" href="/admin/dashboard/photos">Photos</a> */}
          <a className="db-nav-link" href="/admin/dashboard/generator">Generator</a>
          <a className="db-nav-link" href="/admin/dashboard/leads">Leads</a>
          <a className="db-nav-link" href="/admin/dashboard/preview/founder-brief">Founder Brief</a>
        </nav>

        <div className="db-page">
          <section className="db-hero" id="brief-hero-band">
            <WeatherBackground weatherKey={weatherKey} />
            <div className="db-hero-inner">
              <div className="db-hero-copy">
                <div className="db-kicker">DAILY BRIEF</div>
                <h1 className="db-heading">Not the Rug</h1>
                <div className="db-hero-meta">
                  <span>{formatDate(active?.createdAt)}</span>
                </div>
                {/* <div className="db-chip-row">
                  <span className={`db-chip ${(active?.readyToPublish ?? false) ? 'db-chip-ready' : 'db-chip-review'}`}>
                    {(active?.readyToPublish ?? false) ? 'Ready to Publish' : 'Needs Review'}
                  </span>
                  <span className={`db-chip ${active?.status === 'error' ? 'db-chip-error' : ''}`}>
                    {active?.status ?? 'no status'}
                  </span>
                  {active?.qualityScore != null ? (
                    <span className="db-chip">Quality {active.qualityScore}/100</span>
                  ) : null}
                </div> */}
                {error ? <div className="db-error">{error}</div> : null}
              </div>

              <aside className="db-hero-aside">
                <div className="db-stat-grid">
                  <div className="db-stat-card">
                    <div className="db-label">Weather Impact</div>
                    <div className="db-stat-value">{weatherDisplay.headline}</div>
                    <div className="db-stat-copy db-stat-meta">
                      <span>{weatherDisplay.lineOne}</span>
                      {weatherDisplay.lineTwo ? <span>{weatherDisplay.lineTwo}</span> : null}
                    </div>
                  </div>
                  <div className="db-stat-card">
                    <div className="db-label">Run Cost</div>
                    <div className="db-stat-value">{formatUsd(active?.runCost?.totalEstimatedUsd)}</div>
                    <div className="db-stat-copy">
                      <span>AI {formatUsd(active?.runCost?.aiEstimatedUsd)}</span>
                      <span>Storage {formatUsd(active?.runCost?.firebaseEstimatedUsd)}</span>
                    </div>
                  </div>
                  <div id="db-leads-captured-card" className="db-stat-card">
                    <div className="db-label">Leads Captured</div>
                    <div className="db-stat-value">{latest?.leadStats?.today?.count ?? 0}</div>
                    <div className="db-stat-copy">
                      <span>Today ({latest?.leadStats?.today?.dateLabel ?? '—'}) · Yesterday <strong>{latest?.leadStats?.yesterday?.count ?? 0}</strong></span>
                      <span>7d <strong>{latest?.leadStats?.totals?.last7Days ?? 0}</strong> · 30d <strong>{latest?.leadStats?.totals?.last30Days ?? 0}</strong> · All <strong>{latest?.leadStats?.totals?.allTime ?? 0}</strong></span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="db-panel">
            <div className="db-panel-head">
              <h2 className="db-panel-title">Priority Action</h2>
              <span className="db-note">Immediate move for this run</span>
            </div>
            <div className="db-panel-body">
              <div className="db-info-card">
                <div className="db-label">Priority Action</div>
                <div className="db-value">{active?.scoutPriorityAction ?? 'No priority action saved for this run.'}</div>
              </div>
            </div>
          </section>

          <section className="db-panel">
              <div className="db-panel-head">
                <h2 className="db-panel-title">Post of the Day</h2>
                <span className="db-note">{selectedHistory ? 'Historical package' : 'Latest package'}</span>
              </div>
              <div className="db-panel-body">

                {/* ── Platform post carousel (Embla) ── */}
                <Carousel
                  id="platform-post-carousel-shell"
                  className="carousel-shell"
                  opts={{ align: 'center', containScroll: false, breakpoints: { '(min-width: 1280px)': { active: false } } }}
                  setApi={setCarouselApi}
                >
                  <CarouselContent className="platform-track">

                  {/* Slot 1 — Instagram */}
                  <CarouselItem className="platform-slot">
                    <div className="platform-label">Instagram</div>
                    <div id="ig-post-card" className="ig-card">

                      <div className="ig-header">
                        <div className="ig-avatar">
                          <span className="ig-avatar-initials">NTR</span>
                        </div>
                        <div className="ig-header-info">
                          <div className="ig-username">not_the_rug</div>
                          <div className="ig-location">Brooklyn, NY</div>
                        </div>
                        <span className="ig-more">···</span>
                      </div>

                      <div className="ig-image">
                        {active?.generatedImage?.renderDownloadURL ? (
                          <img src={active.generatedImage.renderDownloadURL} alt="Not The Rug social post" />
                        ) : (
                          <div className="ig-image-ph">
                            <svg className="ig-image-ph-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#55624C" strokeWidth="1.4">
                              <rect x="3" y="3" width="18" height="18" rx="3"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <div className="ig-image-ph-text">Generated post image<br/>appears here</div>
                            <a className="ig-image-ph-cta" href="/admin/dashboard/photos">Open Photos →</a>
                          </div>
                        )}
                      </div>

                      <div className="ig-actions">
                        <div className="ig-act-left">
                          <button className="ig-icon-btn" aria-label="Like">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </button>
                          <button className="ig-icon-btn" aria-label="Comment">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
                          <button className="ig-icon-btn" aria-label="Share">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                          </button>
                        </div>
                        <button className="ig-icon-btn" aria-label="Save">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                      </div>

                      <div className="ig-caption">
                        <strong className="ig-caption-user">not_the_rug</strong>
                        {instagramCopy ?? 'No caption saved for this run.'}
                      </div>

                      <div className="ig-timestamp">
                        {active?.createdAt ? formatCompactDate(active.createdAt) : 'Just now'}
                      </div>
                    </div>
                  </CarouselItem>

                  {/* Slot 2 — X / Twitter */}
                  <CarouselItem className="platform-slot">
                    <div className="platform-label">X / Twitter</div>
                    <div id="tw-post-card" className="tw-card">
                      <div className="tw-header">
                        <div className="tw-avatar-wrap">
                          <div className="tw-avatar"><span className="tw-avatar-initials">NTR</span></div>
                          <div>
                            <div className="tw-name">Not The Rug</div>
                            <div className="tw-handle">@not_the_rug</div>
                          </div>
                        </div>
                        <svg className="tw-x-logo" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.261 5.636 5.902-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </div>
                      <div className="tw-body">{instagramCopy ?? 'No post copy for this run.'}</div>
                      <div className="tw-image">
                        {active?.generatedImage?.renderDownloadURL ? (
                          <img src={active.generatedImage.renderDownloadURL} alt="Not The Rug social post" />
                        ) : (
                          <div className="tw-image-ph">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c0c5cc" strokeWidth="1.4">
                              <rect x="3" y="3" width="18" height="18" rx="3"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="tw-actions">
                        <button className="tw-act-btn" aria-label="Reply">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                        <button className="tw-act-btn" aria-label="Repost">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        </button>
                        <button className="tw-act-btn" aria-label="Like">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </button>
                        <button className="tw-act-btn" aria-label="Views">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="tw-act-btn" aria-label="Bookmark">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        </button>
                      </div>
                    </div>
                  </CarouselItem>

                  {/* Slot 3 — Facebook */}
                  <CarouselItem className="platform-slot">
                    <div className="platform-label">Facebook</div>
                    <div id="fb-post-card" className="fb-card">
                      <div className="fb-header">
                        <div className="fb-avatar"><span className="fb-avatar-initials">NTR</span></div>
                        <div>
                          <div className="fb-name">Not The Rug</div>
                          <div className="fb-meta">Just now · 🌐</div>
                        </div>
                      </div>
                      <div className="fb-body">{instagramCopy ?? 'No post copy for this run.'}</div>
                      <div className="fb-image">
                        {active?.generatedImage?.renderDownloadURL ? (
                          <img src={active.generatedImage.renderDownloadURL} alt="Not The Rug social post" />
                        ) : (
                          <div className="fb-image-ph">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c0c5cc" strokeWidth="1.4">
                              <rect x="3" y="3" width="18" height="18" rx="3"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="fb-reactions">
                        <div>👍 ❤️ 😮</div>
                        <div>4 comments</div>
                      </div>
                      <div className="fb-btn-row">
                        <button className="fb-btn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                          Like
                        </button>
                        <button className="fb-btn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          Comment
                        </button>
                        <button className="fb-btn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                          Share
                        </button>
                      </div>
                    </div>
                  </CarouselItem>

                  </CarouselContent>

                  <div className="carousel-footer">
                    <CarouselPrevious className="carousel-arrow" />
                    <div className="carousel-dots">
                      {['Instagram', 'X / Twitter', 'Facebook'].map((label, i) => (
                        <button
                          key={label}
                          className={`carousel-dot${carouselIndex === i ? ' active' : ''}`}
                          aria-label={`Go to ${label}`}
                          onClick={() => carouselApi?.scrollTo(i)}
                        />
                      ))}
                    </div>
                    <CarouselNext className="carousel-arrow" />
                  </div>
                </Carousel>

                {/* Download actions */}
                {active?.generatedImage?.renderDownloadURL && (
                  <div className="ig-post-btns">
                    <a className="db-btn db-btn-primary" href={active.generatedImage.renderDownloadURL} target="_blank" rel="noreferrer">Open Generator</a>
                    <a className="db-btn" href={active.generatedImage.renderDownloadURL} download>Download</a>
                  </div>
                )}

              </div>
          </section>

          <section className="db-panel">
              <div className="db-panel-head">
                <h2 className="db-panel-title">Content Angle</h2>
                <span className="db-note">Strategic framing</span>
              </div>
              <div className="db-panel-body">
                <div className="db-info-card">
                  <div className="db-label">Content Angle</div>
                  <div className="db-value">{contentAngle ?? 'No content angle captured for this run.'}</div>
                </div>
              </div>
          </section>

          <section className="db-panel">
            <div className="db-panel-head">
              <h2 className="db-panel-title">Social Media</h2>
              <span className="db-note">Platform-specific signals</span>
            </div>
            <div className="db-panel-body">
              <div className="db-intel-grid">
                <div className="db-info-card">
                  <div className="db-label">Reddit Signals</div>
                  {active?.redditSignals?.length ? (
                    <div className="db-intel-list">
                      {active.redditSignals.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                          </div>
                          <div className="db-intel-body">{item.subreddit ? `${item.subreddit} · ${item.summary}` : item.summary}</div>
                          {item.takeaway ? <div className="db-intel-takeaway">{item.takeaway}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No Reddit signals surfaced for this run.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Yelp</div>
                  {yelpSignals.length ? (
                    <div className="db-intel-list">
                      {yelpSignals.map((item, index) => (
                        <div key={`${item.source}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.source || 'Yelp'}</a> : item.source || 'Yelp'}
                          </div>
                          <div className="db-intel-body">{item.insight}</div>
                          {item.takeaway ? <div className="db-intel-takeaway">{item.takeaway}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No Yelp insight surfaced for this run.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Google Business Page</div>
                  {googleBusinessSignals.length ? (
                    <div className="db-intel-list">
                      {googleBusinessSignals.map((item, index) => (
                        <div key={`${item.source}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.source || 'Google Business Page'}</a> : item.source || 'Google Business Page'}
                          </div>
                          <div className="db-intel-body">{item.insight}</div>
                          {item.takeaway ? <div className="db-intel-takeaway">{item.takeaway}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No Google Business Page insight surfaced for this run.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Instagram</div>
                  {instagramSignals.length ? (
                    <div className="db-intel-list">
                      {instagramSignals.map((item, index) => (
                        <div key={`${item.source}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.author || item.source || 'Instagram'}</a> : item.author || item.source || 'Instagram'}
                          </div>
                          <div className="db-intel-body">{item.content}</div>
                          {item.source ? <div className="db-intel-takeaway">{item.source}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No Instagram signal surfaced for this run.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="db-panel">
            <div className="db-panel-head">
              <h2 className="db-panel-title">Local Intelligence</h2>
              {/* <span className="db-note">Overview now mirrors the brief intelligence blocks</span> */}
            </div>
            <div className="db-panel-body">
              <div className="db-intel-grid">
                <div className="db-info-card">
                  <div className="db-label">Competitors</div>
                  {active?.competitorIntel?.length ? (
                    <div className="db-intel-list">
                      {active.competitorIntel.map((item, index) => (
                        <div key={`${item.competitor}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.competitor}</a> : item.competitor}
                          </div>
                          <div className="db-intel-body">{item.finding}</div>
                          {item.impact ? <div className="db-intel-takeaway">Impact: {item.impact}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No competitor activity detected this cycle.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Partnership / Referral Opportunities</div>
                  {active?.relationshipSignals?.length ? (
                    <div className="db-intel-list">
                      {active.relationshipSignals.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.name}</a> : item.name}
                          </div>
                          <div className="db-intel-body">{item.summary}</div>
                          {(item.priority || item.type) ? <div className="db-intel-takeaway">{[item.priority, item.type].filter(Boolean).join(' · ')}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No referral opportunities surfaced for this run.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Local Events</div>
                  {active?.localEvents?.length ? (
                    <div className="db-intel-list">
                      {active.localEvents.map((item, index) => (
                        <div key={`${item.event}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.event}</a> : item.event}
                          </div>
                          {item.date ? <div className="db-note">{item.date}</div> : null}
                          <div className="db-intel-body">{item.impact}</div>
                          {item.opportunity ? <div className="db-intel-takeaway">{item.opportunity}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No local events or holiday hooks surfaced this cycle.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Local Demand Signals</div>
                  {active?.primarySignals?.length ? (
                    <div className="db-intel-list">
                      {active.primarySignals.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">{item.title}</div>
                          <div className="db-intel-body">{item.detail}</div>
                          {item.relevance ? <div className="db-intel-takeaway">Priority: {item.relevance}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No local demand signals captured for this run.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Brand Mentions</div>
                  {active?.brandMentions?.length ? (
                    <div className="db-intel-list">
                      {active.brandMentions.map((item, index) => (
                        <div key={`${item.source}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.author || item.source}</a> : item.author || item.source}
                          </div>
                          <div className="db-intel-body">{item.content}</div>
                          {item.source ? <div className="db-intel-takeaway">{item.source}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No brand mentions surfaced this cycle.</div>
                  )}
                </div>

                <div className="db-info-card">
                  <div className="db-label">Content Opportunities</div>
                  {active?.contentOpportunities?.length ? (
                    <div className="db-intel-list">
                      {active.contentOpportunities.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="db-intel-item">
                          <div className="db-intel-name">
                            {item.source ? <span className="db-platform-badge" data-platform={item.source}>{item.source}</span> : null}
                            {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                          </div>
                          <div className="db-intel-body">{item.summary}</div>
                          {(item.priority || item.format) ? <div className="db-intel-takeaway">{[item.priority, item.format].filter(Boolean).join(' · ')}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-empty">No content opportunities identified for this run.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="db-panel">
            <div className="db-panel-head">
              <h2 className="db-panel-title">Run Snapshot</h2>
              <span className="db-note">Active run metrics</span>
            </div>
            <div className="db-panel-body">
              <div className="db-card-grid">
                <div className="db-info-card">
                  <div className="db-label">Last Run</div>
                  <div className="db-value">{formatDate(active?.createdAt)}</div>
                </div>
                <div className="db-info-card">
                  <div className="db-label">Quality Score</div>
                  <div className="db-value">{active?.qualityScore != null ? `${active.qualityScore}/100` : 'n/a'}</div>
                </div>
                <div className="db-info-card">
                  <div className="db-label">Publish Status</div>
                  <div className="db-value">{active?.readyToPublish ? 'Ready to publish' : 'Review recommended'}</div>
                </div>
                <div className="db-info-card">
                  <div className="db-label">Current Status</div>
                  <div className="db-value">{active?.status ?? 'No status'}</div>
                </div>
              </div>
              <div className="db-info-card">
                <div className="db-label">Estimated Run Cost</div>
                <div className="db-value">
                  Total {formatUsd(active?.runCost?.totalEstimatedUsd)} · AI {formatUsd(active?.runCost?.aiEstimatedUsd)} · Firebase {formatUsd(active?.runCost?.firebaseEstimatedUsd)}
                </div>
                {stageCosts.length ? (
                  <div className="db-intel-list">
                    {stageCosts.slice(0, 4).map((stage) => (
                      <div key={stage.stage} className="db-intel-item">
                        <div className="db-intel-name">{stage.stage}</div>
                        <div className="db-intel-body">{stage.model} · {stage.inputTokens} in / {stage.outputTokens} out · {formatUsd(stage.estimatedUsd)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="db-empty">Cost estimator has not been recorded for this run yet.</div>
                )}
              </div>
            </div>
          </section>

          <section className="db-rail">
            <div className="db-panel-head" style={{ padding: 0, borderBottom: 'none' }}>
              <h2 className="db-panel-title">Previous Runs</h2>
              <span className="db-note">Swap the dashboard to a prior day</span>
            </div>
            <div className="db-actions" style={{ paddingBottom: 4 }}>
              <button className="db-btn db-btn-primary" onClick={() => runBrief(true)} disabled={running}>
                {running ? 'Running Brief…' : 'Run Brief'}
              </button>
              <button className="db-btn" onClick={() => runBrief(false)} disabled={running}>
                {running ? 'Refreshing…' : 'Use Cached Inputs'}
              </button>
            </div>
            {loading && !history.length ? (
              <div className="db-empty">Loading recent runs…</div>
            ) : history.length ? (
              <div className="db-rail-scroll">
                {history.map((item) => (
                  <div key={item.id} className="db-rail-card">
                    <button
                      className={`db-rail-item ${selectedHistoryId === item.id ? 'db-rail-item-active' : ''}`}
                      onClick={() => setSelectedHistoryId(item.id)}
                    >
                      <div className="db-rail-date">{formatCompactDate(item.createdAt)}</div>
                      {item.generatedImage?.renderDownloadURL ? (
                        <div className="db-rail-thumb">
                          <img
                            src={item.generatedImage.renderDownloadURL}
                            alt={`Generated image for brief run ${formatCompactDate(item.createdAt)}`}
                          />
                        </div>
                      ) : (
                        <div className="db-rail-thumb-empty">
                          <span>
                            <strong>Image Slot</strong>
                            <em>No generated image saved for this run</em>
                          </span>
                        </div>
                      )}
                      <div className="db-rail-score">{item.qualityScore ?? '—'}</div>
                      <div className="db-rail-copy">{truncate(item.scoutPriorityAction ?? item.contentAngle, 70)}</div>
                    </button>
                    <div className="db-rail-actions">
                      <button
                        className="db-rail-action"
                        type="button"
                        onClick={() => downloadRunHtml(item.id)}
                        disabled={downloadingRunId === item.id}
                      >
                        {downloadingRunId === item.id ? 'Downloading…' : 'Download HTML'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-empty">No saved brief runs yet.</div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
