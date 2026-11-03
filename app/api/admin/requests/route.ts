import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { fsGetDoc, fsMergeDoc, fsQueryCollection } from '@/lib/server/firestoreRest';
import { ALT_TIME_COLLECTION, isAltTimeStatus } from '@/lib/booking/alternateTime';
import { emptyTestContext, loadTestContext } from '@/lib/testing/classification';
import { buildLeadReview } from '@/lib/testing/leadReview';

export const runtime = 'nodejs';

const REQUESTS_LIST_CAP = 500;
const REQUEST_ID = /^altreq_[a-f0-9]{32}$/;

/** "Request another time" submissions, newest first, with test/duplicate review info alongside. */
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }
  try {
    const rows = await fsQueryCollection(ALT_TIME_COLLECTION, 'createdAt', 'DESCENDING', REQUESTS_LIST_CAP);
    let testClassification: 'ok' | 'unavailable' = 'ok';
    let ctx = emptyTestContext();
    try {
      ctx = await loadTestContext();
    } catch {
      testClassification = 'unavailable';
    }
    return NextResponse.json({
      requests: rows,
      cap: REQUESTS_LIST_CAP,
      review: buildLeadReview(rows, ctx),
      testClassification,
    });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'requests read failed'));
  }
}

/** Status changes: New → Contacted → Scheduled → Closed (any order; the admin decides). */
export async function PATCH(req: NextRequest) {
  let admin: string;
  try {
    admin = await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof body.id !== 'string' || !REQUEST_ID.test(body.id)) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }
  if (!isAltTimeStatus(body.status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  }
  const path = `${ALT_TIME_COLLECTION}/${body.id}`;
  try {
    const existing = await fsGetDoc(path);
    if (!existing.exists) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    const at = new Date().toISOString();
    await fsMergeDoc(path, { status: body.status, statusUpdatedAt: at, statusUpdatedBy: admin });
    return NextResponse.json({ ok: true, status: body.status, statusUpdatedAt: at });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'status update failed'));
  }
}
