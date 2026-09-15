import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import { fsGetDoc, fsQueryCollection } from '@/lib/server/firestoreRest';
import { storageDownload } from '@/lib/server/firebaseStorage';
import { NOT_THE_RUG_BRIEF_DATA_DIR } from '@/lib/not-the-rug-brief/dataDir';
import { loadBriefBundle } from '@/lib/not-the-rug-brief/pipelineLoader';
import { sanitizeLatestBrief, sanitizeLatestContent, summarizeBrief, applySupplementalSignalFallbacks, loadLeadStatsSafe } from '@/lib/not-the-rug-brief/summarize';
import {
  NOT_THE_RUG_BRIEF_COLLECTIONS,
  type BriefArtifacts,
  type LatestNotTheRugBrief,
  type NotTheRugBriefRunRecord,
  type PersistedLatestBriefRecord,
} from '@/lib/not-the-rug-brief/types';

/**
 * READ-ONLY module: never imports lib/generator/server (sharp) or the CJS
 * pipeline's run entry point. Every admin/email route that only displays or
 * emails the brief should import from here, not from run.ts, so their
 * deployed function bundle stays free of the image renderer.
 */

export async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw error;
  }
}

export function buildArtifactPaths(): BriefArtifacts {
  return {
    latestBriefJsonPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'briefs', 'not-the-rug', 'latest.json'),
    latestContentJsonPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'content', 'not-the-rug', 'latest-content.json'),
    latestMarkdownPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'briefs', 'not-the-rug', 'latest-brief.md'),
    latestHtmlPath: path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'briefs', 'not-the-rug', 'latest-brief.html'),
  };
}

export function buildDatedReportFilename(prefix: string, date: Date, extension: string): string {
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

export async function getPersistedLatestBriefState(): Promise<PersistedLatestBriefRecord | null> {
  const doc = await fsGetDoc(`${NOT_THE_RUG_BRIEF_COLLECTIONS.state}/latest`);
  if (!doc.exists || !doc.data) return null;
  return doc.data as unknown as PersistedLatestBriefRecord;
}

export function hydrateLatestBriefFromRecord(record: PersistedLatestBriefRecord): LatestNotTheRugBrief {
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
    updatedAt: record.updatedAt ?? null,
  };
}

export async function getLatestNotTheRugBrief(): Promise<LatestNotTheRugBrief> {
  const persisted = await getPersistedLatestBriefState().catch((err) => {
    console.error('[brief] failed to read persisted latest state, falling back to local artifacts:', err instanceof Error ? err.message : err);
    return null;
  });
  if (persisted) {
    const hydrated = hydrateLatestBriefFromRecord(persisted);
    return { ...hydrated, leadStats: await loadLeadStatsSafe() };
  }

  // Cold start / never-persisted fallback: read whatever the CJS pipeline last
  // wrote locally. This requires the pipeline's read-only artifact accessor,
  // not its run entry point — no image generation happens on this path.
  const bundleData = await loadBriefBundle().getLatestNotTheRugArtifacts();

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
    updatedAt: null,
  };
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

export async function getNotTheRugBriefHistory(limit = 20): Promise<NotTheRugBriefRunRecord[]> {
  const docs = await fsQueryCollection(NOT_THE_RUG_BRIEF_COLLECTIONS.runs, 'createdAt', 'DESCENDING', limit);
  return docs as unknown as NotTheRugBriefRunRecord[];
}
