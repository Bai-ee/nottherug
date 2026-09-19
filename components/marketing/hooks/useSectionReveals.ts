'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

const CARD_SELECTOR = [
  // :not() excludes the disabled personalized-care carousel's cards — that
  // section never renders, so this selector list matches the live home page
  // exactly as it did in app/page.tsx's initSectionReveals.
  '.service-card:not(#home-animated-products-grid .service-card)',
  // The home voices band renders static — four equal columns whose bylines
  // line up across the row, which a per-card fade breaks up (FeaturedReviews).
  '.review-card:not(#home-featured-reviews-section .review-card)',
  '.hood-card',
  '.trust-card',
  '.pricing-card',
  '.team-card',
  '.value-cell',
  '.process-step',
  '.cta-band',
  '.contact-card',
  '.package-tier',
  // Both home-page form sheets render static: the rates section's intake and
  // the contact sheet at the foot of the page ("A little about you"). A form
  // that fades up as you reach it moves under the cursor of someone already
  // reaching for its first field.
  '.booking-form:not(#home-rates-intake-sheet):not(#home-contact-sheet-form-sheet)',
  '.phase-callout',
].join(',');

/**
 * Fades up cards as they scroll into view, scoped to the page container
 * passed in. Section headers (h2/h3/.label) render static — they are not
 * revealed, so a header is never hidden while its section is on screen.
 *
 * Each page owns its own instance and its own gsap.context — reverting on
 * unmount touches only this page's triggers.
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
          const cards = Array.from(container.querySelectorAll(CARD_SELECTOR));

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
