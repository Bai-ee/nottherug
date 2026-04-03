import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { fsQueryCollection } from '@/lib/server/firestoreRest';
import { COLLECTIONS } from '@/lib/photos/types';
import type { PhotoUpload, PhotoRender } from '@/lib/photos/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get('type') ?? 'originals';

  if (type === 'originals') {
    const docs = await fsQueryCollection(COLLECTIONS.photoUploads, 'uploadedAt', 'DESCENDING', 100);
    return NextResponse.json({ items: docs as unknown as PhotoUpload[] });
  }

  if (type === 'rendered') {
    const docs = await fsQueryCollection(COLLECTIONS.photoRenders, 'createdAt', 'DESCENDING', 100);
    return NextResponse.json({ items: docs as unknown as PhotoRender[] });
  }

  return NextResponse.json({ error: 'Invalid type. Use originals or rendered.' }, { status: 400 });
}
