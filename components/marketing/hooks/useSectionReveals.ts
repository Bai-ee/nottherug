'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

const CARD_SELECTOR = [
  // :not() excludes the disabled personalized-care carousel's cards — that
  // section never renders, so this selector list matches the live home page
  // exactly as it did in app/page.tsx's initSectionReveals.
  '.service-card:not(#home-animated-products-grid .service-card)',
  '.review-card',
  '.hood-card',
  '.trust-card',
  '.pricing-card',
  '.team-card',
  '.value-cell',
  '.process-step',
  '.cta-band',
  '.contact-card',
  '.package-tier',
  '.booking-form',
  '.phase-callout',
].join(',');

const HEADING_SELECTOR = [
  '.section h2',
  '.section h3:not(.service-card h3)',
  '.section .label',
  '.page-hero h1',
  '.page-hero p',
  '.book-hero h1',
  '.book-hero p',
].join(',');

/**
 * Fades up headings and cards as they scroll into view, scoped to the page
 * container passed in. Each page owns its own instance and its own
 * gsap.context — reverting on unmount touches only this page's triggers.
 */
export function useSectionReveals(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion()) return;

    let cancelled = false;
    let ctx: GsapContext | undefined;

    loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;
        ctx = gsap.context(() => {
          const headings = Array.from(container.querySelectorAll(HEADING_SELECTOR));
          const cards = Array.from(container.querySelectorAll(CARD_SELECTOR));

          if (headings.length) {
            gsap.set(headings, { autoAlpha: 0, y: 26 });
            ScrollTrigger.batch(headings, {
              onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', overwrite: true }),
              onEnterBack: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', overwrite: true }),
              onLeave: (batch) => gsap.to(batch, { autoAlpha: 0, y: 26, duration: 0.4, stagger: 0.04, ease: 'power3.out', overwrite: true }),
              onLeaveBack: (batch) => gsap.to(batch, { autoAlpha: 0, y: 26, duration: 0.4, stagger: 0.04, ease: 'power3.out', overwrite: true }),
              start: 'top 90%',
              end: 'bottom top',
            });
          }

          if (cards.length) {
            gsap.set(cards, { autoAlpha: 0, y: 52 });
            ScrollTrigger.batch(cards, {
              onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.085, ease: 'power3.out', overwrite: true }),
              onEnterBack: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.085, ease: 'power3.out', overwrite: true }),
              onLeave: (batch) => gsap.to(batch, { autoAlpha: 0, y: 52, duration: 0.4, stagger: 0.05, ease: 'power3.out', overwrite: true }),
              onLeaveBack: (batch) => gsap.to(batch, { autoAlpha: 0, y: 52, duration: 0.4, stagger: 0.05, ease: 'power3.out', overwrite: true }),
              start: 'top 88%',
              end: 'bottom top',
            });
          }
        }, container);
      })
      .catch((err) => {
        console.warn('[useSectionReveals] gsap unavailable; sections render without scroll reveal.', err);
      });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [containerRef]);
}
