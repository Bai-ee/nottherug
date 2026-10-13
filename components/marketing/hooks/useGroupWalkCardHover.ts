'use client';

import { useCallback, useEffect, useRef } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';

/**
 * The layered hover choreography from the disabled product carousel
 * (components/AnimatedServiceCards.tsx), ported onto the featured Group Walk
 * card and driven by its CTA instead of the whole card.
 *
 * Every number below is that carousel's tuned CARDS[2] values at
 * globalIntensity 1 — the walker card, whose art the feature card reuses. Two
 * things changed in the port, both forced by the new card's size:
 *
 *  1. The carousel tweened absolute pixels (top layer -195 -> -225.25px)
 *     against a fixed 240px/640px layer in a 160px-tall photo stage. The
 *     feature card's art panel is ~300px tall and fluid, so those offsets are
 *     re-expressed as a percentage of each layer's OWN width — the same
 *     proportional travel at any card size: -30.25/240 = -12.6% for the
 *     walker, -72.05/640 = -11.3% for the backdrop.
 *  2. Only the hover DELTA is ported, never the carousel's rest transform.
 *     The feature card composes its art in CSS — on the figure WRAPPER, not
 *     on the image this hook animates, so the two transforms never compose.
 */

/*
 * Easing note for the whole file: every layer used `back.out(...)`, which
 * overshoots its target and springs back. Stacked across five layers at five
 * different durations, that read as wobble. Everything now lands on a plain
 * out-curve — it decelerates into place and stops, which is what makes the
 * choreography read as elegant rather than bouncy.
 */
const EASE_IN = 'power3.out';
const EASE_OUT = 'power2.out';

const CARD = {
  hoverScale: 1.0055,
  /* Lift only — the carousel tilted the card 1.65deg on hover, which reads as
     a wobble on a card this size. It rises and settles instead. */
  hoverY: -8,
  duration: 0.55,
  ease: EASE_IN,
  /* Was 1.6s: long enough that the card was still settling when the pointer
     came back. */
  resetDuration: 0.85,
};

/**
 * Walker figure rest pose. The carousel's "top" layer rested at zero and stepped
 * left + up in scale on hover; here the stepped-out pose is the rest state, which
 * is what the scroll drift (WALKER_SCROLL below) is centred on. The figure no
 * longer reacts to hover at all.
 */
const WALKER = {
  restXPercent: -12.6,
  restScale: 2.4425 / 2.25,
};

/**
 * Walker scroll drift. The figure no longer reacts to hover: as the card scrolls
 * through the viewport it slides left to right (and back as you scroll up),
 * scrubbed to the scroll position. `travel` is the total horizontal travel as a
 * fraction of the art panel's width, centred on the figure's rest position, so
 * it starts `travel / 2` left of rest and ends `travel / 2` right of it.
 */
const WALKER_SCROLL = {
  travel: 0.5,
  /* Seconds the figure takes to catch up with the scrollbar: smooths wheel
     steps without making it float after you stop. */
  scrub: 0.8,
};

/**
 * Skyline scroll drift: the walker's counter-move. It slides the opposite way
 * (right to left while the figure goes left to right) over a shorter distance,
 * so the two layers separate like foreground and background. `travel` is a
 * fraction of the art panel's width. The skyline <img> is overscanned 12.5% of
 * the panel on each side (see #home-group-walk-feature-art-backdrop), so
 * travel / 2 must stay under 0.125 or the panel edge shows.
 */
const BACKDROP_SCROLL = {
  travel: 0.2,
  scrub: 1.2,
};

const PRICE = { hoverScale: 1.055, inDuration: 0.3, outDuration: 0.25 };
const CTA = { hoverScale: 1.044, inDuration: 0.25, outDuration: 0.2 };

/**
 * Master intensity for the whole hover choreography. Every tuned number below
 * is the carousel's original value at full strength; this scales the DELTA
 * between each layer's rest state and its hover state, so one knob dials the
 * entire effect. 1 = the ported carousel, 0.5 = half the travel everywhere.
 */
const HOVER_INTENSITY = 0.5;

/**
 * Below this the card stacks and the illustration runs the full width of its
 * own strip (see the @media block in GroupWalkFeatureCard). The walker's rest
 * offset and overscale are desktop placement — applied to a full-width image
 * they push it off centre and crop the near edge — so the figure rests plain
 * at 0/1 there, and the hover choreography sits out entirely.
 */
