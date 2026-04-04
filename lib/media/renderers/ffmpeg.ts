// @ts-nocheck — ffmpeg-static and fluent-ffmpeg are not installed in production
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { MediaRenderer, RenderInput, RenderOutput } from '@/lib/media/types';

// Point fluent-ffmpeg at the bundled static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Composes a still image + logo overlay using FFmpeg.
 * Produces a JPEG output at quality ~90.
 *
 * Overlay filter:
 *   [0:v][1:v] overlay=X:Y
 * Logo is scaled to placement.width×height before overlay.
 * Opacity is applied via the `format=rgba,colorchannelmixer=aa=<opacity>` chain.
 */
export const ffmpegRenderer: MediaRenderer = {
  name: 'ffmpeg',

  async render({ sourceImageBuffer, logoBuffer, placement }: RenderInput): Promise<RenderOutput> {
    const workDir = tmpdir();
    const id = uuidv4();

    const srcPath = path.join(workDir, `${id}-src.jpg`);
    const logoPath = path.join(workDir, `${id}-logo.png`);
    const outPath = path.join(workDir, `${id}-out.jpg`);

    // Write buffers to temp files
    await fs.writeFile(srcPath, sourceImageBuffer);
    await fs.writeFile(logoPath, logoBuffer);

    // FFmpeg filter: scale logo then overlay with opacity
    const overlayFilter = [
      `[1:v]scale=${placement.width}:${placement.height}:force_original_aspect_ratio=decrease,`,
      `format=rgba,colorchannelmixer=aa=${placement.opacity.toFixed(3)}[logo];`,
      `[0:v][logo]overlay=${placement.x}:${placement.y}`,
    ].join('');

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(srcPath)
        .input(logoPath)
        .complexFilter(overlayFilter)
        .outputOptions(['-frames:v', '1', '-q:v', '2'])
        .output(outPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    const buffer = await fs.readFile(outPath);

    // Cleanup temp files (best-effort)
    await Promise.all([
      fs.unlink(srcPath).catch(() => {}),
      fs.unlink(logoPath).catch(() => {}),
      fs.unlink(outPath).catch(() => {}),
    ]);

    // Read dimensions from output (use sharp just for metadata if available, else default)
    let width = 0;
    let height = 0;
    try {
      const sharp = (await import('sharp')).default;
      const meta = await sharp(buffer).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
    } catch {
      // Not critical — dimensions are informational
    }

    return { buffer, contentType: 'image/jpeg', width, height };
  },
};
