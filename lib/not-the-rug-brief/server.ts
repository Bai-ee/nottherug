import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fsGetDoc, fsQueryCollection, fsSetDoc } from '@/lib/server/firestoreRest';
import { renderGeneratorImage, summarizeGeneratorRender, type GeneratorImageSummary } from '@/lib/generator/server';
import { type BriefRunCost, type StageCost, assembleRunCost } from '@/lib/not-the-rug-brief/costs';
import { storageDownload, storageUpload } from '@/lib/server/firebaseStorage';

const DEFAULT_BRIEF_DATA_DIR = process.env.NOT_THE_RUG_BRIEF_DATA_DIR?.trim()
  ? path.resolve(process.env.NOT_THE_RUG_BRIEF_DATA_DIR)
  : process.env.VERCEL
    ? path.join('/tmp', 'not-the-rug-brief')
    : path.join(process.cwd(), 'data', 'not-the-rug-brief');

process.env.NOT_THE_RUG_BRIEF_DATA_DIR = DEFAULT_BRIEF_DATA_DIR;

const requireFromRoot = createRequire(path.join(process.cwd(), 'package.json'));

// Lazy loaders — brief pipeline scripts are not bundled into Vercel functions.
// They are only available when running locally (dev server / local Node process).
type BriefBundle = { runNotTheRugBrief: (options?: { fresh?: boolean }) => Promise<unknown>; getLatestNotTheRugArtifacts: () => Promise<unknown>; };
type ClientsModule = { requireClientConfig: (clientId: string) => Record<string, unknown>; };
type StoreModule = { getLatestWeather: (clientId: string) => Promise<Record<string, unknown> | null>; getLatestReddit: (clientId: string) => Promise<Record<string, unknown> | null>; };
type IntelligenceModule = { normalizeIntelligence: (agentData?: Record<string, unknown>, config?: Record<string, unknown>) => NormalizedBriefIntel; };

let _briefBundle: BriefBundle | null = null;
let _clientsModule: ClientsModule | null = null;
let _storeModule: StoreModule | null = null;
let _intelligenceModule: IntelligenceModule | null = null;

function getBriefBundle(): BriefBundle { return _briefBundle ??= requireFromRoot('./not-the-rug-brief/index.js') as BriefBundle; }
function getClientsModule(): ClientsModule { return _clientsModule ??= requireFromRoot('./not-the-rug-brief/clients.js') as ClientsModule; }
function getStoreModule(): StoreModule { return _storeModule ??= requireFromRoot('./not-the-rug-brief/store.js') as StoreModule; }
function getIntelligenceModule(): IntelligenceModule { return _intelligenceModule ??= requireFromRoot('./not-the-rug-brief/intelligence.js') as IntelligenceModule; }

export interface BriefArtifacts {
  latestBriefJsonPath: string;
  latestContentJsonPath: string;
  latestMarkdownPath: string;
  latestHtmlPath: string;
  latestHtmlStoragePath?: string;
  latestHtmlDownloadURL?: string;
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

interface NormalizedBriefIntel {
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
    url: string;
  }>;
  contentAngle: string | null;
}

export interface LatestNotTheRugBrief {
  latestBrief: BriefPayload | null;
  latestContent: ContentPayload | null;
  artifacts: BriefArtifacts;
  summary: NotTheRugBriefSummary;
  generatedImage: GeneratorImageSummary | null;
  leadStats: import('@/lib/leads/stats').LeadStats | null;
}

export interface RunNotTheRugBriefResult {
  status: 'success' | 'error';
  stage?: string;
  error?: string;
  pipelineStartedAt?: string;
  latestBrief?: BriefPayload | null;
  latestContent?: ContentPayload | null;
  guardianFlags?: GuardianFlags | null;
  scoutPriorityAction?: string | null;
  reportPaths?: {
    markdownPath?: string;
    htmlPath?: string;
    htmlStoragePath?: string;
    htmlDownloadURL?: string;
    latestHtmlStoragePath?: string;
    latestHtmlDownloadURL?: string;
  } | null;
  artifacts: BriefArtifacts;
  summary: NotTheRugBriefSummary;
  generatedImage: GeneratorImageSummary | null;
  runCost: BriefRunCost | null;
  leadStats: import('@/lib/leads/stats').LeadStats | null;
}

