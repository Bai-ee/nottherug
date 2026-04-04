import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { fsGetDoc, fsSetDoc, fsQueryCollection } from '@/lib/server/firestoreRest';
import { storageDownload, storageList, storageUpload } from '@/lib/server/firebaseStorage';
import { COLLECTIONS, STORAGE_PATHS } from '@/lib/photos/types';
import type { PhotoUpload } from '@/lib/photos/types';
import {
  CANVAS_PRESETS,
  GENERATOR_STORAGE_PATHS,
  GENERATOR_COLLECTIONS,
  placementToPixels,
  clampPlacement,
  type GeneratorRenderRequest,
  type GeneratorRender,
  type CanvasPresetKey,
  type LogoAssetKey,
} from '@/lib/generator/types';
import { getSharpCoverOptions } from '@/lib/generator/fitUtils';

export const runtime = 'nodejs';

// ─── Validation ────────────────────────────────────────────────────────────────

const VALID_PRESETS    = new Set<CanvasPresetKey>(['portrait', 'square', 'landscape', 'verticalMax', 'storiesReels']);
const VALID_LOGO_KEYS  = new Set<LogoAssetKey>(['notRugGreen', 'notRugYellow']);

function isValidRequest(b: unknown): b is GeneratorRenderRequest {
  if (!b || typeof b !== 'object') return false;
  const r = b as GeneratorRenderRequest;
  if (!VALID_PRESETS.has(r.canvasPreset)) return false;
  if (!VALID_LOGO_KEYS.has(r.logoAsset)) return false;
  const p = r.placement;
  if (!p || typeof p.xRatio !== 'number' || typeof p.yRatio !== 'number' || typeof p.diameterRatio !== 'number') return false;
  return true;
}

// ─── Circular logo helper ─────────────────────────────────────────────────────

/**
 * Resizes the logo buffer to `size × size` pixels and applies a circular mask.
 * Returns a PNG buffer with a transparent outer circle.
 */
async function makeCircularLogo(logoBuffer: Buffer, size: number): Promise<Buffer> {
  const resized = await sharp(logoBuffer)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .ensureAlpha()
    .toBuffer();

  // SVG circle mask — filled white = opaque; everything outside transparent
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );

  return sharp(resized)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

function normalizeLogoName(value: string): string {
  return basename(value).replace(/\.[^.]+$/, '').toLowerCase();
}

