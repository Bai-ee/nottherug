/**
 * Orchestration coverage for lib/not-the-rug-brief/run.ts. Every remote
 * dependency (Firestore, Storage, the sharp-based generator, lead stats, and
 * the CJS pipeline itself) is mocked — nothing here reaches the network,
 * invokes a paid model, or touches real storage. The CJS pipeline boundary is
 * mocked via '@/lib/not-the-rug-brief/pipelineLoader', the one seam run.ts
 * uses to load it.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import os from 'os';
import path from 'path';
import { fixtureLatestBrief, fixtureLatestContent } from '../fixtures/not-the-rug-brief';

// A short pipeline timeout so the timeout test doesn't slow the suite down,
// and an isolated, empty data dir so the not-the-rug-brief CJS store never
// reads this developer's real local data/not-the-rug-brief/** artifacts (a
// stray latest-weather.json there would silently make the "missing source"
// test flaky). Both are read once at module load, so they must be set before
// run.ts is first imported — the dynamic import in beforeAll below, not a
// static one, so this assignment runs first.
process.env.NOT_THE_RUG_BRIEF_PIPELINE_TIMEOUT_MS = '150';
process.env.NOT_THE_RUG_BRIEF_DATA_DIR = path.join(os.tmpdir(), `ntr-brief-test-${process.pid}-${Date.now()}`);

// Next.js resolves the `server-only` sentinel package through its own
// compiler; outside of a Next build (e.g. here, under Vitest) it isn't an
// installed package at all, so it must be stubbed for any of these modules
// to load.
vi.mock('server-only', () => ({}));

type FsDoc = { data: Record<string, unknown> };
let store: Map<string, FsDoc>;

const fsCreateDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  if (store.has(path)) return { created: false };
  store.set(path, { data });
  return { created: true };
});
const fsGetDoc = vi.fn(async (path: string) => {
  const doc = store.get(path);
  return doc ? { exists: true, data: doc.data } : { exists: false };
});
function defaultSetDoc(path: string, data: Record<string, unknown>): void {
  store.set(path, { data });
}
const fsSetDoc = vi.fn(async (path: string, data: Record<string, unknown>) => {
  defaultSetDoc(path, data);
});
const fsDeleteDoc = vi.fn(async (path: string) => {
  store.delete(path);
});
const fsQueryCollection = vi.fn(async () => [] as unknown[]);
const fsIncrementField = vi.fn(async () => 1);

vi.mock('@/lib/server/firestoreRest', () => ({
  fsCreateDoc,
  fsGetDoc,
  fsSetDoc,
  fsDeleteDoc,
  fsQueryCollection,
  fsIncrementField,
}));

const storageUploadPrivate = vi.fn(async () => {});
vi.mock('@/lib/server/firebaseStorage', () => ({
  storageUploadPrivate,
  storageDownload: vi.fn(async () => Buffer.from('<html></html>')),
  storageUpload: vi.fn(),
  storageDelete: vi.fn(),
  storageList: vi.fn(async () => []),
  PRIVATE_STORAGE_PREFIX: 'private',
}));

const fixtureRender = {
  id: 'render-1',
  sourcePhotoId: 'photo-1',
  sourceStoragePath: 'photos/originals/photo-1.jpg',
  canvasPreset: 'portrait',
  canvasWidth: 1080,
  canvasHeight: 1350,
  logoAsset: 'notRugGreen',
  placement: { xRatio: 0.5, yRatio: 0.5, diameterRatio: 0.18 },
  rendererUsed: 'sharp',
  renderStoragePath: 'generator/rendered/render-1.jpg',
  renderDownloadURL: 'https://firebasestorage.googleapis.com/v0/b/x/o/render-1.jpg?alt=media&token=abc',
  createdBy: 'not-the-rug-brief',
  createdAt: '2026-09-01T12:10:00.000Z',
  status: 'complete',
};
const renderGeneratorImage = vi.fn(async () => fixtureRender);
const summarizeGeneratorRender = vi.fn((render: typeof fixtureRender) => ({
  renderId: render.id,
  renderDownloadURL: render.renderDownloadURL,
  renderStoragePath: render.renderStoragePath,
  canvasPreset: render.canvasPreset,
  logoAsset: render.logoAsset,
  sourcePhotoId: render.sourcePhotoId,
  sourceStoragePath: render.sourceStoragePath,
}));
vi.mock('@/lib/generator/server', () => ({ renderGeneratorImage, summarizeGeneratorRender }));

vi.mock('@/lib/leads/stats', () => ({ getLeadStats: vi.fn(async () => null) }));

let runNotTheRugBriefMock = vi.fn();
const getLatestNotTheRugArtifactsMock = vi.fn(async () => ({ latestBrief: null, latestContent: null, artifacts: {} }));
vi.mock('@/lib/not-the-rug-brief/pipelineLoader', () => ({
  loadBriefBundle: () => ({
    runNotTheRugBrief: (...args: unknown[]) => runNotTheRugBriefMock(...args),
    getLatestNotTheRugArtifacts: () => getLatestNotTheRugArtifactsMock(),
  }),
}));

function successResult() {
  return {
    status: 'success' as const,
    pipelineStartedAt: '2026-09-01T12:00:00.000Z',
    latestBrief: fixtureLatestBrief(),
    latestContent: fixtureLatestContent(),
    guardianFlags: fixtureLatestContent().guardianFlags,
    scoutPriorityAction: fixtureLatestContent().scoutPriorityAction,
    reportPaths: { markdownPath: '/tmp/x/latest-brief.md', htmlPath: '/tmp/x/latest-brief.html' },
    artifacts: {
      latestBriefJsonPath: '/tmp/x/latest.json',
      latestContentJsonPath: '/tmp/x/latest-content.json',
      latestMarkdownPath: '/tmp/x/latest-brief.md',
      latestHtmlPath: '/tmp/x/latest-brief.html',
    },
    runCostData: { stageCosts: [] },
  };
}

let runNotTheRugBrief: typeof import('@/lib/not-the-rug-brief/run')['runNotTheRugBrief'];

beforeAll(async () => {
  ({ runNotTheRugBrief } = await import('@/lib/not-the-rug-brief/run'));
});

beforeEach(() => {
  store = new Map();
  vi.clearAllMocks();
  runNotTheRugBriefMock = vi.fn();
});

/**
 * Stubs fs.promises.readFile so read.ts's readOptionalText() sees the fixture
 * HTML for the report path, while not-the-rug-brief/store.js's JSON reads
 * (getLatestWeather/getLatestReddit, invoked by applySupplementalSignalFallbacks)
 * still see a clean ENOENT instead of accidentally parsing HTML as JSON.
 */