export interface NotTheRugBriefRunRecord {
  id: string;
  createdAt: string;
  pipelineStartedAt: string | null;
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
  latestBriefTimestamp: string | null;
  latestContentTimestamp: string | null;
  briefHuman: string | null;
  content: Record<string, string | null> | null;
  guardianFlags: GuardianFlags | null;
  artifacts: BriefArtifacts;
  reportPaths?: {
    markdownPath?: string;
    htmlPath?: string;
    htmlStoragePath?: string;
    htmlDownloadURL?: string;
    latestHtmlStoragePath?: string;
    latestHtmlDownloadURL?: string;
  } | null;
  generatedImage: GeneratorImageSummary | null;
  runCost: BriefRunCost | null;
}

interface PersistedLatestBriefRecord {
  updatedAt: string;
  latestBrief: BriefPayload | null;
  latestContent: ContentPayload | null;
  artifacts: BriefArtifacts;
  summary: NotTheRugBriefSummary;
  generatedImage: GeneratorImageSummary | null;
  reportPaths?: {
    markdownPath?: string;
    htmlPath?: string;
    htmlStoragePath?: string;
    htmlDownloadURL?: string;
    latestHtmlStoragePath?: string;
    latestHtmlDownloadURL?: string;
  } | null;
  runCost: BriefRunCost | null;
}

export const NOT_THE_RUG_BRIEF_DATA_DIR = DEFAULT_BRIEF_DATA_DIR;

export const NOT_THE_RUG_BRIEF_COLLECTIONS = {
  runs: 'notTheRugBriefRuns',
  state: 'notTheRugBriefState',
} as const;

const NOT_THE_RUG_BRIEF_STORAGE_PATHS = {
  latestHtml: 'briefs/not-the-rug/latest/latest-brief.html',
  archiveDir: 'briefs/not-the-rug/archive',
} as const;

const BLOCKED_PRIORITY_ACTION = 'Draft and schedule a National Pet Day Instagram post this weekend that leads with a named walker moment or client testimonial to activate NTR\'s trust positioning before competitors flood the hashtag.';

function sanitizePriorityAction(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (normalized === BLOCKED_PRIORITY_ACTION) return null;
  return normalized;
}

function sanitizeHumanBrief(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  return value
    .replace(`\n\nPRIORITY ACTION: ${BLOCKED_PRIORITY_ACTION}\n\n---`, '\n\n---')
    .replace(`PRIORITY ACTION: ${BLOCKED_PRIORITY_ACTION}`, '')
    .trim();
}

function sanitizeLatestContent(latestContent: ContentPayload | null): ContentPayload | null {
  if (!latestContent) return null;
  const rawOutput = typeof latestContent.rawOutput === 'string' ? latestContent.rawOutput : '';
  const content = { ...(latestContent.content ?? {}) };

  if ((!content.instagram_post_copy || !content.content_angle) && rawOutput) {
    const extract = (label: string) => {
      const pattern = new RegExp(
        `\\*{0,2}${label}(?:\\s*\\([^\\n)]*\\))?\\s*:\\*{0,2}\\s*\\n([\\s\\S]*?)(?=\\n---\\s*\\n\\*{0,2}${label}(?:\\s*\\([^\\n)]*\\))?\\s*:\\*{0,2}|\\n\\*{0,2}[A-Z_]+(?:\\s*\\([^\\n)]*\\))?\\s*:\\*{0,2}|$)`,
        'i'
      );
      const match = rawOutput.match(pattern);
      return match ? match[1].replace(/^[-\s]+|[-\s]+$/g, '').trim() : null;
    };

    content.instagram_post_copy ||= extract('INSTAGRAM_POST_COPY');
    content.content_angle ||= extract('CONTENT_ANGLE');
  }

  return {
    ...latestContent,
    content,
    scoutPriorityAction: sanitizePriorityAction(latestContent.scoutPriorityAction),
  };
}

