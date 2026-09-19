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
 * Walker figure — carousel "top" layer, inverted. The carousel had it resting
 * at zero and stepping left + up in scale on hover; here the stepped-out
 * position IS the rest state and hovering walks it back, so the figure settles
 * toward the copy instead of away from it. Same two values, swapped ends.
 */
const WALKER = {
  restXPercent: -12.6,
  restScale: 2.4425 / 2.25,
  hoverXPercent: 0,
  hoverScale: 1,
  duration: 0.75,
  ease: EASE_IN,
  resetDuration: 0.75,
  /* The figure is the largest thing that moves, so the full delta made it the
     loudest part of the hover. It travels at a fraction of what the other
     layers do — a drift toward the copy, not a step. */
  intensity: 0.4,
};

/** Skyline — carousel "bottom" layer: a 10s drift, so it reads as depth, not motion. */
const BACKDROP = {
  xPercentDelta: -11.3,
  duration: 10,
  /* Linear-ish: a 10s drift should not accelerate, it should creep. */
  ease: 'power1.out',
  resetDuration: 0.75,
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
    if (prefersReducedMotion()) {
      // No motion, but the walker's rest position is a real part of the card's
      // layout now, so it is written once here instead of being skipped with
      // the rest of the choreography.
      const walker = walkerRef.current;
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
        // The backdrop rests at zero; the walker rests stepped out (see WALKER
        // above). Placement is still CSS's job on the figure wrapper — this
        // hook owns the image's own transform, so the two never compose.
        mmRef.current = gsap.matchMedia();
        mmRef.current.add('(min-width: 768px)', () => {
          gsap.set(walkerRef.current, { xPercent: WALKER.restXPercent, scale: WALKER.restScale });
        });
        mmRef.current.add(STACKED_CARD, () => {
          gsap.set(walkerRef.current, { xPercent: 0, scale: 1 });
        });
        gsap.set(backdropRef.current, { xPercent: 0 });
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
      gsap.killTweensOf([cardRef.current, backdropRef.current, walkerRef.current, priceRef.current, ctaRef.current]);
    };
  }, []);

  const onEnter = useCallback(() => {
    const gsap = gsapRef.current;
    if (!gsap || isStacked()) return;

    gsap.killTweensOf([cardRef.current, backdropRef.current, walkerRef.current, priceRef.current, ctaRef.current]);

    gsap.to(cardRef.current, {
      scale: toward(1, CARD.hoverScale),
      y: toward(0, CARD.hoverY),
      duration: CARD.duration,
      ease: CARD.ease,
    });
    gsap.to(walkerRef.current, {
      xPercent: toward(WALKER.restXPercent, WALKER.hoverXPercent, WALKER.intensity),
      scale: toward(WALKER.restScale, WALKER.hoverScale, WALKER.intensity),
      duration: WALKER.duration,
      ease: WALKER.ease,
    });
    gsap.to(backdropRef.current, {
      xPercent: toward(0, BACKDROP.xPercentDelta),
      duration: BACKDROP.duration,
      ease: BACKDROP.ease,
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

    gsap.killTweensOf([cardRef.current, backdropRef.current, walkerRef.current, priceRef.current, ctaRef.current]);

    gsap.to(cardRef.current, {
      scale: 1,
      y: 0,
      duration: CARD.resetDuration,
      ease: EASE_OUT,
    });
    gsap.to(walkerRef.current, {
      xPercent: WALKER.restXPercent,
      scale: WALKER.restScale,
      duration: WALKER.resetDuration,
      ease: EASE_OUT,
    });
    gsap.to(backdropRef.current, {
      xPercent: 0,
      duration: BACKDROP.resetDuration,
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