async function stubReportHtmlOnDisk(): Promise<void> {
  const fs = await import('fs');
  vi.spyOn(fs.promises, 'readFile').mockImplementation(async (filePath: unknown) => {
    if (String(filePath).endsWith('.html')) return '<html>report</html>';
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  });
}

describe('runNotTheRugBrief — success path', () => {
  it('persists latest state and the run history record, and reports which artifact stage ran', async () => {
    await stubReportHtmlOnDisk();

    runNotTheRugBriefMock.mockResolvedValue(successResult());

    const result = await runNotTheRugBrief({ fresh: false });

    expect(result.status).toBe('success');
    expect(result.artifactUploadOk).toBe(true);
    expect(result.artifactUploadError).toBeNull();
    expect(result.latestStatePersisted).toBe(true);
    expect(result.runRecordPersisted).toBe(true);
    expect(result.generatedImage?.renderId).toBe('render-1');
    expect(storageUploadPrivate).toHaveBeenCalledTimes(2); // archive + latest
    expect(store.has('notTheRugBriefState/latest')).toBe(true);
    expect(store.has(`notTheRugBriefRuns/${result.runId}`)).toBe(true);
    // Lease is released after a completed run.
    expect(store.has('notTheRugBriefLeases/active')).toBe(false);
  });
});

describe('runNotTheRugBrief — provider timeout', () => {
  it('produces a truthful error state and keeps the last good "latest" untouched', async () => {
    // Seed a pre-existing good "latest" state, as if a prior successful run had published it.
    store.set('notTheRugBriefState/latest', {
      data: { updatedAt: '2026-08-31T12:00:00.000Z', runId: 'previous-run', latestBrief: fixtureLatestBrief(), latestContent: fixtureLatestContent(), artifacts: {}, summary: {}, generatedImage: null, reportPaths: null, runCost: null },
    });

    runNotTheRugBriefMock.mockReturnValue(new Promise(() => {})); // never resolves — simulates a hung remote call

    const result = await runNotTheRugBrief({ fresh: false });

    expect(result.status).toBe('error');
    expect(result.stage).toBe('pipeline');
    expect(result.error).toMatch(/timed out/i);
    // "latest" must be exactly what it was before this run — never overwritten by a failed run.
    expect(store.get('notTheRugBriefState/latest')?.data.runId).toBe('previous-run');
    expect(result.latestStatePersisted).toBe(false);
  }, 10_000);
});