async function loadGeneratorLogo(logoAsset: LogoAssetKey): Promise<{ buffer: Buffer; source: string }> {
  const wanted = normalizeLogoName(logoAsset);

  try {
    const storageLogos = await storageList(`${STORAGE_PATHS.logos}/`);
    const match = storageLogos.find((file) => normalizeLogoName(file.name) === wanted);
    if (match) {
      const buffer = await storageDownload(match.storagePath);
      return { buffer, source: match.storagePath };
    }
  } catch {
    // Storage lookup is best-effort; fall back to the local bundled asset below.
  }

  const localPaths: Record<LogoAssetKey, string> = {
    notRugGreen: join(/*turbopackIgnore: true*/ process.cwd(), 'app-assets/generator-logos/notRugGreen.png'),
    notRugYellow: join(/*turbopackIgnore: true*/ process.cwd(), 'app-assets/generator-logos/notRugYellow.png'),
  };
  const logoFilePath = localPaths[logoAsset];
  const buffer = readFileSync(logoFilePath);
  return { buffer, source: logoFilePath };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Verify admin
  let adminEmail: string;
  try {
    adminEmail = await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return NextResponse.json({ error: 'Invalid or missing fields in request body' }, { status: 400 });
  }

  const { sourcePhotoId, canvasPreset, logoAsset, placement: rawPlacement, renderer = 'sharp' } = body;

  // 3. Clamp placement to ensure it's within bounds
  const placement = clampPlacement(rawPlacement);

  // 4. Resolve the source photo record from Firestore
  let sourcePhotoIdResolved = sourcePhotoId;

  if (!sourcePhotoIdResolved) {
    // Random mode with no ID passed — fall back to picking a random upload
    const uploads = await fsQueryCollection(COLLECTIONS.photoUploads, 'uploadedAt', 'DESCENDING', 100);
    if (uploads.length === 0) {
      return NextResponse.json({ error: 'No uploaded images available' }, { status: 404 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pick = (uploads[Math.floor(Math.random() * uploads.length)] as any) as PhotoUpload;
    sourcePhotoIdResolved = pick.id;
  }

  const docResult = await fsGetDoc(`${COLLECTIONS.photoUploads}/${sourcePhotoIdResolved}`);
  if (!docResult.exists || !docResult.data) {
    return NextResponse.json({ error: 'Source photo not found' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceUpload = (docResult.data as any) as PhotoUpload;
  if (!sourceUpload.storagePath) {
    return NextResponse.json({ error: 'Source photo is missing its storage path' }, { status: 404 });
  }

  // 5. Download source image buffer
  let sourceBuffer: Buffer;
  try {
    sourceBuffer = await storageDownload(sourceUpload.storagePath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not load source image from Storage';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 6. Fit source into canvas using cover (aligned with CSS preview)
  const canvasCfg  = CANVAS_PRESETS[canvasPreset];
  const coverOpts  = getSharpCoverOptions(canvasCfg.width, canvasCfg.height);

  let canvasBuffer: Buffer;
  try {
    canvasBuffer = await sharp(sourceBuffer)
      .rotate()                          // apply EXIF orientation first
      .resize(coverOpts)
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Canvas fit failed' }, { status: 500 });
  }

  // 7. Load the logo from Firebase Storage first so production does not depend on
  //    local filesystem tracing. Fall back to the isolated local PNG for dev.
  let logoFileBuffer: Buffer;
  try {
    const resolved = await loadGeneratorLogo(logoAsset);
    logoFileBuffer = resolved.buffer;
  } catch {
    return NextResponse.json({ error: `Logo asset not found: ${logoAsset}` }, { status: 500 });
  }

  const { size: logoSize, left: logoLeft, top: logoTop } = placementToPixels(
    placement,
    canvasCfg.width,
    canvasCfg.height,
  );

  let circularLogo: Buffer;
  try {
    circularLogo = await makeCircularLogo(logoFileBuffer, logoSize);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Logo processing failed' }, { status: 500 });
  }

  // 8. Composite the circular logo onto the canvas image
  let finalBuffer: Buffer;
  try {
    finalBuffer = await sharp(canvasBuffer)
      .composite([{ input: circularLogo, left: Math.max(0, logoLeft), top: Math.max(0, logoTop) }])
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Composite failed' }, { status: 500 });
  }

  // 9. Upload to Firebase Storage
  const id               = uuidv4();
  const renderStoragePath = `${GENERATOR_STORAGE_PATHS.rendered}/${id}.jpg`;

  let renderDownloadURL: string;
  try {
    renderDownloadURL = await storageUpload(renderStoragePath, finalBuffer, 'image/jpeg');
  } catch (err) {
    console.error('Generator storage upload failed:', err);
    return NextResponse.json({ error: 'Failed to save rendered image' }, { status: 500 });
  }

  // 10. Write metadata to Firestore
  const record: GeneratorRender = {
    id,
    sourcePhotoId: sourcePhotoIdResolved,
    sourceStoragePath: sourceUpload.storagePath,
    canvasPreset,
    canvasWidth: canvasCfg.width,
    canvasHeight: canvasCfg.height,
    logoAsset,
    placement,
    rendererUsed: renderer === 'ffmpeg' ? 'ffmpeg' : 'sharp',
    renderStoragePath,
    renderDownloadURL,
    createdBy: adminEmail,
    createdAt: new Date().toISOString(),
    status: 'complete',
  };

  try {
    await fsSetDoc(
      `${GENERATOR_COLLECTIONS.generatorRenders}/${id}`,
      record as unknown as Record<string, unknown>,
    );
  } catch (err) {
    console.error('Firestore generator render record write failed:', err);
    return NextResponse.json({ error: 'Metadata write failed' }, { status: 500 });
  }

  return NextResponse.json({ render: record }, { status: 200 });
}