const STACKED_CARD = '(max-width: 767px)';
const isStacked = () =>
  typeof window !== 'undefined' && window.matchMedia(STACKED_CARD).matches;

/** Rest -> hover, scaled by the master intensity and any per-layer intensity. */
const toward = (rest: number, hover: number, layerIntensity = 1) =>
  rest + (hover - rest) * HOVER_INTENSITY * layerIntensity;

/**
 * Paw trail. Static now: it sits landed at rest and hover does not touch it —
 * the prints walking in under the copy read as a second, competing motion
 * against the card lift. The step/rise/stagger values the animation used are
 * gone with it.
 */
const PAWS = {
  size: 1.44,
  opacity: 0.0935,
  rotationOffset: 12.65,
  containerRotation: -5.5,
  offsetX: 56,
  offsetY: -62,
};

/** Diagonal walking-gait trail, verbatim from the carousel. */
const PAW_SPOTS = [
  { left: 69, top: 15, rotate: -8 },
  { left: 77, top: 32, rotate: 10 },
  { left: 62, top: 39, rotate: -12 },
  { left: 69, top: 53, rotate: 8 },
  { left: 51, top: 61, rotate: -10 },
  { left: 58, top: 67, rotate: 12 },
];

const PAW_CENTROID = {
  left: PAW_SPOTS.reduce((sum, s) => sum + s.left, 0) / PAW_SPOTS.length,
  top: PAW_SPOTS.reduce((sum, s) => sum + s.top, 0) / PAW_SPOTS.length,
};

const PAW_BASE_PX = 22;

/** Render data for the paw trail: the hook animates them, the card draws them. */
export const PAW_TRAIL = {
  containerRotation: PAWS.containerRotation,
  transformOrigin: `${PAW_CENTROID.left}% ${PAW_CENTROID.top}%`,
  glyphPx: PAW_BASE_PX * PAWS.size,
  spots: PAW_SPOTS.map((spot) => ({
    // Spread from the centroid so the whole trail scales with `size`, the way
    // the carousel spaced it.
    left: PAW_CENTROID.left + (spot.left - PAW_CENTROID.left) * PAWS.size,
    top: PAW_CENTROID.top + (spot.top - PAW_CENTROID.top) * PAWS.size,
    rotate: spot.rotate,
  })),
};

/** Places the trail where it lives — landed, faint, and not animated. */
function setPawsStatic(gsap: GsapBundle['gsap'], paws: Array<HTMLDivElement | null>) {
  paws.forEach((el, p) => {
    if (!el) return;
    gsap.set(el, {
      x: PAWS.offsetX,
      y: PAWS.offsetY,
      rotation: PAW_SPOTS[p].rotate + PAWS.rotationOffset,
      opacity: PAWS.opacity,
      scale: 1,
    });
  });
}

