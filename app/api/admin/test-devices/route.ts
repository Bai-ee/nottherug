import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { fsCreateDoc, fsGetDoc, fsMergeDoc, fsQueryCollection } from '@/lib/server/firestoreRest';
import { isOpaqueId } from '@/lib/analytics/events';
import { TEST_DEVICES_COLLECTION } from '@/lib/testing/classification';

export const runtime = 'nodejs';

/**
 * Test devices: browsers an admin explicitly marked as test. The id is minted
 * here, stored in `testDevices`, and kept by that browser in localStorage
 * (lib/analytics/identity.ts); every event and submission from it then carries
 * the id, and reporting excludes it by default.
 *
 * Unmarking sets `revokedAt` and the browser forgets its id, so NEW activity
 * counts as real again. The document itself stays, so activity recorded while
 * the device was marked stays classified as test.
 */

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }
  try {
    const rows = await fsQueryCollection(TEST_DEVICES_COLLECTION, 'createdAt', 'DESCENDING', 200);
    return NextResponse.json({ devices: rows });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'test devices read failed'));
  }
}

export async function POST(req: NextRequest) {
  let admin: string;
  try {
    admin = await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const label = typeof body.label === 'string' ? body.label.replace(/[^\w .,:/()-]/g, '').slice(0, 60) : '';
  const id = randomUUID();
  const doc: Record<string, unknown> = {
    id,
    createdAt: new Date().toISOString(),
    createdBy: admin,
    label: label || 'Test device',
  };
  // The browser's own random id, so its activity from BEFORE it was marked is
  // classified too. Opaque by construction; never a device fingerprint.
  if (isOpaqueId(body.vid)) doc.vid = body.vid;
  try {
    await fsCreateDoc(`${TEST_DEVICES_COLLECTION}/${id}`, doc);
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'test device create failed'));
  }
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  let admin: string;
  try {
    admin = await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!isOpaqueId(id)) return badRequest('Invalid id');
  try {
    const existing = await fsGetDoc(`${TEST_DEVICES_COLLECTION}/${id}`);
    if (!existing.exists) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    await fsMergeDoc(`${TEST_DEVICES_COLLECTION}/${id}`, { revokedAt: new Date().toISOString(), revokedBy: admin });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'test device revoke failed'));
  }
  return NextResponse.json({ ok: true });
}
