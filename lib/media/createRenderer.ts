import { sharpRenderer } from '@/lib/media/renderers/sharp';
import type { MediaRenderer } from '@/lib/media/types';

// 'ffmpeg' remains a valid input for backward compatibility with existing
// callers/records (e.g. lib/photos/types.ts's PhotoRender.rendererUsed), but
// there is no ffmpeg implementation: fluent-ffmpeg and ffmpeg-static are not
// installed dependencies. Sharp is the only production renderer — requesting
// 'ffmpeg' always resolves to it. Callers that record "renderer used" should
// read it off the returned MediaRenderer's `name`, not echo the request back.
export type RendererName = 'sharp' | 'ffmpeg';

export async function createRenderer(name: RendererName = 'sharp'): Promise<MediaRenderer> {
  if (name === 'ffmpeg') {
    console.warn('[media] "ffmpeg" renderer was requested but is not available; using sharp instead.');
  }
  return sharpRenderer;
}
