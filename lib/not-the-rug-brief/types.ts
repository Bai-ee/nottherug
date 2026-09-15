import 'server-only';
import { PRIVATE_STORAGE_PREFIX } from '@/lib/server/firebaseStorage';
import type { GeneratorImageSummary } from '@/lib/generator/types';
import type { BriefRunCost } from '@/lib/not-the-rug-brief/costs';

// Pure type/constant module: no sharp, no generation pipeline. Safe for
// read-only and email routes to import.

export const NOT_THE_RUG_BRIEF_COLLECTIONS = {
  runs: 'notTheRugBriefRuns',
  state: 'notTheRugBriefState',
  leases: 'notTheRugBriefLeases',
} as const;

export const NOT_THE_RUG_BRIEF_STORAGE_PATHS = {
  latestHtml: `${PRIVATE_STORAGE_PREFIX}/briefs/not-the-rug/latest/latest-brief.html`,
  archiveDir: `${PRIVATE_STORAGE_PREFIX}/briefs/not-the-rug/archive`,
} as const;

export interface BriefArtifacts {
  latestBriefJsonPath: string;
  latestContentJsonPath: string;
  latestMarkdownPath: string;
  latestHtmlPath: string;
  latestHtmlStoragePath?: string;
}

export interface GuardianFlags {
  readyToPublish?: boolean;
  reviewRequired?: boolean;
  hardBlock?: boolean;
  overallScore?: number | null;
  factualScore?: number | null;
  voiceScore?: number | null;
  flags?: Array<{
    type?: string;
    severity?: string;
    field?: string;
    issue?: string;
    suggestion?: string;
  }>;
  concerns?: string[];
}

export interface BriefPayload {
  timestamp?: string;
  status?: string;
  humanBrief?: string | null;
  agentData?: Record<string, unknown>;
}

export interface ContentPayload {
  timestamp?: string;
  status?: string;
  scoutPriorityAction?: string | null;
  content?: Record<string, string | null>;
  guardianFlags?: GuardianFlags | null;
  contentOpportunities?: unknown[];
  rawOutput?: string | null;
}

export interface NormalizedBriefIntel {
  brandMentions: Array<{
    source?: string;
    author?: string;
    content?: string;
    finding?: string;
    url?: string;
  }>;
  competitorIntel: Array<{
    competitor?: string;
    finding?: string;
    impact?: string;
    url?: string;
  }>;
  weatherImpact: null | {
    summary?: string;
    operationalTakeaway?: string;
    url?: string;
  };
  localEvents: Array<{
    event?: string;
    date?: string;
    impact?: string;
    opportunity?: string;
    url?: string;
  }>;
  reviewInsights: Array<{
    source?: string;
    insight?: string;
    actionableTakeaway?: string;
    url?: string;
  }>;
  redditSignals: Array<{
    title?: string;
    subreddit?: string;
    summary?: string;
    actionableTakeaway?: string;
    url?: string;
  }>;
  primarySignals: Array<{
    title?: string;
    detail?: string;
    relevance?: string;
  }>;
  relationshipSignals: Array<{
    name?: string;
    summary?: string;
    priority?: string;
    type?: string;
    url?: string;
  }>;
  contentOpportunities: Array<{
    title?: string;
    summary?: string;
    priority?: string;
    format?: string;
    source?: string;
    url?: string;
  }>;
}

export interface NotTheRugBriefSummary {
  latestRunAt: string | null;
  scoutStatus: string | null;
  contentStatus: string | null;
  readyToPublish: boolean | null;
  qualityScore: number | null;
  scoutPriorityAction: string | null;
  weatherImpact: string | null;
  reviewInsights: Array<{ source: string; insight: string; takeaway: string; url: string }>;
  competitorIntel: Array<{ competitor: string; finding: string; impact: string; url: string }>;
  relationshipSignals: Array<{ name: string; summary: string; priority: string; type: string; url: string }>;
  localEvents: Array<{ event: string; date: string; impact: string; opportunity: string; url: string }>;
  primarySignals: Array<{ title: string; detail: string; relevance: string }>;
  redditSignals: Array<{ title: string; subreddit: string; summary: string; takeaway: string; url: string }>;
  brandMentions: Array<{ source: string; author: string; content: string; url: string }>;
  contentOpportunities: Array<{ title: string; summary: string; priority: string; format: string; source: string; url: string }>;
  contentAngle: string | null;
  /** Sources that could not be checked this run (e.g. optional Python research unavailable). */
  unavailableSources: string[];
}

