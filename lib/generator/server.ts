import { readFileSync } from 'fs';
import { randomUUID } from 'node:crypto';
import { basename, join } from 'path';
import sharp from 'sharp';
import { fsGetDoc, fsQueryCollection, fsSetDoc } from '@/lib/server/firestoreRest';
import { storageDownload, storageList, storageUpload } from '@/lib/server/firebaseStorage';
import { COLLECTIONS, STORAGE_PATHS } from '@/lib/photos/types';
import type { PhotoUpload } from '@/lib/photos/types';
import {
  CANVAS_PRESETS,
  DEFAULT_LOGO_ASSET,
  DEFAULT_LOGO_PLACEMENT,
  GENERATOR_COLLECTIONS,
  GENERATOR_STORAGE_PATHS,
  LOGO_ASSETS,
  clampPlacement,
  placementToPixels,
  type CanvasPresetKey,
  type GeneratorImageSummary,
  type GeneratorRender,
  type GeneratorRenderRequest,
  type LogoAssetKey,
  type NormalizedLogoPlacement,
} from '@/lib/generator/types';
import { getSharpCoverOptions } from '@/lib/generator/fitUtils';

export type { GeneratorImageSummary } from '@/lib/generator/types';

export interface RenderGeneratorImageOptions {
  adminEmail: string;
  sourcePhotoId?: string;
  canvasPreset?: CanvasPresetKey;
  logoAsset?: LogoAssetKey;
  placement?: NormalizedLogoPlacement;
  renderer?: GeneratorRenderRequest['renderer'];
  origin?: string | null;
}

function normalizeLogoName(value: string): string {
  return basename(value).replace(/\.[^.]+$/, '').toLowerCase();
}

async function loadGeneratorLogoFromOrigin(
  logoAsset: LogoAssetKey,
  origin: string | null,
): Promise<{ buffer: Buffer; source: string }> {
  const wanted = normalizeLogoName(logoAsset);

  try {
    const storageLogos = await storageList(`${STORAGE_PATHS.logos}/`);
    const match = storageLogos.find((file) => normalizeLogoName(file.name) === wanted);
    if (match) {
      const buffer = await storageDownload(match.storagePath);
      return { buffer, source: match.storagePath };
    }
  } catch (err) {
    console.warn(`[generator] logo storage lookup failed for "${logoAsset}", falling back:`, err instanceof Error ? err.message : err);
  }

  if (origin) {
    try {
      const publicUrl = new URL(LOGO_ASSETS[logoAsset].previewSrc, origin).toString();
      const res = await fetch(publicUrl, { cache: 'no-store' });
      if (res.ok) {
        return {
          buffer: Buffer.from(await res.arrayBuffer()),
          source: publicUrl,
        };
      }
      console.warn(`[generator] logo public asset fetch for "${logoAsset}" returned ${res.status}, falling back to local file.`);
    } catch (err) {
      console.warn(`[generator] logo public asset fetch failed for "${logoAsset}", falling back to local file:`, err instanceof Error ? err.message : err);
    }
  }

  const localPaths: Record<LogoAssetKey, string> = {
    notRugGreen: join(/*turbopackIgnore: true*/ process.cwd(), 'app-assets/generator-logos/notRugGreen.png'),
    notRugYellow: join(/*turbopackIgnore: true*/ process.cwd(), 'app-assets/generator-logos/notRugYellow.png'),
  };

  const logoFilePath = localPaths[logoAsset];
  try {
    const buffer = readFileSync(logoFilePath);
    return { buffer, source: logoFilePath };
  } catch (err) {
    // Every fallback layer (Storage, public asset, local file) failed. Surface
    // this clearly rather than letting a generic ENOENT bubble up — it usually
    // means app-assets/generator-logos was excluded from this deployment's
    // function bundle and no copy was uploaded to Storage either.
    throw new Error(
      `Logo asset "${logoAsset}" is not reachable: not found in Storage (${STORAGE_PATHS.logos}/), ` +
      `not fetchable from the public site, and not present at the local fallback path ${logoFilePath}. ` +
      `Upload it to Storage or verify it is included in the deployed bundle.`,
      { cause: err },
    );
  }
}

