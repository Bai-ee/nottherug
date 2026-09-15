/**
 * Coverage for the generator render route and lib/generator/server.ts:
 * non-finite placement rejection, honest renderer recording, and the logo
 * fallback chain. Firestore/Storage are mocked; sharp runs for real against
 * small in-memory fixture images — no network, no real storage.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

const verifyAdmin = vi.fn();
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));

const fsGetDoc = vi.fn();
const fsQueryCollection = vi.fn();
const fsSetDoc = vi.fn(async () => {});
vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc: (...args: unknown[]) => fsGetDoc(...args),
  fsQueryCollection: (...args: unknown[]) => fsQueryCollection(...args),
  fsSetDoc,
  fsCreateDoc: vi.fn(),
  fsDeleteDoc: vi.fn(),
  fsIncrementField: vi.fn(),
}));

const storageDownload = vi.fn();
const storageList = vi.fn();
const storageUpload = vi.fn(async () => 'https://firebasestorage.googleapis.com/v0/b/x/o/generator%2Frendered%2Ftest.jpg?alt=media&token=abc');
vi.mock('@/lib/server/firebaseStorage', () => ({
  storageDownload: (...args: unknown[]) => storageDownload(...args),
  storageList: (...args: unknown[]) => storageList(...args),
  storageUpload,
  storageUploadPrivate: vi.fn(),
  storageDelete: vi.fn(),
  PRIVATE_STORAGE_PREFIX: 'private',
}));

let sourceJpeg: Buffer;

beforeAll(async () => {
  sourceJpeg = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 100, g: 150, b: 200 } },
  }).jpeg().toBuffer();
});

beforeEach(() => {
  vi.clearAllMocks();
  verifyAdmin.mockResolvedValue('admin@example.test');
  fsGetDoc.mockResolvedValue({
    exists: true,
    data: { id: 'photo-1', storagePath: 'photos/originals/photo-1.jpg' },
  });
  storageDownload.mockResolvedValue(sourceJpeg);
  // No stored logo — forces the fallback chain down to the local app-assets file.
  storageList.mockResolvedValue([]);
});

describe('POST /api/admin/generator/render — validation', () => {
  function requestWith(body: unknown) {
    return new NextRequest('http://localhost/api/admin/generator/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const validBody = {
    sourcePhotoId: 'photo-1',
    canvasPreset: 'portrait',
    logoAsset: 'notRugGreen',
    placement: { xRatio: 0.5, yRatio: 0.5, diameterRatio: 0.18 },
  };

  it('rejects a non-finite placement value (Infinity)', async () => {
    const { POST } = await import('@/app/api/admin/generator/render/route');
    const res = await POST(requestWith({ ...validBody, placement: { ...validBody.placement, xRatio: Infinity } }));
    expect(res.status).toBe(400);
  });

  it('rejects a NaN placement value', async () => {
    const { POST } = await import('@/app/api/admin/generator/render/route');
    const res = await POST(requestWith({ ...validBody, placement: { ...validBody.placement, diameterRatio: NaN } }));
    expect(res.status).toBe(400);
  });

  it('accepts a valid finite placement and renders', async () => {
    const { POST } = await import('@/app/api/admin/generator/render/route');
    const res = await POST(requestWith(validBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.render.rendererUsed).toBe('sharp');
  });
});

describe('renderGeneratorImage — renderer recording', () => {
  it('always records "sharp" as the renderer used, even when "ffmpeg" is requested', async () => {
    const { renderGeneratorImage } = await import('@/lib/generator/server');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const render = await renderGeneratorImage({
      adminEmail: 'admin@example.test',
      sourcePhotoId: 'photo-1',
      canvasPreset: 'square',
      logoAsset: 'notRugGreen',
      placement: { xRatio: 0.5, yRatio: 0.5, diameterRatio: 0.18 },
      renderer: 'ffmpeg',
    });

    expect(render.rendererUsed).toBe('sharp');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ffmpeg'));
    warnSpy.mockRestore();
  });
});

describe('renderGeneratorImage — logo fallback chain', () => {
  it('falls back to the local app-assets logo when Storage has none and no origin is given', async () => {
    const { renderGeneratorImage } = await import('@/lib/generator/server');

    const render = await renderGeneratorImage({
      adminEmail: 'admin@example.test',
      sourcePhotoId: 'photo-1',
      canvasPreset: 'portrait',
      logoAsset: 'notRugGreen',
      placement: { xRatio: 0.5, yRatio: 0.5, diameterRatio: 0.18 },
      origin: null,
    });

    expect(render.status).toBe('complete');
    expect(storageUpload).toHaveBeenCalled();
  });

  it('throws a clear, actionable error when Storage, the public asset, and the local file all fail', async () => {
    vi.resetModules();
    vi.doMock('@/lib/server/verifyAdmin', () => ({ verifyAdmin }));
    vi.doMock('@/lib/server/firestoreRest', () => ({
      fsGetDoc: (...args: unknown[]) => fsGetDoc(...args),
      fsQueryCollection: (...args: unknown[]) => fsQueryCollection(...args),
      fsSetDoc,
      fsCreateDoc: vi.fn(),
      fsDeleteDoc: vi.fn(),
      fsIncrementField: vi.fn(),
    }));
    vi.doMock('@/lib/server/firebaseStorage', () => ({
      storageDownload: (...args: unknown[]) => storageDownload(...args),
      storageList: (...args: unknown[]) => storageList(...args),
      storageUpload,
      storageUploadPrivate: vi.fn(),
      storageDelete: vi.fn(),
      PRIVATE_STORAGE_PREFIX: 'private',
    }));
    storageList.mockRejectedValue(new Error('Storage unavailable'));
    vi.doMock('fs', async () => {
      const actual = await vi.importActual<typeof import('fs')>('fs');
      return {
        ...actual,
        readFileSync: (p: string, ...rest: unknown[]) => {
          if (String(p).includes('generator-logos')) {
            const err = new Error('ENOENT') as NodeJS.ErrnoException;
            err.code = 'ENOENT';
            throw err;
          }
          // @ts-expect-error - passthrough for any other path
          return actual.readFileSync(p, ...rest);
        },
      };
    });

    const { renderGeneratorImage } = await import('@/lib/generator/server');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(renderGeneratorImage({
      adminEmail: 'admin@example.test',
      sourcePhotoId: 'photo-1',
      canvasPreset: 'portrait',
      logoAsset: 'notRugGreen',
      placement: { xRatio: 0.5, yRatio: 0.5, diameterRatio: 0.18 },
      origin: null,
    })).rejects.toThrow(/not reachable/i);

    warnSpy.mockRestore();
    vi.doUnmock('fs');
  });
});