export interface BriefReportPaths {
  markdownPath?: string;
  htmlPath?: string;
  htmlStoragePath?: string;
  latestHtmlStoragePath?: string;
}

export interface LatestNotTheRugBrief {
  latestBrief: BriefPayload | null;
  latestContent: ContentPayload | null;
  artifacts: BriefArtifacts;
  summary: NotTheRugBriefSummary;
  generatedImage: GeneratorImageSummary | null;
  leadStats: import('@/lib/leads/stats').LeadStats | null;
  /** ISO timestamp the currently-served "latest" state was actually persisted. */
  updatedAt: string | null;
}

export interface RunNotTheRugBriefResult {
  runId: string;
  status: 'success' | 'error';
  stage?: string;
  error?: string;
  pipelineStartedAt?: string;
  latestBrief?: BriefPayload | null;
  latestContent?: ContentPayload | null;
  guardianFlags?: GuardianFlags | null;
  scoutPriorityAction?: string | null;
  reportPaths?: BriefReportPaths | null;
  artifacts: BriefArtifacts;
  summary: NotTheRugBriefSummary;
  generatedImage: GeneratorImageSummary | null;
  imageGenerationError: string | null;
  runCost: BriefRunCost | null;
  leadStats: import('@/lib/leads/stats').LeadStats | null;
  /** Whether the freshly generated HTML was uploaded to private storage this run. */
  artifactUploadOk: boolean;
  artifactUploadError: string | null;
  /** Whether this run's "latest" pointer was actually promoted (only after a successful upload). */
  latestStatePersisted: boolean;
  latestStateError: string | null;
  /** Whether the run's history record was saved to Firestore. */
  runRecordPersisted: boolean;
  runRecordError: string | null;
}

export interface NotTheRugBriefRunRecord {
  id: string;
  runId: string;
  createdAt: string;
  pipelineStartedAt: string | null;
  /** Wall-clock duration of this run in milliseconds, from lease acquisition to completion. */
  durationMs: number | null;
  status: 'success' | 'error';
  stage: string | null;
  error: string | null;
  readyToPublish: boolean | null;
  qualityScore: number | null;
  scoutPriorityAction: string | null;
  weatherImpact: string | null;
  reviewInsights: NotTheRugBriefSummary['reviewInsights'];
  competitorIntel: NotTheRugBriefSummary['competitorIntel'];
  relationshipSignals: NotTheRugBriefSummary['relationshipSignals'];
  localEvents: NotTheRugBriefSummary['localEvents'];
  primarySignals: NotTheRugBriefSummary['primarySignals'];
  redditSignals: NotTheRugBriefSummary['redditSignals'];
  brandMentions: NotTheRugBriefSummary['brandMentions'];
  contentOpportunities: NotTheRugBriefSummary['contentOpportunities'];
  contentAngle: string | null;
  unavailableSources: string[];
  latestBriefTimestamp: string | null;
  latestContentTimestamp: string | null;
  briefHuman: string | null;
  content: Record<string, string | null> | null;
  guardianFlags: GuardianFlags | null;
  artifacts: BriefArtifacts;
  reportPaths?: BriefReportPaths | null;
  generatedImage: GeneratorImageSummary | null;
  imageGenerationError: string | null;
  runCost: BriefRunCost | null;
  artifactUploadOk: boolean;
  artifactUploadError: string | null;
}

export interface PersistedLatestBriefRecord {
  updatedAt: string;
  runId: string;
  latestBrief: BriefPayload | null;
  latestContent: ContentPayload | null;
  artifacts: BriefArtifacts;
  summary: NotTheRugBriefSummary;
  generatedImage: GeneratorImageSummary | null;
  reportPaths?: BriefReportPaths | null;
  runCost: BriefRunCost | null;
}
