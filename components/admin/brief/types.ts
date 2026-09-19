export interface BriefSummary {
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

export interface LatestBriefResponse {
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
  // Present on the wire response; only the brief workspace (not the
  // analytics dashboard) surfaces these paths, so this was previously typed
  // only on that page's own local copy of this interface.
  artifacts?: {
    latestBriefJsonPath: string;
    latestContentJsonPath: string;
    latestMarkdownPath: string;
    latestHtmlPath: string;
  };
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

export interface LeadStatsSummary {
  rangeDays: number;
  timezone: string;
  today: { dateLabel: string; count: number };
  yesterday: { dateLabel: string; count: number };
  // recentCount is a bounded count (see lib/leads/stats.ts's recentCountCap),
  // not a true all-time total — never label it "All" in the UI.
  totals: { recentCount: number; last7Days: number; last30Days: number };
  byDay?: Array<{ date: string; count: number }>;
  bySource?: Record<string, number>;
}

export interface StageCost {
  stage: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
}

export interface RunCostSummary {
  totalEstimatedUsd: number;
  aiEstimatedUsd: number;
  firebaseEstimatedUsd?: number;
  stageCosts?: StageCost[];
}

export interface BriefHistoryItem {
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

export interface OverviewRun {
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
