import 'server-only';

import path from 'path';
import { randomUUID } from 'node:crypto';
import { fsCreateDoc, fsDeleteDoc, fsGetDoc, fsSetDoc } from '@/lib/server/firestoreRest';
import { storageUploadPrivate } from '@/lib/server/firebaseStorage';
import { renderGeneratorImage, summarizeGeneratorRender } from '@/lib/generator/server';
import { type BriefRunCost, assembleRunCost } from '@/lib/not-the-rug-brief/costs';
import { NOT_THE_RUG_BRIEF_DATA_DIR } from '@/lib/not-the-rug-brief/dataDir';
import { loadBriefBundle, type BriefBundleRunResult } from '@/lib/not-the-rug-brief/pipelineLoader';
import {
  sanitizeLatestBrief,
  sanitizeLatestContent,
  summarizeBrief,
  applySupplementalSignalFallbacks,
  loadLeadStatsSafe,
} from '@/lib/not-the-rug-brief/summarize';
import { buildArtifactPaths, readOptionalText, getPersistedLatestBriefState } from '@/lib/not-the-rug-brief/read';
import {
  NOT_THE_RUG_BRIEF_COLLECTIONS,
  NOT_THE_RUG_BRIEF_STORAGE_PATHS,
  type BriefArtifacts,
  type BriefReportPaths,
  type NotTheRugBriefRunRecord,
  type PersistedLatestBriefRecord,
  type RunNotTheRugBriefResult,
} from '@/lib/not-the-rug-brief/types';

/**
 * GENERATION module: this is the only place in lib/not-the-rug-brief that
 * imports the sharp-based image renderer and the CJS pipeline's run entry
 * point. Only cron/admin routes that actually trigger generation should
 * import from here.
 */

// Generous ceiling under the routes' `maxDuration = 60` so a hung remote call
// fails cleanly (recorded as a truthful error) instead of letting the host
// kill the function mid-write. See the P3B report for the schedule decision —
// this number does not by itself prove 60s is enough for a *successful* run.
const PIPELINE_TIMEOUT_MS = Number(process.env.NOT_THE_RUG_BRIEF_PIPELINE_TIMEOUT_MS) || 50_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// ── Run lease ────────────────────────────────────────────────────────────────
// A second concurrent run must lose this create and not proceed at all — no
// pipeline invocation, no filesystem writes. fsCreateDoc's create-if-absent
// semantics make this atomic across concurrent invocations.

const LEASE_PATH = `${NOT_THE_RUG_BRIEF_COLLECTIONS.leases}/active`;
// Every route that calls runNotTheRugBrief caps at maxDuration = 60 (see
// app/admin/not-the-rug/run-brief, app/api/cron/not-the-rug-brief,
// app/admin/founder-brief/run-and-send), so a run still alive past that is
// already being killed by the host. 3x that cap is a deliberate margin for
// platform overhead around the hard timeout, not an arbitrary round number —
// it must not be so large that a genuinely crashed run blocks generation for
// most of an hour.
const LEASE_STALE_MS = 3 * 60 * 1000;

async function acquireLease(runId: string): Promise<{ acquired: boolean; reason?: string }> {
  const seed = { runId, startedAt: new Date().toISOString(), pid: process.pid };
  const first = await fsCreateDoc(LEASE_PATH, seed);
  if (first.created) return { acquired: true };

  const existing = await fsGetDoc(LEASE_PATH).catch(() => null);
  const startedAt = existing?.data?.startedAt as string | undefined;
  const ageMs = startedAt ? Date.now() - new Date(startedAt).getTime() : Number.POSITIVE_INFINITY;

  if (ageMs <= LEASE_STALE_MS) {
    return { acquired: false, reason: `Another brief run is already in progress (started ${startedAt ?? 'unknown time'}).` };
  }

  // Stale lease from a run that crashed without releasing it — reclaim.
  // Not perfectly atomic (delete then create is two operations), but this
  // path only matters during crash recovery, not normal concurrent traffic,
  // which fsCreateDoc alone already serializes.
  await fsDeleteDoc(LEASE_PATH).catch(() => {});
  const retry = await fsCreateDoc(LEASE_PATH, seed);
  return retry.created ? { acquired: true } : { acquired: false, reason: 'Another brief run is already in progress.' };
}

