import sharp from 'sharp';

/** Vercel's request body ceiling is 4.5MB; stay comfortably under it. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Guards against decompression-bomb-style dimensions (~40 megapixels). */
export const MAX_PIXELS = 40_000_000;

export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';

const SUPPORTED_FORMATS: ReadonlySet<string> = new Set<SupportedImageFormat>(['jpeg', 'png', 'webp']);

const EXTENSION_BY_FORMAT: Record<SupportedImageFormat, 'jpg' | 'png' | 'webp'> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

export class ImageTooLargeError extends Error {}
export class UnsupportedImageFormatError extends Error {}
export class UndecodableImageError extends Error {}

export interface DecodedImage {
  format: SupportedImageFormat;
  width: number;
  height: number;
  extension: 'jpg' | 'png' | 'webp';
  /**
   * Re-encoded from the decoded pixel data — never the original upload
   * bytes. A header that decodes cleanly says nothing about what, if
   * anything, follows the end-of-image marker; storing the original bytes
   * verbatim would store that too. Callers must upload this buffer, not the
   * one they passed in.
   */
  buffer: Buffer;
}

/**
 * Decodes and validates an uploaded image by its actual bytes — never the
 * client-declared MIME type. Rejects before any full decode/resize happens.
 */
export async function decodeAndValidateImage(buffer: Buffer): Promise<DecodedImage> {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new ImageTooLargeError(`Image exceeds the ${MAX_UPLOAD_BYTES} byte limit`);
  }

  // .rotate() with no args bakes any EXIF orientation into the pixel data
  // (matching lib/generator/server.ts's convention) before it's stripped by
  // re-encoding below — otherwise a photo relying on EXIF orientation would
  // come out sideways once that tag is gone. One pipeline instance for both
  // metadata() and the eventual toBuffer() so width/height below describe
  // the same, already-rotated pixels that end up in the returned buffer.
  const pipeline = sharp(buffer).rotate();

  // No limitInputPixels here: sharp's own pixel-limit check can itself throw
  // during metadata() before we can classify the failure, which would
  // misreport an oversized image as "undecodable" rather than "too large".
  // The explicit width*height check below is the authoritative guard.
  const metadata = await pipeline.metadata().catch(() => {
    throw new UndecodableImageError('Could not decode image bytes');
  });

  const { format, width, height } = metadata;
  if (!format || !SUPPORTED_FORMATS.has(format)) {
    throw new UnsupportedImageFormatError(`Unsupported image format: ${format ?? 'unknown'}`);
  }
  if (!width || !height) {
    throw new UndecodableImageError('Image has no readable dimensions');
  }
  if (width * height > MAX_PIXELS) {
    throw new ImageTooLargeError(`Image dimensions ${width}x${height} exceed the pixel limit`);
  }

  const reencoded = await pipeline
    .toFormat(format as SupportedImageFormat)
    .toBuffer()
    .catch(() => {
      throw new UndecodableImageError('Could not re-encode image bytes');
    });

  return {
    format: format as SupportedImageFormat,
    width,
    height,
    extension: EXTENSION_BY_FORMAT[format as SupportedImageFormat],
    buffer: reencoded,
  };
}
