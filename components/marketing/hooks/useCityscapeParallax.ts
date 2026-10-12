'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';
import { waitForHomeIntro } from './homeIntroGate';

type MatchMedia = ReturnType<GsapBundle['gsap']['matchMedia']>;
type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

/**
 * Scroll travel, in px, of a section's art across that section's whole scroll
 * range (it starts above its resting place and ends below it). The art moves
 * against the content: the content scrolls by at full speed and its cards rise
 * into place (useSectionReveals), while the skyline lags behind them, which is
 * what reads as distance. Kept small — the art is a 20% wash, and anything
 * larger shows as the picture sliding rather than as depth.
 */
const SECTION_TRAVEL = { wide: 67, compact: 34 };

/**
 * Travel for `print` art — real images that sit in the layout beside copy
 * (the footer's bridge print, the contact sheet's dog collage). Smaller than a
 * background's, so they drift against the text without ever reaching it.
 */
const PRINT_TRAVEL = { wide: 40, compact: 20 };

/**
 * Travel for `photo` layers — the faint wallpaper photos behind the green
 * bands and the footer. They are low-contrast and their sections are tall, so
 * the background travel alone barely registered; they get a longer run (the
 * layer is overscanned past it in globals.css, .city-parallax-photo).
 */
const PHOTO_TRAVEL = { wide: 120, compact: 60 };

/**
 * Hero art drift, in px, as the hero scrolls out. It starts at rest (the hero
 * is on screen at load) and sinks behind the departing headline.
 */
const HERO_DRIFT = { wide: 96, compact: 48 };

/**
 * Scrub lag, in seconds — the art eases after the scroll position instead of
 * tracking the wheel 1:1, which is what keeps trackpad deltas from reading as
 * steps. A touch longer than the hero video's own lag would feel detached.
 */
const SCRUB = 1.2;

/**
 * Hero entrance: as the loading paper lifts, the skyline rises up into place
 * from a little below and fades up to its wash. Owns `yPercent` and opacity;
 * scroll owns `y`, so the two compose in one transform instead of fighting.
 */
const HERO_SETTLE = { yPercent: 8.4, duration: 1.8, ease: 'expo.out' } as const;

/**
 * Parallax for the cityscape art layers on the home page — every
 * `[data-city-parallax]` element under the page (see CITYSCAPE PARALLAX LAYERS
 * in globals.css). `hero` drifts down from rest as the hero leaves; `section`
 * (background art), `photo` (wallpaper photos, longer travel) and `print`
 * (in-layout art, shorter travel, opposite direction) run through their
 * section's or footer's full scroll range.
 *
 * Scoped to the page element with its own matchMedia/context, reverted on
 * unmount; it never touches ScrollTriggers it does not own (gsapLoader.ts).
 * Skipped under prefers-reduced-motion: the layers are static by default.
 */
export function useCityscapeParallax(pageRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    if (!page || prefersReducedMotion()) return;

    let cancelled = false;
    let mm: MatchMedia | undefined;
    let entranceCtx: GsapContext | undefined;

    loadGsap()
      .then(({ gsap }) => {
        if (cancelled) return;
        mm = gsap.matchMedia(page);

        // Both queries listed: matchMedia only runs the callback while at
        // least one condition matches, so `isWide` alone skipped tablets.
        mm.add({ isWide: '(min-width: 1024px)', isCompact: '(max-width: 1023px)' }, (context) => {
          const { isWide } = context.conditions as { isWide: boolean };
          const sectionTravel = isWide ? SECTION_TRAVEL.wide : SECTION_TRAVEL.compact;
          const printTravel = isWide ? PRINT_TRAVEL.wide : PRINT_TRAVEL.compact;
          const photoTravel = isWide ? PHOTO_TRAVEL.wide : PHOTO_TRAVEL.compact;
          const drift = isWide ? HERO_DRIFT.wide : HERO_DRIFT.compact;

          gsap.utils.toArray<HTMLElement>('[data-city-parallax]').forEach((art) => {
            const section = art.closest('section, footer');
            if (!section) return;
            gsap.set(art, { willChange: 'transform' });

            if (art.dataset.cityParallax === 'hero') {
              gsap.to(art, {
                y: drift,
                ease: 'none',
                scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: SCRUB },
              });
              return;
            }

            const mode = art.dataset.cityParallax;
            // Backgrounds lag (start high, end low); prints run the other way,
            // rising against the wallpaper behind them, so the two layers pull
            // apart instead of drifting together.
            const travel =
              mode === 'print' ? -printTravel : mode === 'photo' ? photoTravel : sectionTravel;
            gsap.fromTo(
              art,
              { y: -travel },
              {
                y: travel,
                ease: 'none',
                scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: SCRUB },
              }
            );
          });
        });

        // Outside matchMedia so a breakpoint change never replays it.
        const heroArt = page.querySelector<HTMLElement>('[data-city-parallax="hero"]');
        if (!heroArt) return;
        // The wash strength lives in globals.css; read it before parking the
        // layer at 0 so the fade lands exactly there, then hand it back.
        const restOpacity = Number(getComputedStyle(heroArt).opacity) || 0.2;
        // Parked before the gate opens; the page is still hidden behind the
        // loading screen at this point, so nothing is seen jumping.
        entranceCtx = gsap.context(() => {
          gsap.set(heroArt, { yPercent: HERO_SETTLE.yPercent, opacity: 0 });
        });
        return waitForHomeIntro().then(() => {
          if (cancelled) return;
          entranceCtx?.add(() => {
            gsap.to(heroArt, {
              yPercent: 0,
              opacity: restOpacity,
              duration: HERO_SETTLE.duration,
              ease: HERO_SETTLE.ease,
              clearProps: 'opacity',
            });
          });
        });
      })
      .catch((err) => {
        console.warn('[useCityscapeParallax] gsap unavailable; cityscape art renders static.', err);
      });

    return () => {
      cancelled = true;
      entranceCtx?.revert();
      mm?.revert();
    };
  }, [pageRef]);
}
