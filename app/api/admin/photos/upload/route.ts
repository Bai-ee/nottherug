import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { fsSetDoc } from '@/lib/server/firestoreRest';
import { storageDelete, storageUpload } from '@/lib/server/firebaseStorage';
import { STORAGE_PATHS, COLLECTIONS } from '@/lib/photos/types';
import type { PhotoUpload } from '@/lib/photos/types';
import {
  decodeAndValidateImage,
  ImageTooLargeError,
  UnsupportedImageFormatError,
} from '@/lib/photos/validate';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let adminEmail: string;
  try {
    adminEmail = await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let decoded;
  try {
    decoded = await decodeAndValidateImage(buffer);
  } catch (err) {
    if (err instanceof ImageTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    if (err instanceof UnsupportedImageFormatError) {
      return NextResponse.json({ error: err.message }, { status: 415 });
    }
    return NextResponse.json({ error: 'Could not decode image' }, { status: 400 });
  }

  const contentType = `image/${decoded.format}`;
  const id = randomUUID();
  const originalName = (file as File).name ?? `upload.${decoded.extension}`;
  const storagePath = `${STORAGE_PATHS.originals}/${id}.${decoded.extension}`;
  const thumbPath = `${STORAGE_PATHS.thumbnails}/${id}.jpg`;

  let downloadURL: string;
  try {
    // decoded.buffer, not the raw upload — re-encoded from decoded pixel
    // data by decodeAndValidateImage, so what's stored is provably only the
    // image sharp actually decoded, not whatever else the original bytes
    // may have carried after the end-of-image marker.
    downloadURL = await storageUpload(storagePath, decoded.buffer, contentType);
  } catch (err) {
    console.error('Storage upload failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
  }

  let thumbnailURL: string | undefined;
  let thumbnailError: string | undefined;
  try {
    // From decoded.buffer (already re-encoded and orientation-normalized),
    // not the raw upload — dimensions are already confirmed within
    // MAX_PIXELS by decodeAndValidateImage, and this avoids parsing the
    // original, unvalidated bytes a second time.
    const thumbBuffer = await sharp(decoded.buffer)
      .resize({ width: 300, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    thumbnailURL = await storageUpload(thumbPath, thumbBuffer, 'image/jpeg');
  } catch (err) {
    thumbnailError = err instanceof Error ? err.message : 'Unknown thumbnail error';
    console.error('Thumbnail generation/upload failed:', thumbnailError);
  }

  const record: PhotoUpload = {
    id,
    storagePath,
    downloadURL,
    ...(thumbnailURL ? { thumbnailURL } : {}),
    thumbnailStatus: thumbnailURL ? 'ok' : 'failed',
    ...(thumbnailError ? { thumbnailError } : {}),
    fileName: originalName,
    contentType,
    width: decoded.width,
    height: decoded.height,
    uploadedBy: adminEmail,
    uploadedAt: new Date().toISOString(),
    status: 'complete',
  };

  try {
    await fsSetDoc(`${COLLECTIONS.photoUploads}/${id}`, record as unknown as Record<string, unknown>);
  } catch (err) {
    console.error('Firestore write failed:', err instanceof Error ? err.message : err);

    const cleanupPaths = thumbnailURL ? [storagePath, thumbPath] : [storagePath];
    const cleanupResults = await Promise.allSettled(cleanupPaths.map((p) => storageDelete(p)));
    const cleanupFailed = cleanupResults.some((r) => r.status === 'rejected');
    if (cleanupFailed) {
      console.error('Cleanup after failed metadata write did not fully succeed for', storagePath);
    }

    return NextResponse.json(
      { error: 'Metadata write failed', cleanup: cleanupFailed ? 'failed' : 'ok' },
      { status: 500 },
    );
  }

  return NextResponse.json({ upload: record }, { status: 200 });
}
