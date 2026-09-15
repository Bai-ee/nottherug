import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

const verifyAdmin = vi.fn();
const fsSetDoc = vi.fn();
const storageUpload = vi.fn();
const storageDelete = vi.fn();

vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));

vi.mock('@/lib/server/firestoreRest', () => ({
  fsSetDoc,
  fsGetDoc: vi.fn(),
  fsDeleteDoc: vi.fn(),
  fsQueryCollection: vi.fn(),
  fsCreateDoc: vi.fn(),
  fsIncrementField: vi.fn(),
}));

vi.mock('@/lib/server/firebaseStorage', () => ({
  storageUpload,
  storageDelete,
  storageDownload: vi.fn(),
  storageList: vi.fn(),
  storageUploadPrivate: vi.fn(),
  PRIVATE_STORAGE_PREFIX: 'private',
}));

let jpegBuffer: Buffer;
let gifBuffer: Buffer;

beforeAll(async () => {
  jpegBuffer = await sharp({
    create: { width: 40, height: 20, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .jpeg()
    .toBuffer();

  gifBuffer = await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .gif()
    .toBuffer();
}, 20000);

function requestWithFile(buffer: Buffer, name: string, type: string): NextRequest {
  const fd = new FormData();
  fd.set('file', new File([Uint8Array.from(buffer)], name, { type }));
  return new NextRequest('http://localhost/api/admin/photos/upload', { method: 'POST', body: fd });
}

describe('POST /api/admin/photos/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAdmin.mockResolvedValue('admin@example.test');
  });

  it('rejects an oversized upload with 413 before ever calling Storage', async () => {
    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const oversized = Buffer.alloc(5 * 1024 * 1024, 1);
    const res = await POST(requestWithFile(oversized, 'big.jpg', 'image/jpeg'));
    expect(res.status).toBe(413);
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it('rejects real GIF bytes declared as image/png, based on the decoded format (415)', async () => {
    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const res = await POST(requestWithFile(gifBuffer, 'photo.png', 'image/png'));
    expect(res.status).toBe(415);
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it('rejects undecodable bytes with 400', async () => {
    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const res = await POST(requestWithFile(Buffer.from('not an image', 'utf8'), 'x.jpg', 'image/jpeg'));
    expect(res.status).toBe(400);
  });

  it('cleans up the uploaded object(s) when the metadata write fails, and reports cleanup ok', async () => {
    storageUpload.mockImplementation(async (path: string) => `https://firebasestorage.googleapis.com/v0/b/x/o/${path}?alt=media&token=should-not-appear-in-logs`);
    fsSetDoc.mockRejectedValue(new Error('Firestore SET failed'));
    storageDelete.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const res = await POST(requestWithFile(jpegBuffer, 'photo.jpg', 'image/jpeg'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.cleanup).toBe('ok');
    expect(storageDelete).toHaveBeenCalled();
    // original + thumbnail should both be targeted for cleanup
    expect(storageDelete.mock.calls.length).toBe(2);
  });

  it('reports truthfully when cleanup itself fails after a metadata write failure', async () => {
    storageUpload.mockResolvedValue('https://firebasestorage.googleapis.com/v0/b/x/o/photos%2Foriginals%2Fx.jpg?alt=media&token=abc');
    fsSetDoc.mockRejectedValue(new Error('Firestore SET failed'));
    storageDelete.mockRejectedValue(new Error('Storage delete failed (500)'));

    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const res = await POST(requestWithFile(jpegBuffer, 'photo.jpg', 'image/jpeg'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.cleanup).toBe('failed');
  });

  it('records a failed thumbnail truthfully instead of pretending it succeeded', async () => {
    storageUpload.mockImplementation(async (path: string) => {
      if (path.includes('thumbnails')) throw new Error('thumbnail upload failed (500)');
      return `https://firebasestorage.googleapis.com/v0/b/x/o/${path}?alt=media&token=abc`;
    });
    fsSetDoc.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const res = await POST(requestWithFile(jpegBuffer, 'photo.jpg', 'image/jpeg'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.upload.thumbnailStatus).toBe('failed');
    expect(body.upload.thumbnailURL).toBeUndefined();
    expect(body.upload.thumbnailError).toBeTruthy();
  });

  it('derives the storage extension from the decoded format, not the declared MIME', async () => {
    storageUpload.mockImplementation(async (path: string) => `https://firebasestorage.googleapis.com/v0/b/x/o/${path}?alt=media&token=abc`);
    fsSetDoc.mockResolvedValue(undefined);

    // Real JPEG bytes with a lying "image/png" client-declared type.
    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const res = await POST(requestWithFile(jpegBuffer, 'photo.png', 'image/png'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.upload.storagePath).toMatch(/\.jpg$/);
    expect(body.upload.contentType).toBe('image/jpeg');
  });

  it('propagates verifyAdmin failures through errorResponse instead of a hardcoded 401', async () => {
    const { ForbiddenError } = await import('@/lib/server/errors');
    verifyAdmin.mockRejectedValue(new ForbiddenError('not on admin whitelist'));

    const { POST } = await import('@/app/api/admin/photos/upload/route');
    const res = await POST(requestWithFile(jpegBuffer, 'photo.jpg', 'image/jpeg'));
    expect(res.status).toBe(403);
  });
});
