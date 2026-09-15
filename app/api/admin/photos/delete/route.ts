import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { fsDeleteDoc, fsGetDoc } from '@/lib/server/firestoreRest';
import { storageDelete } from '@/lib/server/firebaseStorage';
import { COLLECTIONS } from '@/lib/photos/types';
import type { PhotoUpload, PhotoRender } from '@/lib/photos/types';
import { deriveUploadStoragePaths, deriveRenderStoragePath, isValidPhotoId, isPhotoCollection, InvalidStoragePathError } from '@/lib/photos/storagePaths';

export const runtime = 'nodejs';

interface DeleteRequestBody {
  collection?: unknown;
  id?: unknown;
  // A client-supplied storagePath, if present, is intentionally never read —
  // the server derives the storage path from the stored record instead.
}

/**
 * Response body shape:
 *   { ok: true, status: 'deleted' }
 *   { ok: false, status: 'pending_cleanup', error }       — storage delete failed; record kept for retry
 *   { ok: false, status: 'metadata_delete_failed', error } — storage cleared, Firestore doc delete failed
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }

  let body: DeleteRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { collection, id } = body;

  if (!isPhotoCollection(collection)) {
    return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
  }
  if (!isValidPhotoId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const docPath = `${collection}/${id}`;
  const record = await fsGetDoc(docPath);
  if (!record.exists || !record.data) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }

  let storagePaths: string[];
  try {
    if (collection === COLLECTIONS.photoUploads) {
      const upload = record.data as unknown as PhotoUpload;
      storagePaths = deriveUploadStoragePaths(id, upload.storagePath, Boolean(upload.thumbnailURL));
    } else {
      const render = record.data as unknown as PhotoRender;
      storagePaths = [deriveRenderStoragePath(render.renderStoragePath)];
    }
  } catch (err) {
    if (err instanceof InvalidStoragePathError) {
      console.error('Refusing delete: stored path outside expected prefix:', err.message);
      return NextResponse.json({ error: 'Record has an invalid storage path' }, { status: 500 });
    }
    throw err;
  }

  const deleteResults = await Promise.allSettled(storagePaths.map((p) => storageDelete(p)));
  const failures = deleteResults.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error('Storage delete failed during photo cleanup:', failure.reason instanceof Error ? failure.reason.message : failure.reason);
    }
    return NextResponse.json(
      { ok: false, status: 'pending_cleanup', error: 'Storage deletion failed; the record was kept so you can retry.' },
      { status: 502 },
    );
  }

  try {
    await fsDeleteDoc(docPath);
  } catch (err) {
    console.error('Metadata delete failed after successful storage cleanup:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, status: 'metadata_delete_failed', error: 'Storage objects were removed, but the record could not be deleted. Retry.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: 'deleted' });
}
