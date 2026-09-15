'use client';

type GsapExports = typeof import('gsap');
type ScrollTriggerExports = typeof import('gsap/ScrollTrigger');

export interface GsapBundle {
  gsap: GsapExports['gsap'];
  ScrollTrigger: ScrollTriggerExports['ScrollTrigger'];
}

let bundlePromise: Promise<GsapBundle> | null = null;

/**
 * Loads gsap + ScrollTrigger once for the whole app and registers the plugin
 * a single time. Every caller owns its own `gsap.context()` scope and reverts
 * only that scope — this loader never calls `ScrollTrigger.getAll()` or kills
 * triggers it doesn't own (see R13: the old page.tsx effect globally killed
 * every ScrollTrigger on each virtual-page switch).
 */
export function loadGsap(): Promise<GsapBundle> {
  if (!bundlePromise) {
    bundlePromise = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapModule, scrollTriggerModule]) => {
        const gsap = gsapModule.gsap ?? gsapModule.default;
        const { ScrollTrigger } = scrollTriggerModule;
        gsap.registerPlugin(ScrollTrigger);
        return { gsap, ScrollTrigger };
      }
    );
  }
  return bundlePromise;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
