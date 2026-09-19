'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useHomePawWalk } from './hooks/useHomePawWalk';
import { HOME_PAW_WALK_PATH, PAW_WALK_VIEWBOX } from '@/lib/marketing/paw-walk-path';
import {
  pawWalkDevFlags,
  readStoredTuning,
  writeStoredTuning,
  type PawWalkTuning,
} from '@/lib/marketing/paw-walk-tuning';

/**
 * Rendered print count. Grows on demand rather than always mounting a fixed
 * worst-case number of `<img>` elements: `useHomePawWalk` measures the actual
 * route length against the page's real size and stride (see
 * `estimateRequiredPawSteps` / `pawStepsForRouteLength`) and reports back
 * through `growStepCount` whenever more prints are needed than are currently
 * mounted — on first layout, and again on a resize that makes the page
 * taller. Count only ever grows during a session (never shrinks, so an
 * already-tweened print is never unmounted mid-walk) and is capped at
 * `ABSOLUTE_MAX_STEPS`, the previous fixed allocation, as a safety net if a
 * dev-tuner size setting ever demands more steps than the estimate expects.
 */
const INITIAL_STEP_ESTIMATE = 56;
/** Extra prints mounted past the measured requirement, so a small measurement
    variance (a font swap, a late-loading image nudging page height) doesn't
    leave a visible gap before the next layout/resize pass catches up. */
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