export function useGroupWalkCardHover() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLImageElement | null>(null);
  const walkerRef = useRef<HTMLImageElement | null>(null);
  const priceRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const pawRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Loaded once and held, so the first hover does not wait on a dynamic import.
  const gsapRef = useRef<GsapBundle['gsap'] | null>(null);
  const mmRef = useRef<ReturnType<GsapBundle['gsap']['matchMedia']> | null>(null);

  useEffect(() => {
    // Snapshot the nodes this effect (and its cleanup) touch, once, right
    // here. The effect runs once (mount) — capturing `.current` now and
    // reading only these local variables afterwards means the cleanup below
    // can never read a ref that has since changed out from under it.
    const card = cardRef.current;
    const backdrop = backdropRef.current;
    const walker = walkerRef.current;
    const price = priceRef.current;
    const cta = ctaRef.current;

    if (prefersReducedMotion()) {
      // No motion, but the walker's rest position is a real part of the card's
      // layout now, so it is written once here instead of being skipped with
      // the rest of the choreography.
      if (walker && !isStacked()) {
        walker.style.transform = `translateX(${WALKER.restXPercent}%) scale(${WALKER.restScale})`;
      }
      // The paws are part of the card's resting art now, so they are placed
      // here too — reduced motion loses the choreography, not the layer.
      pawRefs.current.forEach((el, p) => {
        if (!el) return;
        el.style.transform = `translate(${PAWS.offsetX}px, ${PAWS.offsetY}px) rotate(${PAW_SPOTS[p].rotate + PAWS.rotationOffset}deg)`;
        el.style.opacity = String(PAWS.opacity);
      });
      return;
    }
    let cancelled = false;

    loadGsap()
      .then(({ gsap }) => {
        if (cancelled) return;
        gsapRef.current = gsap;
        // The skyline rests at zero; the walker rests stepped out (see WALKER
        // above). Placement is still CSS's job on the figure wrapper — this
        // hook owns the image's own transform, so the two never compose.
        mmRef.current = gsap.matchMedia();
        // Scroll drift (see WALKER_SCROLL / BACKDROP_SCROLL), scrubbed to the card's
        // pass through the viewport. Shared by every layout: only the walker's rest
        // pose differs between them (set by the caller). Only transform is
        // animated; x is in px because the figure's own xPercent is relative to
        // its width, not the panel's. Created inside a matchMedia callback so it is
        // reverted when the layout changes.
        const addScrollDrift = () => {
          const panel = walker?.closest<HTMLElement>('#home-group-walk-feature-art-panel');
          if (!walker || !backdrop || !panel) return;
          const walkerTravel = () => panel.clientWidth * WALKER_SCROLL.travel;
          const backdropTravel = () => panel.clientWidth * BACKDROP_SCROLL.travel;
          // Triggered on the art panel, not the card: stacked on a phone the art is
          // only the card's top strip, so a card-length scroll range would leave the
          // figure mid-travel while it is on screen. On desktop the panel spans the
          // whole card, so the range is the same.
          const trigger = (scrub: number) => ({
            trigger: panel,
            start: 'top bottom',
            end: 'bottom top',
            scrub,
            invalidateOnRefresh: true,
          });
          gsap.fromTo(
            walker,
            { x: () => -walkerTravel() / 2 },
            { x: () => walkerTravel() / 2, ease: 'none', scrollTrigger: trigger(WALKER_SCROLL.scrub) }
          );
          gsap.fromTo(
            backdrop,
            { x: () => backdropTravel() / 2 },
            { x: () => -backdropTravel() / 2, ease: 'none', scrollTrigger: trigger(BACKDROP_SCROLL.scrub) }
          );
        };
        mmRef.current.add('(min-width: 768px)', () => {
          gsap.set(walker, { xPercent: WALKER.restXPercent, scale: WALKER.restScale });
          addScrollDrift();
        });
        mmRef.current.add(STACKED_CARD, () => {
          gsap.set(walker, { xPercent: 0, scale: 1 });
          addScrollDrift();
        });
        gsap.set(backdrop, { xPercent: 0 });
        setPawsStatic(gsap, pawRefs.current);
      })
      .catch((err) => {
        console.warn('[useGroupWalkCardHover] gsap unavailable; the card renders without hover motion.', err);
      });

    return () => {
      cancelled = true;
      mmRef.current?.revert();
      const gsap = gsapRef.current;
      if (!gsap) return;
      gsap.killTweensOf([card, price, cta]);
    };
  }, []);

  const onEnter = useCallback(() => {
    const gsap = gsapRef.current;
    if (!gsap || isStacked()) return;

    gsap.killTweensOf([cardRef.current, priceRef.current, ctaRef.current]);

    gsap.to(cardRef.current, {
      scale: toward(1, CARD.hoverScale),
      y: toward(0, CARD.hoverY),
      duration: CARD.duration,
      ease: CARD.ease,
    });
    gsap.to(priceRef.current, {
      scale: toward(1, PRICE.hoverScale),
      duration: PRICE.inDuration,
      ease: EASE_IN,
    });
    gsap.to(ctaRef.current, {
      scale: toward(1, CTA.hoverScale),
      duration: CTA.inDuration,
      ease: EASE_IN,
    });
  }, []);

  const onLeave = useCallback(() => {
    const gsap = gsapRef.current;
    if (!gsap || isStacked()) return;

    gsap.killTweensOf([cardRef.current, priceRef.current, ctaRef.current]);

    gsap.to(cardRef.current, {
      scale: 1,
      y: 0,
      duration: CARD.resetDuration,
      ease: EASE_OUT,
    });
    gsap.to(priceRef.current, { scale: 1, duration: PRICE.outDuration, ease: EASE_OUT });
    gsap.to(ctaRef.current, { scale: 1, duration: CTA.outDuration, ease: EASE_OUT });
  }, []);

  const setPawRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    pawRefs.current[index] = el;
  }, []);

  return { cardRef, backdropRef, walkerRef, priceRef, ctaRef, setPawRef, onEnter, onLeave };
}