async function releaseLease(runId: string): Promise<void> {
  const existing = await fsGetDoc(LEASE_PATH).catch(() => null);
  if (existing?.exists && (existing.data as { runId?: string } | undefined)?.runId === runId) {
    await fsDeleteDoc(LEASE_PATH).catch((err) => {
      console.error('[brief] failed to release run lease', err instanceof Error ? err.message : err);
    });
  }
}

// ── Private artifact publishing (R09) ───────────────────────────────────────

function buildStorageArchivePath(reportHtmlPath: string | undefined | null, timestamp: string | null | undefined): string {
  const fileName = reportHtmlPath
    ? path.basename(reportHtmlPath)
    : `NotTheRug-${(timestamp ? new Date(timestamp) : new Date()).toISOString().replace(/[:.]/g, '-')}.html`;
  return `${NOT_THE_RUG_BRIEF_STORAGE_PATHS.archiveDir}/${fileName}`;
}

/**
 * Uploads the freshly generated HTML as a private artifact (storageUploadPrivate,
 * under the private/ prefix — no public token URL is ever issued for it).
 * Existing reports already published under the old public-URL scheme are left
 * alone: rotating/revoking those tokens is a separate, explicit decision (see
 * the P3B report).
 */
async function uploadHostedHtmlArtifactsPrivately(
  htmlPath: string,
  timestamp: string | null | undefined,
): Promise<{ latestHtmlStoragePath: string; htmlStoragePath: string }> {
  const html = await readOptionalText(htmlPath);
  if (!html) {
    throw new Error(`No local HTML report found at ${htmlPath} to publish`);
  }

  const htmlBuffer = Buffer.from(html, 'utf8');
  const archiveStoragePath = buildStorageArchivePath(htmlPath, timestamp);

  await Promise.all([
    storageUploadPrivate(archiveStoragePath, htmlBuffer, 'text/html; charset=utf-8'),
    storageUploadPrivate(NOT_THE_RUG_BRIEF_STORAGE_PATHS.latestHtml, htmlBuffer, 'text/html; charset=utf-8'),
  ]);

  return { latestHtmlStoragePath: NOT_THE_RUG_BRIEF_STORAGE_PATHS.latestHtml, htmlStoragePath: archiveStoragePath };
}

// ── Run orchestration ────────────────────────────────────────────────────────

export async function runNotTheRugBrief(options: { fresh?: boolean } = {}): Promise<RunNotTheRugBriefResult> {
  const runId = randomUUID();
  const runStartedAt = Date.now();

  const lease = await acquireLease(runId);
  if (!lease.acquired) {
    const persisted = await getPersistedLatestBriefState().catch(() => null);
    return buildLeaseRejectedResult(runId, lease.reason ?? 'Another brief run is already in progress.', persisted);
  }

  // Per-run temp directory: not-the-rug-brief/store.js resolves this env var
  // fresh on every filesystem call, so pointing it at a run-specific
  // subdirectory for the lifetime of this call keeps sequential runs (the
  // lease above already forbids concurrent ones) from reading or overwriting
  // one another's "latest" files mid-write.
  const previousDataDirEnv = process.env.NOT_THE_RUG_BRIEF_DATA_DIR;
  process.env.NOT_THE_RUG_BRIEF_DATA_DIR = path.join(NOT_THE_RUG_BRIEF_DATA_DIR, 'runs', runId);

  try {
    return await executeRun(runId, runStartedAt, options);
  } finally {
    process.env.NOT_THE_RUG_BRIEF_DATA_DIR = previousDataDirEnv;
    await releaseLease(runId);
  }
}

