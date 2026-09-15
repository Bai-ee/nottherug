/**
 * Coverage for app/api/admin/photos/render/route.ts. Previously shipped with
 * zero tests — rendererUsed echoed the request's `renderer` field instead of
 * the renderer that actually ran (fixed in 05bc2a6, after FFmpeg was removed
 * in P3B and createRenderer started always resolving to sharp regardless of
 * what was requested). This asserts that regression stays fixed. Firestore
 * and Storage are mocked; sharp runs for real against small fixture images —
 * no network, no real storage.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

const verifyAdmin = vi.fn();
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));

const fsSetDoc = vi.fn(async () => {});
vi.mock('@/lib/server/firestoreRest', () => ({
  fsSetDoc,
  fsGetDoc: vi.fn(),
  fsQueryCollection: vi.fn(),
  fsCreateDoc: vi.fn(),
  fsDeleteDoc: vi.fn(),
  fsIncrementField: vi.fn(),
}));

const storageDownload = vi.fn();
const storageUpload = vi.fn(async () => 'https://firebasestorage.googleapis.com/v0/b/x/o/photos%2Frendered%2Ftest.jpg?alt=media&token=abc');
vi.mock('@/lib/server/firebaseStorage', () => ({
  storageDownload: (...args: unknown[]) => storageDownload(...args),
  storageUpload,
  storageUploadPrivate: vi.fn(),
  storageDelete: vi.fn(),
  storageList: vi.fn(async () => []),
  PRIVATE_STORAGE_PREFIX: 'private',
}));

let sourceJpeg: Buffer;
let logoPng: Buffer;

beforeAll(async () => {
  sourceJpeg = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 20, b: 30 } },
  }).jpeg().toBuffer();
  logoPng = await sharp({
    create: { width: 40, height: 40, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).png().toBuffer();
});

beforeEach(() => {
  vi.clearAllMocks();
  verifyAdmin.mockResolvedValue('admin@example.test');
  storageDownload.mockImplementation(async (path: string) =>
    path === 'photos/originals/source.jpg' ? sourceJpeg : logoPng,
  );
});

function requestWith(body: unknown) {
  return new NextRequest('http://localhost/api/admin/photos/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  sourcePhotoId: 'photo-1',
  sourceStoragePath: 'photos/originals/source.jpg',
  logoStoragePath: 'photos/logos/logo.png',
  placement: { x: 10, y: 10, width: 40, height: 40, opacity: 1 },
};

describe('POST /api/admin/photos/render — rendererUsed', () => {
  it('records "sharp" as rendererUsed when sharp is requested', async () => {
    const { POST } = await import('@/app/api/admin/photos/render/route');
    const res = await POST(requestWith({ ...validBody, renderer: 'sharp' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.render.rendererUsed).toBe('sharp');
  });

  it('still records "sharp" as rendererUsed when the unavailable "ffmpeg" is requested — not an echo of the request', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST } = await import('@/app/api/admin/photos/render/route');
    const res = await POST(requestWith({ ...validBody, renderer: 'ffmpeg' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.render.rendererUsed).toBe('sharp');
    warnSpy.mockRestore();
  });

  it('defaults to sharp and records it when no renderer is specified', async () => {
    const { POST } = await import('@/app/api/admin/photos/render/route');
    const res = await POST(requestWith(validBody));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.render.rendererUsed).toBe('sharp');
    expect(fsSetDoc).toHaveBeenCalledWith(
      expect.stringContaining('photoRenders/'),
      expect.objectContaining({ rendererUsed: 'sharp' }),
    );
  });
});

describe('POST /api/admin/photos/render — validation', () => {
  it('rejects a request missing required fields', async () => {
    const { POST } = await import('@/app/api/admin/photos/render/route');
    const res = await POST(requestWith({ sourcePhotoId: 'photo-1' }));
    expect(res.status).toBe(400);
    expect(storageDownload).not.toHaveBeenCalled();
  });

  it('returns 404 when the source image cannot be loaded from Storage', async () => {
    storageDownload.mockRejectedValue(new Error('not found'));
    const { POST } = await import('@/app/api/admin/photos/render/route');
    const res = await POST(requestWith(validBody));
    expect(res.status).toBe(404);
  });
});
