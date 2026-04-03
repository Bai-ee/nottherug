import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { storageList } from '@/lib/server/firebaseStorage';
import { STORAGE_PATHS } from '@/lib/photos/types';

export const runtime = 'nodejs';

export interface LogoAsset {
  name: string;
  storagePath: string;
  downloadURL: string;
}

/**
 * GET /api/admin/photos/assets
 * Lists logo assets from photos/logos/ in Firebase Storage.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  const prefix = `${STORAGE_PATHS.logos}/`;
  const files = await storageList(prefix);

  const logos: LogoAsset[] = files
    .filter((f) => !f.name.endsWith('/'))
    .map((f) => ({
      name: f.name.replace(prefix, ''),
      storagePath: f.storagePath,
      downloadURL: f.downloadURL,
    }));

  return NextResponse.json({ logos });
}
