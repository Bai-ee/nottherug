import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { adminDb } from '@/lib/firebase-admin';
import { storageDelete } from '@/lib/server/firebaseStorage';
import { COLLECTIONS } from '@/lib/photos/types';

export const runtime = 'nodejs';

interface DeleteRequestBody {
  collection: 'photoUploads' | 'photoRenders';
  id: string;
  storagePath: string;
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  let body: DeleteRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { collection, id, storagePath } = body;

  if (!collection || !id || !storagePath) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (collection !== COLLECTIONS.photoUploads && collection !== COLLECTIONS.photoRenders) {
    return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
  }

  try {
    await storageDelete(storagePath);
  } catch (err) {
    console.error('Storage delete error:', err);
  }

  await adminDb.collection(collection).doc(id).delete();

  return NextResponse.json({ ok: true });
}