describe('runNotTheRugBrief — missing optional source', () => {
  it('reports weather as unavailable rather than presenting the brief as complete', async () => {
    await stubReportHtmlOnDisk();

    const noWeather = successResult();
    noWeather.latestBrief = fixtureLatestBrief({ weatherImpact: null });
    runNotTheRugBriefMock.mockResolvedValue(noWeather);

    const result = await runNotTheRugBrief({ fresh: false });

    expect(result.status).toBe('success');
    expect(result.summary.unavailableSources).toContain('Weather');
  });
});

describe('runNotTheRugBrief — artifact upload failure', () => {
  it('surfaces the failure and does not publish a broken "latest" pointer', async () => {
    await stubReportHtmlOnDisk();
    storageUploadPrivate.mockRejectedValueOnce(new Error('Private storage upload failed (500)'));

    store.set('notTheRugBriefState/latest', {
      data: { updatedAt: '2026-08-31T12:00:00.000Z', runId: 'previous-run', latestBrief: null, latestContent: null, artifacts: {}, summary: {}, generatedImage: null, reportPaths: null, runCost: null },
    });

    runNotTheRugBriefMock.mockResolvedValue(successResult());

    const result = await runNotTheRugBrief({ fresh: false });

    expect(result.status).toBe('success'); // generation itself succeeded
    expect(result.artifactUploadOk).toBe(false);
    expect(result.artifactUploadError).toMatch(/Private storage upload failed/);
    expect(result.latestStatePersisted).toBe(false);
    // Retained: the previous good state was never overwritten.
    expect(store.get('notTheRugBriefState/latest')?.data.runId).toBe('previous-run');
    // The failure is still visible in run history rather than silently dropped.
    expect(result.runRecordPersisted).toBe(true);
  });
});

describe('runNotTheRugBrief — database save failure', () => {
  it('surfaces a failed "latest" state write instead of swallowing it', async () => {
    await stubReportHtmlOnDisk();
    runNotTheRugBriefMock.mockResolvedValue(successResult());
    fsSetDoc.mockImplementation(async (path: string, data: Record<string, unknown>) => {
      if (path === 'notTheRugBriefState/latest') throw new Error('Firestore SET failed');
      defaultSetDoc(path, data);
    });

    const result = await runNotTheRugBrief({ fresh: false });

    expect(result.status).toBe('success');
    expect(result.latestStatePersisted).toBe(false);
    expect(result.latestStateError).toMatch(/Firestore SET failed/);
  });

  it('surfaces a failed run-history write instead of swallowing it', async () => {
    await stubReportHtmlOnDisk();
    runNotTheRugBriefMock.mockResolvedValue(successResult());
    fsSetDoc.mockImplementation(async (path: string, data: Record<string, unknown>) => {
      if (path.startsWith('notTheRugBriefRuns/')) throw new Error('Firestore run-history write failed');
      defaultSetDoc(path, data);
    });

    const result = await runNotTheRugBrief({ fresh: false });

    expect(result.runRecordPersisted).toBe(false);
    expect(result.runRecordError).toMatch(/run-history write failed/);
    // The latest pointer itself still published successfully.
    expect(result.latestStatePersisted).toBe(true);
  });
});

describe('runNotTheRugBrief — concurrent runs', () => {
  it('a second concurrent run loses the lease and never invokes the pipeline', async () => {
    await stubReportHtmlOnDisk();
    runNotTheRugBriefMock.mockResolvedValue(successResult());

    const [a, b] = await Promise.all([runNotTheRugBrief({}), runNotTheRugBrief({})]);
    const results = [a, b];
    const winners = results.filter((r) => r.stage !== 'lease');
    const losers = results.filter((r) => r.stage === 'lease');

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].status).toBe('error');
    expect(losers[0].error).toMatch(/already in progress/i);
    expect(runNotTheRugBriefMock).toHaveBeenCalledTimes(1);
  });
});
