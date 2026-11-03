import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { fsDeleteDoc, fsGetDoc, fsMergeDoc, fsSetDoc } from '@/lib/server/firestoreRest';
import { isOpaqueId } from '@/lib/analytics/events';
import { ALT_TIME_COLLECTION } from '@/lib/booking/alternateTime';
import { TEST_SESSIONS_COLLECTION } from '@/lib/testing/classification';

export const runtime = 'nodejs';

/**
 * Mark or unmark a historical record as test. Never deletes the record:
 *  - lead / request: sets `testOverride` true (test) or false (confirmed
 *    real), or null to clear the review; who and when are recorded alongside.
 *  - session: an analytics session id from the dashboard's review list;
 *    marking adds it to `analyticsTestSessions`, unmarking removes it.
 */

const LEAD_ID = /^(?:[a-f0-9]{64}|capture_[a-f0-9]{32})$/;
const REQUEST_ID = /^altreq_[a-f0-9]{32}$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
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
    return bad('Invalid JSON');
  }

  const kind = body.kind;
  const id = body.id;
  const test = body.test;
  if (!(test === true || test === false || test === null)) return bad('test must be true, false or null');
  const at = new Date().toISOString();

  try {
    if (kind === 'lead' || kind === 'request') {
      const pattern = kind === 'lead' ? LEAD_ID : REQUEST_ID;
      if (typeof id !== 'string' || !pattern.test(id)) return bad('Invalid id');
      const path = `${kind === 'lead' ? 'leads' : ALT_TIME_COLLECTION}/${id}`;
      // Merge would create a document that does not exist; check first.
      const existing = await fsGetDoc(path);
      if (!existing.exists) return bad('Not found', 404);
      await fsMergeDoc(path, { testOverride: test, testMarkedBy: admin, testMarkedAt: at });
      return NextResponse.json({ ok: true });
    }
    if (kind === 'session') {
      if (!isOpaqueId(id)) return bad('Invalid id');
      if (test === true) {
        await fsSetDoc(`${TEST_SESSIONS_COLLECTION}/${id}`, { sid: id, markedBy: admin, markedAt: at });
      } else {
        await fsDeleteDoc(`${TEST_SESSIONS_COLLECTION}/${id}`);
      }
      return NextResponse.json({ ok: true });
    }
    return bad('Unknown kind');
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'test mark failed'));
  }
}
