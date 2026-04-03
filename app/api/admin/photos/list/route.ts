import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/photos/types';
import type { PhotoUpload, PhotoRender } from '@/lib/photos/types';

export const runtime = 'nodejs';

/**
 * GET /api/admin/photos/list?type=originals|rendered
 * Returns photoUploads or photoRenders sorted by date desc.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get('type') ?? 'originals';

  if (type === 'originals') {
    const snap = await adminDb
      .collection(COLLECTIONS.photoUploads)
      .orderBy('uploadedAt', 'desc')
      .limit(100)
      .get();

    const items: PhotoUpload[] = snap.docs.map((d) => d.data() as PhotoUpload);
    return NextResponse.json({ items });
  }

  if (type === 'rendered') {
    const snap = await adminDb
      .collection(COLLECTIONS.photoRenders)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const items: PhotoRender[] = snap.docs.map((d) => d.data() as PhotoRender);
    return NextResponse.json({ items });
  }

  return NextResponse.json({ error: 'Invalid type. Use originals or rendered.' }, { status: 400 });
}
