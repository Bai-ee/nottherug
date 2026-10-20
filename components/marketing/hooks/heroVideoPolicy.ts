/**
 * Which hero clip (if any) the visitor should download. Pure so it can be
 * unit-tested; HomeHero feeds it the live browser signals.
 *
 * `null` means "poster only": reduced motion and data-saving signals never
 * trigger a video request.
 */
export interface HeroVideoSignals {
  reducedMotion: boolean;
  /** navigator.connection.saveData */
  saveData?: boolean;
  /** navigator.connection.effectiveType */
  effectiveType?: string;
  /** Viewport at or under the mobile breakpoint (max-width: 768px). */
  isMobile: boolean;
}

export interface HeroVideoSources {
  webm?: string;
  mp4: string;
}

const DESKTOP: HeroVideoSources = {
  webm: '/video/hero-mccarren-1080.webm',
  mp4: '/video/hero-mccarren-1080.mp4',
};
// Mobile ships MP4 only: the 480px CRF 36 H.264 clip (~640 KB) is smaller than
// the VP9 one, and it was 48% of the page weight at 540px CRF 30 (1.46 MB).
const MOBILE: HeroVideoSources = {
  mp4: '/video/hero-mccarren-480-v3.mp4',
};

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);

export function pickHeroVideo(signals: HeroVideoSignals): HeroVideoSources | null {
  if (signals.reducedMotion) return null;
  if (signals.saveData) return null;
  if (signals.effectiveType && SLOW_CONNECTIONS.has(signals.effectiveType)) return null;
  return signals.isMobile ? MOBILE : DESKTOP;
}
