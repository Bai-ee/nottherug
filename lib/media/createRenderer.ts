import { sharpRenderer } from '@/lib/media/renderers/sharp';
import type { MediaRenderer } from '@/lib/media/types';

export type RendererName = 'sharp' | 'ffmpeg';

export async function createRenderer(name: RendererName = 'sharp'): Promise<MediaRenderer> {
  if (name === 'ffmpeg') {
    // Dynamic import keeps ffmpeg-static out of the webpack bundle for all other routes
    const { ffmpegRenderer } = await import('@/lib/media/renderers/ffmpeg');
    return ffmpegRenderer;
  }
  return sharpRenderer;
}
