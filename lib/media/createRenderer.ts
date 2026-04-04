import { sharpRenderer } from '@/lib/media/renderers/sharp';
import type { MediaRenderer } from '@/lib/media/types';

export type RendererName = 'sharp' | 'ffmpeg';

export async function createRenderer(name: RendererName = 'sharp'): Promise<MediaRenderer> {
  if (name === 'ffmpeg') {
    try {
      // webpackIgnore: webpack must not bundle this path — ffmpeg-static is not a prod dependency
      const { ffmpegRenderer } = await import(/* webpackIgnore: true */ '@/lib/media/renderers/ffmpeg');
      return ffmpegRenderer;
    } catch {
      console.warn('ffmpeg renderer unavailable, falling back to sharp');
    }
  }
  return sharpRenderer;
}
