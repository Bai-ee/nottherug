import sharp from 'sharp';
import type { MediaRenderer, RenderInput, RenderOutput } from '@/lib/media/types';

export const sharpRenderer: MediaRenderer = {
  name: 'sharp',

  async render({ sourceImageBuffer, logoBuffer, placement }: RenderInput): Promise<RenderOutput> {
    // Rotate source per EXIF orientation
    const source = sharp(sourceImageBuffer).rotate();
    const { width: srcW = 0, height: srcH = 0 } = await source.metadata();

    // Resize logo to placement dimensions with transparent background
    const logoResized = await sharp(logoBuffer)
      .ensureAlpha()
      .resize(placement.width, placement.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Apply opacity by scaling the alpha channel
    const { data: rawData, info } = await sharp(logoResized)
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let i = 3; i < rawData.length; i += 4) {
      rawData[i] = Math.round(rawData[i] * placement.opacity);
    }

    const logoFinal = await sharp(rawData, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();

    // Composite logo onto source image
    const output = await source
      .composite([{ input: logoFinal, left: placement.x, top: placement.y }])
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      buffer: output,
      contentType: 'image/jpeg',
      width: srcW,
      height: srcH,
    };
  },
};