function sanitizeLatestBrief(latestBrief: BriefPayload | null): BriefPayload | null {
  if (!latestBrief) return null;
  return {
    ...latestBrief,
    humanBrief: sanitizeHumanBrief(latestBrief.humanBrief),
  };
}

function getWeatherSourceUrl(weatherReport: Record<string, unknown> | null): string {
  const neighborhoods = Array.isArray(weatherReport?.neighborhoods) ? weatherReport.neighborhoods as Array<Record<string, unknown>> : [];
  const first = neighborhoods[0];
  const sourceUrls = (first?.sourceUrls as Record<string, string> | undefined) ?? {};
  return sourceUrls.forecastHourly ?? sourceUrls.points ?? '';
}

function formatHourLabel(value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const normalized = ((value % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const hour12 = normalized % 12 || 12;
  return `${hour12}:00 ${suffix}`;
}

function fallbackWeatherAgentData(weatherReport: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!weatherReport?.overall || typeof weatherReport.overall !== 'object') return null;
  const overall = weatherReport.overall as Record<string, unknown>;
  const neighborhoods = Array.isArray(weatherReport.neighborhoods) ? weatherReport.neighborhoods as Array<Record<string, unknown>> : [];
  const firstNeighborhood = neighborhoods[0];
  const periods = Array.isArray(firstNeighborhood?.periods) ? firstNeighborhood.periods as Array<Record<string, unknown>> : [];
  const conditionLabels = [...new Set(
    periods
      .map((period) => String(period.shortForecast ?? '').trim())
      .filter(Boolean)
  )].slice(0, 2);
  const window = weatherReport.operationalWindow && typeof weatherReport.operationalWindow === 'object'
    ? weatherReport.operationalWindow as Record<string, unknown>
    : null;
  const timeSpan = window
    ? [formatHourLabel(window.startHour), formatHourLabel(window.endHour)].filter(Boolean).join('–')
    : '';
  const prefixParts = [String(firstNeighborhood?.name ?? ''), timeSpan, conditionLabels.join(', ')].filter(Boolean);
  return {
    summary: `${prefixParts.join(' · ')}${prefixParts.length ? ' · ' : ''}${String(overall.summary ?? '')}`.trim(),
    operationalTakeaway: String(overall.operationalTakeaway ?? ''),
    source: String(weatherReport.provider ?? 'nws'),
    url: getWeatherSourceUrl(weatherReport),
  };
}

function fallbackRedditAgentData(redditReport: Record<string, unknown> | null): Array<Record<string, unknown>> {
  if (!redditReport) return [];
  const mentions = Array.isArray(redditReport.mentions) ? redditReport.mentions as Array<Record<string, unknown>> : [];
  const opportunities = Array.isArray(redditReport.participationOpportunities) ? redditReport.participationOpportunities as Array<Record<string, unknown>> : [];
  return [
    ...mentions.slice(0, 3).map((item) => ({
      title: String(item.title ?? item.author ?? 'Reddit mention'),
      subreddit: String(item.subreddit ?? ''),
      signalType: 'brand_mention',
      summary: String(item.insight ?? item.excerpt ?? item.body ?? ''),
      actionableTakeaway: String(item.whyRelevant ?? 'Recent Reddit mention relevant to neighborhood dog-owner trust or demand language.'),
      url: String(item.permalink ?? item.url ?? ''),
    })),
    ...opportunities.slice(0, 3).map((item) => ({
      title: String(item.title ?? 'Recommendation thread'),
      subreddit: String(item.subreddit ?? ''),
      signalType: String(item.opportunityType ?? 'participation_opportunity'),
      summary: String(item.excerpt ?? item.body ?? ''),
      actionableTakeaway: String(item.whyRelevant ?? 'Relevant neighborhood thread that may surface buyer language or participation opportunities.'),
      url: String(item.permalink ?? item.url ?? ''),
    })),
  ].slice(0, 5);
}

async function applySupplementalSignalFallbacks(latestBrief: BriefPayload | null): Promise<BriefPayload | null> {
  if (!latestBrief || !latestBrief.agentData || typeof latestBrief.agentData !== 'object') return latestBrief;

  const agentData = { ...(latestBrief.agentData as Record<string, unknown>) };
  const needsWeather = true;
  const redditSignals = Array.isArray(agentData.redditSignals) ? agentData.redditSignals : [];
  const needsReddit = redditSignals.length === 0;

  if (!needsWeather && !needsReddit) return latestBrief;

  const [weatherReport, redditReport] = await Promise.all([
    needsWeather ? getStoreModule().getLatestWeather('not-the-rug') : Promise.resolve(null),
    needsReddit ? getStoreModule().getLatestReddit('not-the-rug') : Promise.resolve(null),
  ]);

  if (needsWeather) {
    const weatherAgentData = fallbackWeatherAgentData(weatherReport);
    const existingWeather = agentData.weatherImpact && typeof agentData.weatherImpact === 'object' && !Array.isArray(agentData.weatherImpact)
      ? agentData.weatherImpact as Record<string, unknown>
      : null;
    if (weatherAgentData) {
      agentData.weatherImpact = {
        ...(existingWeather ?? {}),
        ...weatherAgentData,
        operationalTakeaway: String(existingWeather?.operationalTakeaway ?? weatherAgentData.operationalTakeaway ?? ''),
      };
    }
  }

  if (needsReddit) {
    const redditAgentData = fallbackRedditAgentData(redditReport);
    if (redditAgentData.length > 0) agentData.redditSignals = redditAgentData;
  }

  return {
    ...latestBrief,
    agentData,
  };
}

function buildArtifactPaths(): BriefArtifacts {
  return {
    latestBriefJsonPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'briefs', 'not-the-rug', 'latest.json'),
    latestContentJsonPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'content', 'not-the-rug', 'latest-content.json'),
    latestMarkdownPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'briefs', 'not-the-rug', 'latest-brief.md'),
    latestHtmlPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'briefs', 'not-the-rug', 'latest-brief.html'),
  };
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw error;
  }
}