async function makeCircularLogo(logoBuffer: Buffer, size: number): Promise<Buffer> {
  const resized = await sharp(logoBuffer)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .ensureAlpha()
    .toBuffer();

  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );

  return sharp(resized)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

export async function renderGeneratorImage(
  options: RenderGeneratorImageOptions,
): Promise<GeneratorRender> {
  const {
    adminEmail,
    sourcePhotoId,
    canvasPreset = 'portrait',
    logoAsset = DEFAULT_LOGO_ASSET,
    placement = DEFAULT_LOGO_PLACEMENT,
    renderer = 'sharp',
    origin = null,
  } = options;

  if (renderer === 'ffmpeg') {
    console.warn('[generator] "ffmpeg" renderer was requested but is not available; rendering with sharp instead.');
  }

  const normalizedPlacement = clampPlacement(placement);

  let resolvedSourcePhotoId = sourcePhotoId;
  if (!resolvedSourcePhotoId) {
    const uploads = await fsQueryCollection(COLLECTIONS.photoUploads, 'uploadedAt', 'DESCENDING', 100);
    if (uploads.length === 0) {
      throw new Error('No uploaded images available for automatic brief image generation');
    }
    const pick = uploads[Math.floor(Math.random() * uploads.length)] as unknown as PhotoUpload;
    resolvedSourcePhotoId = pick.id;
  }

  const docResult = await fsGetDoc(`${COLLECTIONS.photoUploads}/${resolvedSourcePhotoId}`);
  if (!docResult.exists || !docResult.data) {
    throw new Error('Source photo not found for generator render');
  }

  const sourceUpload = docResult.data as unknown as PhotoUpload;
  if (!sourceUpload.storagePath) {
    throw new Error('Source photo is missing its storage path');
  }

  const sourceBuffer = await storageDownload(sourceUpload.storagePath);
  const canvasCfg = CANVAS_PRESETS[canvasPreset];
  const coverOpts = getSharpCoverOptions(canvasCfg.width, canvasCfg.height);

  const canvasBuffer = await sharp(sourceBuffer)
    .rotate()
    .resize(coverOpts)
    .jpeg({ quality: 90 })
    .toBuffer();

  const logoFileBuffer = (await loadGeneratorLogoFromOrigin(logoAsset, origin)).buffer;
  const { size: logoSize, left: logoLeft, top: logoTop } = placementToPixels(
    normalizedPlacement,
    canvasCfg.width,
    canvasCfg.height,
  );
  const circularLogo = await makeCircularLogo(logoFileBuffer, logoSize);

  const finalBuffer = await sharp(canvasBuffer)
    .composite([{ input: circularLogo, left: Math.max(0, logoLeft), top: Math.max(0, logoTop) }])
    .jpeg({ quality: 92 })
    .toBuffer();

  const id = randomUUID();
  const renderStoragePath = `${GENERATOR_STORAGE_PATHS.rendered}/${id}.jpg`;
  const renderDownloadURL = await storageUpload(renderStoragePath, finalBuffer, 'image/jpeg');

  const record: GeneratorRender = {
    id,
    sourcePhotoId: resolvedSourcePhotoId,
    sourceStoragePath: sourceUpload.storagePath,
    canvasPreset,
    canvasWidth: canvasCfg.width,
    canvasHeight: canvasCfg.height,
    logoAsset,
    placement: normalizedPlacement,
    // Always sharp: this function composites directly with sharp above and
    // never actually dispatches to lib/media/createRenderer. Recording the
    // requested-but-unused 'ffmpeg' value here would misreport what ran.
    rendererUsed: 'sharp',
    renderStoragePath,
    renderDownloadURL,
    createdBy: adminEmail,
    createdAt: new Date().toISOString(),
    status: 'complete',
  };

  await fsSetDoc(
    `${GENERATOR_COLLECTIONS.generatorRenders}/${id}`,
    record as unknown as Record<string, unknown>,
  );

  return record;
}

export function summarizeGeneratorRender(render: GeneratorRender): GeneratorImageSummary {
  return {
    renderId: render.id,
    renderDownloadURL: render.renderDownloadURL,
    renderStoragePath: render.renderStoragePath,
    canvasPreset: render.canvasPreset,
    logoAsset: render.logoAsset,
    sourcePhotoId: render.sourcePhotoId,
    sourceStoragePath: render.sourceStoragePath,
  };
}
