import { sharpRenderer } from '@/lib/media/renderers/sharp';
import { ffmpegRenderer } from '@/lib/media/renderers/ffmpeg';
import type { MediaRenderer } from '@/lib/media/types';

export type RendererName = 'sharp' | 'ffmpeg';

export function createRenderer(name: RendererName = 'sharp'): MediaRenderer {
  switch (name) {
    case 'ffmpeg':
      return ffmpegRenderer;
    case 'sharp':
    default:
      return sharpRenderer;
  }
}
