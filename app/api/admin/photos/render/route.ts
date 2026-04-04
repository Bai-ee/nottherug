import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { fsSetDoc } from '@/lib/server/firestoreRest';
import { storageDownload, storageUpload } from '@/lib/server/firebaseStorage';
import { STORAGE_PATHS, COLLECTIONS } from '@/lib/photos/types';
import type { PhotoRender } from '@/lib/photos/types';
import { createRenderer } from '@/lib/media/createRenderer';
import type { LogoPlacement } from '@/lib/media/types';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

interface RenderRequestBody {
  sourcePhotoId: string;
  sourceStoragePath: string;
  logoStoragePath: string;
  placement: LogoPlacement;
  renderer?: 'sharp' | 'ffmpeg';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let adminEmail: string;
  try {
    adminEmail = await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  let body: RenderRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sourcePhotoId, sourceStoragePath, logoStoragePath, placement, renderer = 'sharp' } = body;

  if (!sourcePhotoId || !sourceStoragePath || !logoStoragePath || !placement) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  let sourceBuffer: Buffer;
  let logoBuffer: Buffer;

  try {
    sourceBuffer = await storageDownload(sourceStoragePath);
  } catch {
    return NextResponse.json({ error: 'Could not load source image from Storage' }, { status: 404 });
  }

  try {
    logoBuffer = await storageDownload(logoStoragePath);
  } catch {
    return NextResponse.json({ error: 'Could not load logo from Storage' }, { status: 404 });
  }

  const rendererInstance = await createRenderer(renderer === 'ffmpeg' ? 'ffmpeg' : 'sharp');
  let renderOutput: Awaited<ReturnType<typeof rendererInstance.render>>;

  try {
    renderOutput = await rendererInstance.render({ sourceImageBuffer: sourceBuffer, logoBuffer, placement });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Render failed' }, { status: 500 });
  }

  const id = uuidv4();
  const renderStoragePath = `${STORAGE_PATHS.rendered}/${id}.jpg`;

  let renderDownloadURL: string;
  try {
    renderDownloadURL = await storageUpload(renderStoragePath, renderOutput.buffer, renderOutput.contentType);
  } catch (err) {
    console.error('Render storage upload failed:', err);
    return NextResponse.json({ error: 'Failed to save rendered image' }, { status: 500 });
  }

  const record: PhotoRender = {
    id,
    sourcePhotoId,
    sourceStoragePath,
    logoStoragePath,
    renderStoragePath,
    renderDownloadURL,
    placement,
    rendererUsed: renderer === 'ffmpeg' ? 'ffmpeg' : 'sharp',
    createdBy: adminEmail,
    createdAt: new Date().toISOString(),
    status: 'complete',
  };

  try {
    await fsSetDoc(`${COLLECTIONS.photoRenders}/${id}`, record as unknown as Record<string, unknown>);
  } catch (err) {
    console.error('Firestore render record write failed:', err);
    return NextResponse.json({ error: 'Metadata write failed' }, { status: 500 });
  }

  return NextResponse.json({ render: record }, { status: 200 });
}
