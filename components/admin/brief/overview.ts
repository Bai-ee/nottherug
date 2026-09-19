import type { BriefHistoryItem, LatestBriefResponse, OverviewRun } from './types';
import { CANVAS_PRESETS, DEFAULT_CANVAS_PRESET, type CanvasPresetKey } from '@/lib/generator/types';

/**
 * Intrinsic size for a run's generated-image preview, from its own canvas
 * preset (falls back to the default preset for an unrecognized/missing
 * value). Used only for an <img>'s width/height attributes in
 * DashboardHistory.tsx and DashboardSummary.tsx — app/globals.css's global
 * `img { width: 100%; height: 100%; object-fit: cover; }` still governs the
 * actual rendered box, so this never changes layout, only the browser's
 * aspect-ratio reservation before the image loads.
 */
export function generatedImageDimensions(canvasPreset: string | undefined): { width: number; height: number } {
  const preset = CANVAS_PRESETS[canvasPreset as CanvasPresetKey] ?? CANVAS_PRESETS[DEFAULT_CANVAS_PRESET];
  return { width: preset.width, height: preset.height };
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'No runs yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

export function formatCompactDate(value: string | null | undefined): string {
  if (!value) return 'No run';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatUsd(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 0.01 ? 4 : 2 }).format(value);
}

export function truncate(value: string | null | undefined, limit = 160): string {
  if (!value) return 'No note for this run.';
  return value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;
}

export function buildLatestOverview(latest: LatestBriefResponse | null, history: BriefHistoryItem[]): OverviewRun | null {
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

export function buildHistoryOverview(item: BriefHistoryItem): OverviewRun {
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
