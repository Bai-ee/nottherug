/**
 * lib/photos/validate.ts decodes real bytes with sharp — no mocking here,
 * since the whole point is verifying behavior against actual image data
 * rather than a client-declared MIME type.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import {
  decodeAndValidateImage,
  ImageTooLargeError,
  UnsupportedImageFormatError,
  UndecodableImageError,
  MAX_UPLOAD_BYTES,
} from '@/lib/photos/validate';

let jpegBuffer: Buffer;
let gifBuffer: Buffer;
let oversizedPixelsPngBuffer: Buffer;

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

  // Small file size (~1.3MB) but 45M decoded pixels — exceeds the 40M pixel cap
  // without needing a large byte payload, so it exercises the pixel guard
  // independently of the byte-size guard.
  oversizedPixelsPngBuffer = await sharp({
    create: { width: 9000, height: 5000, channels: 3, background: { r: 10, g: 10, b: 10 } },
  })
    .png({ compressionLevel: 1 })
    .toBuffer();
}, 20000);

describe('decodeAndValidateImage', () => {
  it('accepts a real JPEG and reports its decoded dimensions', async () => {
    const result = await decodeAndValidateImage(jpegBuffer);
    expect(result.format).toBe('jpeg');
    expect(result.extension).toBe('jpg');
    expect(result.width).toBe(40);
    expect(result.height).toBe(20);
  });

  it('rejects oversized byte payloads before attempting to decode (413)', async () => {
    const oversized = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0);
    await expect(decodeAndValidateImage(oversized)).rejects.toBeInstanceOf(ImageTooLargeError);
  });

  it('rejects a decodable-but-unsupported format by its real bytes, regardless of any claimed MIME', async () => {
    // The route never inspects the declared MIME at all — this proves the
    // decision is made from decoded bytes: real GIF bytes are rejected as
    // unsupported even though nothing here claims a MIME type at all.
    await expect(decodeAndValidateImage(gifBuffer)).rejects.toBeInstanceOf(UnsupportedImageFormatError);
  });

  it('rejects undecodable bytes (400)', async () => {
    await expect(decodeAndValidateImage(Buffer.from('not an image', 'utf8'))).rejects.toBeInstanceOf(
      UndecodableImageError,
    );
  });

  it('rejects an image whose decoded pixel count exceeds the cap, even under the byte-size limit', async () => {
    expect(oversizedPixelsPngBuffer.length).toBeLessThan(MAX_UPLOAD_BYTES);
    await expect(decodeAndValidateImage(oversizedPixelsPngBuffer)).rejects.toBeInstanceOf(ImageTooLargeError);
  });
});
