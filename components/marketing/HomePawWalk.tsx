'use client';

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useHomePawWalk, estimateRequiredPawSteps } from './hooks/useHomePawWalk';
import { HOME_PAW_WALK_PATH, PAW_WALK_VIEWBOX } from '@/lib/marketing/paw-walk-path';
import {
  pawWalkDevFlags,
  readStoredTuning,
  writeStoredTuning,
  type PawWalkTuning,
} from '@/lib/marketing/paw-walk-tuning';

/**
 * Rendered print count. INITIAL_STEP_ESTIMATE is a measurement, not a guess:
 * it is the largest requirement (route length / stride — see
 * `estimateRequiredPawSteps` / `pawStepsForRouteLength`) observed on the
 * production home page at 320/375/400/768/1024/1280/1440/1920px widths (the
 * max was 145 prints, at 1920px), plus headroom, so the shipped default never
 * needs to grow past it. That matters: growing later mounts new nodes and
 * tears down/rebuilds the whole GSAP ScrollTrigger context, and doing that
 * turned out to be able to shift the timing of an unrelated scroll-triggered
 * UI (the welcome modal) enough to flip a pre-existing Playwright race in
 * tests/e2e/public-routes.spec.ts — real work worth keeping off the common
 * path even though it runs once, off-screen, during the intro wipe.
 *
 * `useHomePawWalk` still measures on mount and on every resize, and reports
 * back through `growStepCount` for the cases the fixed estimate doesn't
 * cover — an unusually tall page, or the dev tuner's smaller sizes packing
 * more steps onto the route. Count only ever grows during a session (never
 * shrinks, so an already-tweened print is never unmounted mid-walk) and is
 * capped at `ABSOLUTE_MAX_STEPS`, the previous fixed allocation, as a
 * last-resort ceiling.
 */
const INITIAL_STEP_ESTIMATE = 168;
/** Extra prints mounted past a measured requirement that exceeds
    INITIAL_STEP_ESTIMATE, so a small measurement variance doesn't leave a
    visible gap before the next layout/resize pass catches up. */
const SAFETY_BUFFER_STEPS = 16;
const ABSOLUTE_MAX_STEPS = 320;

const PAW_SRC = { left: '/img/pawl.png', right: '/img/pawr.png' } as const;

/** Dev-only panel, kept out of the production bundle by the ssr:false import
    plus the flag check below. */
const PawWalkTuner = dynamic(() => import('./PawWalkTuner'), { ssr: false });

const neverChanges = () => () => {};
const readTunerFlag = () => pawWalkDevFlags().tune;

/**
 * Paw trail that walks the whole home page along an editable SVG route.
 * The <path> is the source of truth for where the trail goes (see
 * lib/marketing/paw-walk-path.ts); it never paints in production. Placement
 * and the scroll-scrubbed reveal both live in useHomePawWalk.
 */
export default function HomePawWalk() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  // The dev flag is a client-only value, so it is read through
  // useSyncExternalStore: the server snapshot is false, which keeps the
  // rendered markup identical on both sides. It never changes mid-session.
  const tunerOpen = useSyncExternalStore(neverChanges, readTunerFlag, () => false);
  // Safe to seed straight from storage: `tuning` drives the trail through the
  // hook after mount and never appears in this component's markup.
  const [tuning, setTuning] = useState<PawWalkTuning>(readStoredTuning);
  const [measuredSize, setMeasuredSize] = useState(44);
  const [stepCount, setStepCount] = useState(INITIAL_STEP_ESTIMATE);

  const applyTuning = useCallback((next: PawWalkTuning) => {
    setTuning(next);
    writeStoredTuning(next);
  }, []);

  // Only ever grows: a measured requirement plus a small buffer, capped at
  // the old fixed allocation. See useHomePawWalk's onRequireSteps contract.
  const growStepCount = useCallback((required: number) => {
    setStepCount((prev) => Math.min(ABSOLUTE_MAX_STEPS, Math.max(prev, required + SAFETY_BUFFER_STEPS)));
  }, []);

  // Sizes the mounted count BEFORE the browser paints, not after: a
  // useLayoutEffect measurement (route length vs. stride, from the page box
  // and SVG path — both already in the DOM at this point) can call
  // growStepCount and have React re-render/re-commit synchronously, in the
  // same tick, before anything ever gets to see the smaller intermediate
  // count. Without this, the estimate-then-grow instead happened inside
  // useHomePawWalk's regular (post-paint) effect, which added a batch of new
  // <img> nodes and tore down/rebuilt the whole ScrollTrigger context a beat
  // after first paint — invisible to a human, but real DOM churn that shifted
  // the timing of an unrelated scroll-triggered UI (the welcome modal) enough
  // to flip a pre-existing Playwright race in tests/e2e/public-routes.spec.ts.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const required = estimateRequiredPawSteps(layer, tuning, measuredSize);
    if (required + SAFETY_BUFFER_STEPS > stepCount) growStepCount(required);
    // measuredSize is a rough fallback only used when tuning.size is 0 (dev
    // tuner "use the CSS clamp" mode); it does not need to retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuning, stepCount, growStepCount]);

  useHomePawWalk(layerRef, tuning, stepCount, setMeasuredSize, growStepCount);

  return (
    <>
      <div id="home-paw-walk-layer" ref={layerRef} aria-hidden="true">
        <svg
          id="home-paw-walk-path-svg"
          viewBox={PAW_WALK_VIEWBOX}
          preserveAspectRatio="none"
          focusable="false"
        >
          <path id="home-paw-walk-path" d={HOME_PAW_WALK_PATH} />
        </svg>
        {/* Animation-controlled: useHomePawWalk positions and tweens each
            print by direct style/GSAP transform writes on the mounted <img>
            node, keyed off its DOM identity (id/className), not through
            next/image's own layout; width/height/decoding/loading are set
            explicitly below so this still behaves like a sized, deferred
            image. */}
        {Array.from({ length: stepCount }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- see comment above
          <img
            key={i}
            id={`home-paw-step-${i}`}
            className="home-paw-step"
            src={i % 2 === 0 ? PAW_SRC.left : PAW_SRC.right}
            alt=""
            width={444}
            height={475}
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>

      {tunerOpen && (
        <PawWalkTuner tuning={tuning} measuredSize={measuredSize} onChange={applyTuning} />
      )}
    </>
  );
}
