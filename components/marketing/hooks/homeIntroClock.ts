'use client';

/**
 * Reads the home loading screen's CSS keyframes (globals.css, HOME LOADING
 * SCREEN) so the JS side follows the clock the visuals actually run on, which
 * starts at first style, not at navigation start.
 */
const INTRO_KEYFRAMES = /^home-intro-(paper-lift|nav-drop|logo-drop|walker-exit)$/;

export function getIntroAnimations(): CSSAnimation[] {
  if (typeof document === 'undefined' || typeof document.getAnimations !== 'function') return [];
  return document
    .getAnimations()
    .filter((a): a is CSSAnimation => 'animationName' in a && INTRO_KEYFRAMES.test((a as CSSAnimation).animationName));
}

/** Resolves once every intro keyframe has finished or been cancelled. */
export function introKeyframesDone(animations: CSSAnimation[]): Promise<unknown> | undefined {
  if (animations.length === 0) return undefined;
  return Promise.allSettled(animations.map((a) => a.finished));
}

/**
 * Milliseconds since the intro keyframes began, falling back to time since
 * navigation start when none can be read.
 */
export function introElapsedMs(animations: CSSAnimation[] = getIntroAnimations()): number {
  const now = typeof document !== 'undefined' ? document.timeline?.currentTime : null;
  const start = animations.find((a) => typeof a.startTime === 'number')?.startTime;
  if (typeof now === 'number' && typeof start === 'number') return Math.max(0, now - start);
  return performance.now();
}
