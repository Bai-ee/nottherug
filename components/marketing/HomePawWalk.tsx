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
 * Upper bound on prints. useHomePawWalk walks the route at a fixed stride and
 * hides whatever is left over, so the number you actually see depends on how
 * long the route is on screen — this is only the ceiling. It has to cover the
 * tuner's smallest paw size, which packs the most steps onto the route.
 */
const MAX_STEPS = 320;

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

  const applyTuning = useCallback((next: PawWalkTuning) => {
    setTuning(next);
    writeStoredTuning(next);
  }, []);

  useHomePawWalk(layerRef, tuning, setMeasuredSize);

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
        {Array.from({ length: MAX_STEPS }, (_, i) => (
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