function buildDatedReportFilename(prefix: string, date: Date, extension: string): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const mon = months[date.getMonth()];
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const mins = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${prefix}-${mon}-${dd}-${yyyy}-${hours}:${mins}${ampm}.${extension}`;
}

function buildStorageArchivePath(reportPath: string | undefined | null, timestamp: string | null | undefined): string {
  const fileName = reportPath
    ? path.basename(reportPath)
    : buildDatedReportFilename('NotTheRug', timestamp ? new Date(timestamp) : new Date(), 'html');
  return `${NOT_THE_RUG_BRIEF_STORAGE_PATHS.archiveDir}/${fileName}`;
}

function summarizeBrief(
  latestBrief: BriefPayload | null,
  latestContent: ContentPayload | null,
): NotTheRugBriefSummary {
  const clientConfig = getClientsModule().requireClientConfig('not-the-rug');
  const normalized = getIntelligenceModule().normalizeIntelligence(
    (latestBrief?.agentData as Record<string, unknown> | undefined) ?? {},
    clientConfig,
  );

  const weatherImpact = normalized.weatherImpact
    ? [normalized.weatherImpact.summary, normalized.weatherImpact.operationalTakeaway].filter(Boolean).join(' — ')
    : null;

  return {
    latestRunAt: latestContent?.timestamp ?? latestBrief?.timestamp ?? null,
    scoutStatus: latestBrief?.status ?? null,
    contentStatus: latestContent?.status ?? null,
    readyToPublish: latestContent?.guardianFlags?.readyToPublish ?? null,
    qualityScore: latestContent?.guardianFlags?.overallScore ?? null,
    scoutPriorityAction: latestContent?.scoutPriorityAction ?? null,
    weatherImpact,
    reviewInsights: normalized.reviewInsights.slice(0, 3).map((item) => ({
      source: item.source ?? 'Review source',
      insight: item.insight ?? '',
      takeaway: item.actionableTakeaway ?? '',
      url: item.url ?? '',
    })),
    competitorIntel: normalized.competitorIntel.slice(0, 4).map((item) => ({
      competitor: item.competitor ?? 'Competitor',
      finding: item.finding ?? '',
      impact: item.impact ?? '',
      url: item.url ?? '',
    })),
    relationshipSignals: normalized.relationshipSignals.slice(0, 4).map((item) => ({
      name: item.name ?? 'Relationship opportunity',
      summary: item.summary ?? '',
      priority: item.priority ?? '',
      type: item.type ?? '',
      url: item.url ?? '',
    })),
    localEvents: normalized.localEvents.slice(0, 4).map((item) => ({
      event: item.event ?? 'Event',
      date: item.date ?? '',
      impact: item.impact ?? '',
      opportunity: item.opportunity ?? '',
      url: item.url ?? '',
    })),
    primarySignals: normalized.primarySignals.slice(0, 4).map((item) => ({
      title: item.title ?? 'Signal',
      detail: item.detail ?? '',
      relevance: item.relevance ?? '',
    })),
    redditSignals: normalized.redditSignals.slice(0, 3).map((item) => ({
      title: item.title ?? 'Reddit signal',
      subreddit: item.subreddit ?? '',
      summary: item.summary ?? '',
      takeaway: item.actionableTakeaway ?? '',
      url: item.url ?? '',
    })),
    brandMentions: normalized.brandMentions.slice(0, 4).map((item) => ({
      source: item.source ?? 'Source',
      author: item.author ?? '',
      content: item.content ?? item.finding ?? '',
      url: item.url ?? '',
    })),
    contentOpportunities: normalized.contentOpportunities.slice(0, 4).map((item) => ({
      title: item.title ?? 'Opportunity',
      summary: item.summary ?? '',
      priority: item.priority ?? '',
      format: item.format ?? '',
      url: item.url ?? '',
    })),
    contentAngle: latestContent?.content?.content_angle ?? null,
  };
}

async function uploadHostedHtmlArtifacts(
  result: Pick<RunNotTheRugBriefResult, 'artifacts' | 'reportPaths' | 'latestBrief' | 'latestContent'>,
): Promise<{
  artifacts: BriefArtifacts;
  reportPaths: NonNullable<RunNotTheRugBriefResult['reportPaths']>;
} | null> {
  const localHtmlPath = result.reportPaths?.htmlPath ?? result.artifacts.latestHtmlPath;
  const html = await readOptionalText(localHtmlPath);
  if (!html) return null;

  const htmlBuffer = Buffer.from(html, 'utf8');
  const archiveStoragePath = buildStorageArchivePath(
    result.reportPaths?.htmlPath,
    result.latestContent?.timestamp ?? result.latestBrief?.timestamp ?? new Date().toISOString(),
  );

  const [archiveDownloadURL, latestDownloadURL] = await Promise.all([
    storageUpload(archiveStoragePath, htmlBuffer, 'text/html; charset=utf-8'),
    storageUpload(NOT_THE_RUG_BRIEF_STORAGE_PATHS.latestHtml, htmlBuffer, 'text/html; charset=utf-8'),
  ]);

  return {
    artifacts: {
      ...result.artifacts,
      latestHtmlStoragePath: NOT_THE_RUG_BRIEF_STORAGE_PATHS.latestHtml,
      latestHtmlDownloadURL: latestDownloadURL,
    },
    reportPaths: {
      ...(result.reportPaths ?? {}),
      htmlStoragePath: archiveStoragePath,
      htmlDownloadURL: archiveDownloadURL,
      latestHtmlStoragePath: NOT_THE_RUG_BRIEF_STORAGE_PATHS.latestHtml,
      latestHtmlDownloadURL: latestDownloadURL,
    },
  };
}

async function persistLatestBriefState(record: PersistedLatestBriefRecord): Promise<void> {
  await fsSetDoc(`${NOT_THE_RUG_BRIEF_COLLECTIONS.state}/latest`, record as unknown as Record<string, unknown>);
}

async function getPersistedLatestBriefState(): Promise<PersistedLatestBriefRecord | null> {
  const doc = await fsGetDoc(`${NOT_THE_RUG_BRIEF_COLLECTIONS.state}/latest`);
  if (!doc.exists || !doc.data) return null;
  return doc.data as unknown as PersistedLatestBriefRecord;
}

function hydrateLatestBriefFromRecord(record: PersistedLatestBriefRecord): LatestNotTheRugBrief {
  const latestBrief = sanitizeLatestBrief(record.latestBrief ?? null);
  const latestContent = sanitizeLatestContent(record.latestContent ?? null);
  const artifacts = { ...buildArtifactPaths(), ...(record.artifacts ?? {}) };

  return {
    latestBrief,
    latestContent,
    artifacts,
    summary: record.summary ?? summarizeBrief(latestBrief, latestContent),
    generatedImage: record.generatedImage ?? null,
    leadStats: null,
  };
}

async function loadLeadStatsSafe(): Promise<import('@/lib/leads/stats').LeadStats | null> {
  try {
    const { getLeadStats } = await import('@/lib/leads/stats');
    return await getLeadStats(30);
  } catch (err) {
    console.error('[brief] leadStats load failed', err);
    return null;
  }
}

export async function getLatestNotTheRugBrief(): Promise<LatestNotTheRugBrief> {
  const persisted = await getPersistedLatestBriefState().catch(() => null);
  if (persisted) {
    const hydrated = hydrateLatestBriefFromRecord(persisted);
    return { ...hydrated, leadStats: await loadLeadStatsSafe() };
  }

  const bundleData = (await getBriefBundle().getLatestNotTheRugArtifacts()) as {
    latestBrief?: BriefPayload | null;
    latestContent?: ContentPayload | null;
    artifacts?: Partial<BriefArtifacts>;
  };

  const artifacts = { ...buildArtifactPaths(), ...(bundleData.artifacts ?? {}) };
  const latestBrief = await applySupplementalSignalFallbacks(
    sanitizeLatestBrief(bundleData.latestBrief ?? null),
  );
  const latestContent = sanitizeLatestContent(bundleData.latestContent ?? null);

  return {
    latestBrief,
    latestContent,
    artifacts,
    summary: summarizeBrief(latestBrief, latestContent),
    generatedImage: (await getNotTheRugBriefHistory(1))[0]?.generatedImage ?? null,
    leadStats: await loadLeadStatsSafe(),
  };
}

export async function runNotTheRugBrief(options: { fresh?: boolean } = {}): Promise<RunNotTheRugBriefResult> {
  const result = (await getBriefBundle().runNotTheRugBrief(options)) as {
    status: 'success' | 'error';
    stage?: string;
    error?: string;
    pipelineStartedAt?: string;
    latestBrief?: BriefPayload | null;
    latestContent?: ContentPayload | null;
    guardianFlags?: GuardianFlags | null;
    scoutPriorityAction?: string | null;
    reportPaths?: { markdownPath?: string; htmlPath?: string } | null;
    artifacts?: Partial<BriefArtifacts>;
    runCostData?: { stageCosts?: StageCost[] };
  };

  const latest = await getLatestNotTheRugBrief();
  let generatedImage: GeneratorImageSummary | null = null;

  if (result.status === 'success') {
    try {
      const render = await renderGeneratorImage({
        adminEmail: 'not-the-rug-brief',
        canvasPreset: 'portrait',
        logoAsset: 'notRugGreen',
      });
      generatedImage = summarizeGeneratorRender(render);
    } catch {
      generatedImage = null;
    }
  }

  let sanitizedLatestBrief = await applySupplementalSignalFallbacks(
    sanitizeLatestBrief(result.latestBrief ?? null),
  );
  let sanitizedLatestContent = sanitizeLatestContent(result.latestContent ?? null);
  let artifacts: BriefArtifacts = { ...buildArtifactPaths(), ...(result.artifacts ?? {}) };
  let reportPaths: NonNullable<RunNotTheRugBriefResult['reportPaths']> = { ...(result.reportPaths ?? {}) };

  if (result.status === 'success') {
    const hostedArtifacts = await uploadHostedHtmlArtifacts({
      artifacts,
      reportPaths,
      latestBrief: sanitizedLatestBrief,
      latestContent: sanitizedLatestContent,
    }).catch(() => null);

    if (hostedArtifacts) {
      artifacts = hostedArtifacts.artifacts;
      reportPaths = hostedArtifacts.reportPaths;
    }
  } else {
    const latestPersisted = await getPersistedLatestBriefState().catch(() => null);
    if (latestPersisted) {
      sanitizedLatestBrief = sanitizeLatestBrief(latestPersisted.latestBrief ?? null);
      sanitizedLatestContent = sanitizeLatestContent(latestPersisted.latestContent ?? null);
      artifacts = { ...artifacts, ...(latestPersisted.artifacts ?? {}) };
      reportPaths = { ...(latestPersisted.reportPaths ?? {}), ...reportPaths };
    }
  }

  const summary = summarizeBrief(sanitizedLatestBrief, sanitizedLatestContent);

  // Assemble run cost from stage costs returned by the bundle
  let runCost: BriefRunCost | null = null;
  if (result.status === 'success' && result.runCostData?.stageCosts?.length) {
    const hasImage = generatedImage !== null;
    runCost = assembleRunCost(
      result.runCostData.stageCosts,
      {
        firestoreWrites: 1,
        firestoreReads:  2,
        storageUploads:  hasImage ? 1 : 0,
        storageBytes:    hasImage ? 150_000 : 0, // ~150KB estimate per render
      },
    );
  }

  const payload: RunNotTheRugBriefResult = {
    status: result.status,
    stage: result.stage,
    error: result.error,
    pipelineStartedAt: result.pipelineStartedAt,
    latestBrief: sanitizedLatestBrief,
    latestContent: sanitizedLatestContent,
    guardianFlags: result.guardianFlags ?? sanitizedLatestContent?.guardianFlags ?? null,
    scoutPriorityAction: result.scoutPriorityAction ?? sanitizedLatestContent?.scoutPriorityAction ?? null,
    reportPaths,
    artifacts,
    summary,
    generatedImage,
    runCost,
    leadStats: await loadLeadStatsSafe(),
  };

  if (result.status === 'success') {
    await persistLatestBriefState({
      updatedAt: new Date().toISOString(),
      latestBrief: payload.latestBrief ?? null,
      latestContent: payload.latestContent ?? null,
      artifacts: payload.artifacts,
      summary: payload.summary,
      generatedImage: payload.generatedImage,
      reportPaths: payload.reportPaths ?? null,
      runCost: payload.runCost ?? null,
    }).catch(() => {
      // Keep the pipeline usable even if latest-state persistence fails.
    });
  }

  await persistBriefRun(payload).catch(() => {
    // Keep the generation result usable even if Firestore history persistence fails.
  });

  return payload;
}

export async function getLatestNotTheRugBriefHtml(): Promise<{ html: string; path: string }> {
  const persisted = await getPersistedLatestBriefState().catch(() => null);
  const latestStoragePath = persisted?.reportPaths?.latestHtmlStoragePath ?? persisted?.artifacts?.latestHtmlStoragePath;
  if (latestStoragePath) {
    const buffer = await storageDownload(latestStoragePath);
    return { html: buffer.toString('utf8'), path: latestStoragePath };
  }

  const latest = await getLatestNotTheRugBrief();
  const html = await readOptionalText(latest.artifacts.latestHtmlPath);

  if (!html) {
    throw new Error('Latest HTML brief not found');
  }

  return { html, path: latest.artifacts.latestHtmlPath };
}

function getRunHtmlPath(record: NotTheRugBriefRunRecord): string | null {
  if (record.reportPaths?.htmlPath) {
    return record.reportPaths.htmlPath;
  }

  const timestamp = record.latestContentTimestamp ?? record.latestBriefTimestamp ?? record.createdAt;
  const parsed = timestamp ? new Date(timestamp) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return path.join(
    NOT_THE_RUG_BRIEF_DATA_DIR,
    'briefs',
    'not-the-rug',
    buildDatedReportFilename('NotTheRug', parsed, 'html'),
  );
}

export async function getNotTheRugBriefRunHtml(runId: string): Promise<{ html: string; path: string; record: NotTheRugBriefRunRecord }> {
  const doc = await fsGetDoc(`${NOT_THE_RUG_BRIEF_COLLECTIONS.runs}/${runId}`);
  if (!doc.exists || !doc.data) {
    throw new Error('Brief run not found');
  }

  const record = doc.data as unknown as NotTheRugBriefRunRecord;
  if (record.reportPaths?.htmlStoragePath) {
    const buffer = await storageDownload(record.reportPaths.htmlStoragePath);
    return { html: buffer.toString('utf8'), path: record.reportPaths.htmlStoragePath, record };
  }

  const htmlPath = getRunHtmlPath(record);
  if (!htmlPath) {
    throw new Error('HTML brief path not found for this run');
  }

  const html = await readOptionalText(htmlPath);
  if (!html) {
    throw new Error('HTML brief not found for this run');
  }

  return { html, path: htmlPath, record };
}

function buildRunRecord(result: RunNotTheRugBriefResult): NotTheRugBriefRunRecord {
  const createdAt = result.latestContent?.timestamp
    ?? result.latestBrief?.timestamp
    ?? result.pipelineStartedAt
    ?? new Date().toISOString();

  return {
    id: createdAt,
    createdAt,
    pipelineStartedAt: result.pipelineStartedAt ?? null,
    status: result.status,
    stage: result.stage ?? null,
    error: result.error ?? null,
    readyToPublish: result.summary.readyToPublish,
    qualityScore: result.summary.qualityScore,
    scoutPriorityAction: result.summary.scoutPriorityAction,
    weatherImpact: result.summary.weatherImpact,
    reviewInsights: result.summary.reviewInsights,
    competitorIntel: result.summary.competitorIntel,
    relationshipSignals: result.summary.relationshipSignals,
    localEvents: result.summary.localEvents,
    primarySignals: result.summary.primarySignals,
    redditSignals: result.summary.redditSignals,
    brandMentions: result.summary.brandMentions,
    contentOpportunities: result.summary.contentOpportunities,
    contentAngle: result.summary.contentAngle,
    latestBriefTimestamp: result.latestBrief?.timestamp ?? null,
    latestContentTimestamp: result.latestContent?.timestamp ?? null,
    briefHuman: result.latestBrief?.humanBrief ?? null,
    content: result.latestContent?.content ?? null,
    guardianFlags: result.guardianFlags ?? null,
    artifacts: result.artifacts,
    reportPaths: result.reportPaths ?? null,
    generatedImage: result.generatedImage,
    runCost: result.runCost ?? null,
  };
}

export async function persistBriefRun(result: RunNotTheRugBriefResult): Promise<NotTheRugBriefRunRecord> {
  const record = buildRunRecord(result);
  await fsSetDoc(`${NOT_THE_RUG_BRIEF_COLLECTIONS.runs}/${record.id}`, record as unknown as Record<string, unknown>);
  return record;
}

export async function getNotTheRugBriefHistory(limit = 20): Promise<NotTheRugBriefRunRecord[]> {
  const docs = await fsQueryCollection(NOT_THE_RUG_BRIEF_COLLECTIONS.runs, 'createdAt', 'DESCENDING', limit);
  return docs as unknown as NotTheRugBriefRunRecord[];
}