async function buildLeaseRejectedResult(
  runId: string,
  reason: string,
  persisted: PersistedLatestBriefRecord | null,
): Promise<RunNotTheRugBriefResult> {
  const latestBrief = sanitizeLatestBrief(persisted?.latestBrief ?? null);
  const latestContent = sanitizeLatestContent(persisted?.latestContent ?? null);
  const artifacts = { ...buildArtifactPaths(), ...(persisted?.artifacts ?? {}) };

  const payload: RunNotTheRugBriefResult = {
    runId,
    status: 'error',
    stage: 'lease',
    error: reason,
    latestBrief,
    latestContent,
    guardianFlags: latestContent?.guardianFlags ?? null,
    scoutPriorityAction: latestContent?.scoutPriorityAction ?? null,
    reportPaths: persisted?.reportPaths ?? null,
    artifacts,
    summary: persisted?.summary ?? summarizeBrief(latestBrief, latestContent),
    generatedImage: persisted?.generatedImage ?? null,
    imageGenerationError: null,
    runCost: null,
    leadStats: await loadLeadStatsSafe(),
    artifactUploadOk: false,
    artifactUploadError: null,
    latestStatePersisted: false,
    latestStateError: null,
    runRecordPersisted: false,
    runRecordError: null,
  };

  const { persisted: runRecordPersisted, error: runRecordError } = await persistBriefRunSafe(payload);
  payload.runRecordPersisted = runRecordPersisted;
  payload.runRecordError = runRecordError;
  return payload;
}

