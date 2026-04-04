import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { fsQueryCollection } from '@/lib/server/firestoreRest';
import { GENERATOR_COLLECTIONS } from '@/lib/generator/types';
import type { GeneratorRender } from '@/lib/generator/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  const docs = await fsQueryCollection(GENERATOR_COLLECTIONS.generatorRenders, 'createdAt', 'DESCENDING', 50);
  return NextResponse.json({ renders: docs as unknown as GeneratorRender[] });
}
