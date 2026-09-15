/**
 * Real Sharp rendering against real image bytes — no mocks.
 *
 * The rest of the image tests mock sharp, which proves the surrounding control
 * flow but never that libvips actually decodes, composites and re-encodes on
 * this platform. That distinction matters: sharp ships prebuilt native binaries,
 * so a passing mocked test says nothing about whether the deployed runtime can
 * render a pixel.
 *
 * Fixtures are generated here rather than committed, so the suite stays byte-free
 * and cannot drift from the format list the validator accepts.
 */
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { sharpRenderer } from '@/lib/media/renderers/sharp';
import { getSharpCoverOptions } from '@/lib/generator/fitUtils';
import {
  decodeAndValidateImage,
  UnsupportedImageFormatError,
  ImageTooLargeError,
} from '@/lib/photos/validate';

async function photo(width: number, height: number, format: 'jpeg' | 'png' | 'webp' = 'jpeg') {
  const img = sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 140, b: 90 } },
  });
  return format === 'jpeg' ? img.jpeg().toBuffer()
    : format === 'png' ? img.png().toBuffer()
    : img.webp().toBuffer();
}

/** A logo with real transparency, so opacity handling is actually exercised. */
async function logo(size = 200) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.6 } },
  }).png().toBuffer();
}

describe('sharp is genuinely able to render on this platform', () => {
  it('reports a libvips version and a usable format set', () => {
    expect(sharp.versions.vips).toMatch(/^\d+\.\d+/);
    const formats = sharp.format;
    for (const f of ['jpeg', 'png', 'webp'] as const) {
      expect(formats[f].input.buffer).toBe(true);
      expect(formats[f].output.buffer).toBe(true);
    }
  });
});

describe('sharpRenderer.render composites real pixels', () => {
  it('produces a decodable JPEG at the source dimensions', async () => {
    const out = await sharpRenderer.render({
      sourceImageBuffer: await photo(800, 600),
      logoBuffer: await logo(),
      placement: { x: 40, y: 30, width: 200, height: 200, opacity: 0.8 },
    });

    expect(out.contentType).toBe('image/jpeg');
    expect(out.width).toBe(800);
    expect(out.height).toBe(600);

    // Decode what came back rather than trusting the reported numbers.
    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  });

  it('actually changes the pixels under the logo, and leaves the rest alone', async () => {
    const source = await photo(400, 400);
    const out = await sharpRenderer.render({
      sourceImageBuffer: source,
      logoBuffer: await logo(100),
      placement: { x: 0, y: 0, width: 100, height: 100, opacity: 1 },
    });

    const at = async (buf: Buffer, left: number, top: number) =>
      sharp(buf).extract({ left, top, width: 8, height: 8 }).raw().toBuffer();

    // Top-left sits under the logo and must differ from the untouched source.
    expect(Buffer.compare(await at(source, 0, 0), await at(out.buffer, 0, 0))).not.toBe(0);

    // Bottom-right is outside the placement; JPEG is lossy so compare loosely.
    const [srcFar, outFar] = [await at(source, 380, 380), await at(out.buffer, 380, 380)];
    const drift = srcFar.reduce((m, v, i) => Math.max(m, Math.abs(v - outFar[i])), 0);
    expect(drift).toBeLessThan(12);
  });

  it('honours opacity — a fainter logo moves the pixels less', async () => {
    const source = await photo(300, 300);
    const render = (opacity: number) =>
      sharpRenderer.render({
        sourceImageBuffer: source,
        logoBuffer: logoBuf,
        placement: { x: 0, y: 0, width: 150, height: 150, opacity },
      });
    const logoBuf = await logo(150);

    const patch = async (buf: Buffer) =>
      sharp(buf).extract({ left: 10, top: 10, width: 16, height: 16 }).raw().toBuffer();

    const base = await patch(source);
    const faint = await patch((await render(0.2)).buffer);
    const solid = await patch((await render(1)).buffer);

    const delta = (a: Buffer, b: Buffer) =>
      a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;

    expect(delta(base, faint)).toBeLessThan(delta(base, solid));
  });

  it('renders each accepted input format', async () => {
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const out = await sharpRenderer.render({
        sourceImageBuffer: await photo(240, 180, format),
        logoBuffer: await logo(60),
        placement: { x: 5, y: 5, width: 60, height: 60, opacity: 0.9 },
      });
      expect((await sharp(out.buffer).metadata()).format).toBe('jpeg');
    }
  });
});

describe('the canvas cover contract holds against real pixels', () => {
  it('fills the target exactly, cropping rather than letterboxing', async () => {
    // A wide source into a square canvas: cover must crop the sides, not pad.
    const out = await sharp(await photo(1200, 400))
      .resize(getSharpCoverOptions(500, 500))
      .jpeg()
      .toBuffer();
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(500);
    expect(meta.height).toBe(500);
  });
});

describe('decodeAndValidateImage against real bytes', () => {
  it('accepts a real JPEG, PNG and WebP and returns re-encoded bytes', async () => {
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const decoded = await decodeAndValidateImage(await photo(120, 90, format));
      expect(decoded.format).toBe(format);
      expect(decoded.width).toBe(120);
      expect(decoded.height).toBe(90);
      // The returned buffer is what the upload route stores; it must decode.
      expect((await sharp(decoded.buffer).metadata()).format).toBe(format);
    }
  });

  it('strips bytes appended after the end of a real image', async () => {
    const clean = await photo(100, 100);
    const polyglot = Buffer.concat([clean, Buffer.from('<script>alert(1)</script>'.repeat(40))]);

    expect(polyglot.includes('<script>')).toBe(true);
    const decoded = await decodeAndValidateImage(polyglot);
    expect(decoded.buffer.includes('<script>')).toBe(false);
    expect((await sharp(decoded.buffer).metadata()).format).toBe('jpeg');
  });

  it('rejects a real image in a format that is not on the allowlist', async () => {
    const tiff = await sharp({
      create: { width: 60, height: 60, channels: 3, background: { r: 1, g: 2, b: 3 } },
    }).tiff().toBuffer();

    await expect(decodeAndValidateImage(tiff)).rejects.toBeInstanceOf(UnsupportedImageFormatError);
  });

  it('rejects bytes that are not an image at all', async () => {
    await expect(decodeAndValidateImage(Buffer.from('this is not an image'))).rejects.toThrow();
  });

  it('rejects an oversized buffer before decoding it', async () => {
    await expect(decodeAndValidateImage(Buffer.alloc(9 * 1024 * 1024, 1)))
      .rejects.toBeInstanceOf(ImageTooLargeError);
  });
});