async function executeRun(
  runId: string,
  runStartedAt: number,
  options: { fresh?: boolean },
): Promise<RunNotTheRugBriefResult> {
  let result: BriefBundleRunResult;
  try {
    result = await withTimeout(loadBriefBundle().runNotTheRugBrief(options), PIPELINE_TIMEOUT_MS, 'Brief pipeline');
  } catch (err) {
    result = {
      status: 'error',
      stage: 'pipeline',
      error: err instanceof Error ? err.message : String(err),
      artifacts: {},
    };
  }

  const durationMs = Date.now() - runStartedAt;

  let generatedImage = null as RunNotTheRugBriefResult['generatedImage'];
  let imageGenerationError: string | null = null;

  if (result.status === 'success') {
    try {
      const render = await renderGeneratorImage({
        adminEmail: 'not-the-rug-brief',
        canvasPreset: 'portrait',
        logoAsset: 'notRugGreen',
      });
      generatedImage = summarizeGeneratorRender(render);
    } catch (err) {
      imageGenerationError = err instanceof Error ? err.message : String(err);
      console.error('[brief] generator image render failed:', imageGenerationError);
    }
  }

  let sanitizedLatestBrief = await applySupplementalSignalFallbacks(
    sanitizeLatestBrief(result.latestBrief ?? null),
  );
  let sanitizedLatestContent = sanitizeLatestContent(result.latestContent ?? null);
  let artifacts: BriefArtifacts = { ...buildArtifactPaths(), ...(result.artifacts ?? {}) };
  let reportPaths: BriefReportPaths = { ...(result.reportPaths ?? {}) };

  let artifactUploadOk = false;
  let artifactUploadError: string | null = null;

  if (result.status === 'success') {
    try {
      const hosted = await uploadHostedHtmlArtifactsPrivately(
        reportPaths.htmlPath ?? artifacts.latestHtmlPath,
        sanitizedLatestContent?.timestamp ?? sanitizedLatestBrief?.timestamp ?? new Date().toISOString(),
      );
      artifacts = { ...artifacts, latestHtmlStoragePath: hosted.latestHtmlStoragePath };
      reportPaths = { ...reportPaths, htmlStoragePath: hosted.htmlStoragePath, latestHtmlStoragePath: hosted.latestHtmlStoragePath };
      artifactUploadOk = true;
    } catch (err) {
      artifactUploadError = err instanceof Error ? err.message : String(err);
      console.error('[brief] private HTML artifact upload failed:', artifactUploadError);
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

  let runCost: BriefRunCost | null = null;
  if (result.status === 'success' && result.runCostData?.stageCosts?.length) {
    const hasImage = generatedImage !== null;
    runCost = assembleRunCost(result.runCostData.stageCosts, {
      firestoreWrites: 1,
      firestoreReads: 2,
      storageUploads: hasImage ? 1 : 0,
      storageBytes: hasImage ? 150_000 : 0,
    });
  }

  const payload: RunNotTheRugBriefResult = {
    runId,
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
    imageGenerationError,
    runCost,
    leadStats: await loadLeadStatsSafe(),
    artifactUploadOk,
    artifactUploadError,
    latestStatePersisted: false,
    latestStateError: null,
    runRecordPersisted: false,
    runRecordError: null,
  };

  // Publish "latest" only once we actually have a successfully uploaded
  // artifact to point it at — otherwise the previous good state stays live.
  if (result.status === 'success' && artifactUploadOk) {
    const record: PersistedLatestBriefRecord = {
      updatedAt: new Date().toISOString(),
      runId,
      latestBrief: payload.latestBrief ?? null,
      latestContent: payload.latestContent ?? null,
      artifacts: payload.artifacts,
      summary: payload.summary,
      generatedImage: payload.generatedImage,
      reportPaths: payload.reportPaths ?? null,
      runCost: payload.runCost ?? null,
    };
    try {
      await fsSetDoc(`${NOT_THE_RUG_BRIEF_COLLECTIONS.state}/latest`, record as unknown as Record<string, unknown>);
      payload.latestStatePersisted = true;
    } catch (err) {
      payload.latestStateError = err instanceof Error ? err.message : String(err);
      console.error('[brief] failed to persist latest state — a run whose state fails to persist is not a clean success:', payload.latestStateError);
    }
  }

  const { persisted: runRecordPersisted, error: runRecordError } = await persistBriefRunSafe(payload, durationMs);
  payload.runRecordPersisted = runRecordPersisted;
  payload.runRecordError = runRecordError;

  return payload;
}

function buildRunRecord(result: RunNotTheRugBriefResult, durationMs: number | null = null): NotTheRugBriefRunRecord {
  const createdAt = result.latestContent?.timestamp
    ?? result.latestBrief?.timestamp
    ?? result.pipelineStartedAt
    ?? new Date().toISOString();

  return {
    id: result.runId,
    runId: result.runId,
    createdAt,
    durationMs,
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
    unavailableSources: result.summary.unavailableSources,
    latestBriefTimestamp: result.latestBrief?.timestamp ?? null,
    latestContentTimestamp: result.latestContent?.timestamp ?? null,
    briefHuman: result.latestBrief?.humanBrief ?? null,
    content: result.latestContent?.content ?? null,
    guardianFlags: result.guardianFlags ?? null,
    artifacts: result.artifacts,
    reportPaths: result.reportPaths ?? null,
    generatedImage: result.generatedImage,
    imageGenerationError: result.imageGenerationError,
    runCost: result.runCost ?? null,
    artifactUploadOk: result.artifactUploadOk,
    artifactUploadError: result.artifactUploadError,
  };
}

async function persistBriefRunSafe(
  result: RunNotTheRugBriefResult,
  durationMs: number | null = null,
): Promise<{ persisted: boolean; error: string | null }> {
  const record = buildRunRecord(result, durationMs);
  try {
    await fsSetDoc(`${NOT_THE_RUG_BRIEF_COLLECTIONS.runs}/${record.id}`, record as unknown as Record<string, unknown>);
    return { persisted: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[brief] failed to persist run history record:', message);
    return { persisted: false, error: message };
  }
}
