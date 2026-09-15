import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyAdmin = vi.fn();
const fsGetDoc = vi.fn();
const fsDeleteDoc = vi.fn();
const storageDelete = vi.fn();

vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));

vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc,
  fsDeleteDoc,
  fsSetDoc: vi.fn(),
  fsQueryCollection: vi.fn(),
  fsCreateDoc: vi.fn(),
  fsIncrementField: vi.fn(),
}));

vi.mock('@/lib/server/firebaseStorage', () => ({
  storageDelete,
  storageUpload: vi.fn(),
  storageDownload: vi.fn(),
  storageList: vi.fn(),
  storageUploadPrivate: vi.fn(),
  PRIVATE_STORAGE_PREFIX: 'private',
}));

const UPLOAD_ID = 'a1b2c3d4-e5f6-4789-9abc-def012345678';

function deleteRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/photos/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('DELETE /api/admin/photos/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAdmin.mockResolvedValue('admin@example.test');
  });

  it('returns 404 when the record does not exist, without touching Storage', async () => {
    fsGetDoc.mockResolvedValue({ exists: false });

    const { DELETE } = await import('@/app/api/admin/photos/delete/route');
    const res = await DELETE(deleteRequest({ collection: 'photoUploads', id: UPLOAD_ID }));

    expect(res.status).toBe(404);
    expect(storageDelete).not.toHaveBeenCalled();
    expect(fsDeleteDoc).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID id with 400', async () => {
    const { DELETE } = await import('@/app/api/admin/photos/delete/route');
    const res = await DELETE(deleteRequest({ collection: 'photoUploads', id: '../../etc/passwd' }));
    expect(res.status).toBe(400);
    expect(fsGetDoc).not.toHaveBeenCalled();
  });

  it('rejects an invalid collection with 400', async () => {
    const { DELETE } = await import('@/app/api/admin/photos/delete/route');
    const res = await DELETE(deleteRequest({ collection: 'admins', id: UPLOAD_ID }));
    expect(res.status).toBe(400);
  });

  it('ignores a client-supplied storagePath and derives the path from the stored record instead', async () => {
    fsGetDoc.mockResolvedValue({
      exists: true,
      data: {
        storagePath: `photos/originals/${UPLOAD_ID}.jpg`,
        thumbnailURL: 'https://firebasestorage.googleapis.com/v0/b/x/o/thumb?alt=media&token=abc',
      },
    });
    storageDelete.mockResolvedValue(undefined);
    fsDeleteDoc.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/admin/photos/delete/route');
    const res = await DELETE(
      deleteRequest({ collection: 'photoUploads', id: UPLOAD_ID, storagePath: 'attacker/controlled/path.jpg' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, status: 'deleted' });
    const deletedPaths = storageDelete.mock.calls.map((call) => call[0]);
    expect(deletedPaths).toContain(`photos/originals/${UPLOAD_ID}.jpg`);
    expect(deletedPaths).toContain(`photos/thumbnails/${UPLOAD_ID}.jpg`);
    expect(deletedPaths).not.toContain('attacker/controlled/path.jpg');
  });

  it('keeps the metadata record and reports pending_cleanup when object deletion fails', async () => {
    fsGetDoc.mockResolvedValue({
      exists: true,
      data: { storagePath: `photos/originals/${UPLOAD_ID}.jpg` },
    });
    storageDelete.mockRejectedValue(new Error('Storage delete failed for photos/originals (500)'));

    const { DELETE } = await import('@/app/api/admin/photos/delete/route');
    const res = await DELETE(deleteRequest({ collection: 'photoUploads', id: UPLOAD_ID }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.status).toBe('pending_cleanup');
    expect(fsDeleteDoc).not.toHaveBeenCalled();
  });

  it('surfaces a metadata delete failure after storage cleanup succeeded, rather than silently losing it', async () => {
    fsGetDoc.mockResolvedValue({
      exists: true,
      data: { storagePath: `photos/originals/${UPLOAD_ID}.jpg` },
    });
    storageDelete.mockResolvedValue(undefined);
    fsDeleteDoc.mockRejectedValue(new Error('Firestore DELETE failed'));

    const { DELETE } = await import('@/app/api/admin/photos/delete/route');
    const res = await DELETE(deleteRequest({ collection: 'photoUploads', id: UPLOAD_ID }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.status).toBe('metadata_delete_failed');
  });

  it('propagates verifyAdmin failures through errorResponse instead of a hardcoded 401', async () => {
    const { ForbiddenError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ForbiddenError('not on admin whitelist'));

    const { DELETE } = await import('@/app/api/admin/photos/delete/route');
    const res = await DELETE(deleteRequest({ collection: 'photoUploads', id: UPLOAD_ID }));
    expect(res.status).toBe(403);
  });
});
