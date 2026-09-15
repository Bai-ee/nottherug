'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

// Baked-in values from the former dev "Tune Paws" overlay (removed per R16 —
// see plans/002-production-readiness.md). These are the tuned defaults the
// site actually shipped with, not placeholders.
const REVEAL = {
  pawDuration: 0.7, pawStagger: 0.32, pawEase: 'power2.out', pawDistanceX: 36,
  copyDelay: 0.2, copyDuration: 0.5, copyStagger: 0.22, copyEase: 'power3.out', copyDistanceY: 16,
};
const HIDE = { pawDuration: 0.4, copyDuration: 0.35, ease: 'power3.out' };

/**
 * Paw-print watermark trail + step copy reveal for the home "How It Works"
 * strip. Scoped to the section ref; reverts only its own ScrollTrigger.
 */
export function useHowItWorksPawTrail(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    let cancelled = false;
    let ctx: GsapContext | undefined;

    loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;

        ctx = gsap.context(() => {
          const paws = Array.from(section.querySelectorAll('.hiw-paw-print'));
          const copies = Array.from(section.querySelectorAll('.hiw-step-copy'));
          if (!paws.length && !copies.length) return;

          gsap.set(paws, { autoAlpha: 0, x: -REVEAL.pawDistanceX });
          gsap.set(copies, { autoAlpha: 0, y: REVEAL.copyDistanceY });

          function play() {
            gsap
              .timeline({ defaults: { overwrite: true } })
              .to(paws, { autoAlpha: 1, x: 0, duration: REVEAL.pawDuration, ease: REVEAL.pawEase, stagger: REVEAL.pawStagger }, 0)
              .to(copies, { autoAlpha: 1, y: 0, duration: REVEAL.copyDuration, ease: REVEAL.copyEase, stagger: REVEAL.copyStagger }, REVEAL.copyDelay);
          }
          function hide() {
            gsap.to(paws, { autoAlpha: 0, x: -REVEAL.pawDistanceX, duration: HIDE.pawDuration, ease: HIDE.ease, overwrite: true });
            gsap.to(copies, { autoAlpha: 0, y: REVEAL.copyDistanceY, duration: HIDE.copyDuration, ease: HIDE.ease, overwrite: true });
          }

          ScrollTrigger.create({
            trigger: section,
            start: 'top 85%',
            end: 'bottom top',
            onEnter: play,
            onEnterBack: play,
            onLeave: hide,
            onLeaveBack: hide,
          });
        }, section);
      })
      .catch((err) => {
        console.warn('[useHowItWorksPawTrail] gsap unavailable; steps render without reveal.', err);
      });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [sectionRef]);
}
