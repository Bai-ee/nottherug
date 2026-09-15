import 'server-only';
import path from 'path';
import { createRequire } from 'module';
import type { BriefPayload, ContentPayload, NormalizedBriefIntel, NotTheRugBriefSummary } from '@/lib/not-the-rug-brief/types';

// Pure normalization/sanitization helpers shared by the read path and the run
// orchestrator. Only requires lightweight CJS modules (clients.js,
// intelligence.js, store.js's JSON readers) — never the generation pipeline
// entry point or anything that imports sharp.

const requireFromRoot = createRequire(path.join(process.cwd(), 'package.json'));

type ClientsModule = { requireClientConfig: (clientId: string) => Record<string, unknown> };
type StoreModule = {
  getLatestWeather: (clientId: string) => Promise<Record<string, unknown> | null>;
  getLatestReddit: (clientId: string) => Promise<Record<string, unknown> | null>;
};
type IntelligenceModule = {
  normalizeIntelligence: (agentData?: Record<string, unknown>, config?: Record<string, unknown>) => NormalizedBriefIntel;
};

let _clientsModule: ClientsModule | null = null;
let _storeModule: StoreModule | null = null;
let _intelligenceModule: IntelligenceModule | null = null;

function getClientsModule(): ClientsModule {
  return _clientsModule ??= requireFromRoot('./not-the-rug-brief/clients.js') as ClientsModule;
}
function getStoreModule(): StoreModule {
  return _storeModule ??= requireFromRoot('./not-the-rug-brief/store.js') as StoreModule;
}
function getIntelligenceModule(): IntelligenceModule {
  return _intelligenceModule ??= requireFromRoot('./not-the-rug-brief/intelligence.js') as IntelligenceModule;
}

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

export function sanitizeLatestContent(latestContent: ContentPayload | null): ContentPayload | null {
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

export function sanitizeLatestBrief(latestBrief: BriefPayload | null): BriefPayload | null {
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

export async function applySupplementalSignalFallbacks(latestBrief: BriefPayload | null): Promise<BriefPayload | null> {
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

/**
 * Best-effort list of sources missing from the current brief, derived from
 * what actually landed in agentData. This cannot see *why* a source is
 * missing (disabled by config vs. a live failure this run) — it only reports
 * that the brief does not currently carry that signal, so the admin/email
 * surface never silently presents a gap as "nothing to report".
 */
function computeUnavailableSources(latestBrief: BriefPayload | null, latestContent: ContentPayload | null): string[] {
  const gaps: string[] = [];
  if (!latestBrief) gaps.push('Scout brief (no run has completed yet)');
  if (!latestContent) gaps.push('Scribe content');
  const agentData = (latestBrief?.agentData ?? {}) as Record<string, unknown>;
  if (!agentData.weatherImpact) gaps.push('Weather');
  if (!Array.isArray(agentData.redditSignals) || agentData.redditSignals.length === 0) gaps.push('Reddit/social signals');
  return gaps;
}

export function summarizeBrief(
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
    contentOpportunities: normalized.contentOpportunities.slice(0, 6).map((item) => ({
      title: item.title ?? 'Opportunity',
      summary: item.summary ?? '',
      priority: item.priority ?? '',
      format: item.format ?? '',
      source: item.source ?? '',
      url: item.url ?? '',
    })),
    contentAngle: latestContent?.content?.content_angle ?? null,
    unavailableSources: computeUnavailableSources(latestBrief, latestContent),
  };
}

export async function loadLeadStatsSafe(): Promise<import('@/lib/leads/stats').LeadStats | null> {
  try {
    const { getLeadStats } = await import('@/lib/leads/stats');
    return await getLeadStats(30);
  } catch (err) {
    console.error('[brief] leadStats load failed', err);
    return null;
  }
}
