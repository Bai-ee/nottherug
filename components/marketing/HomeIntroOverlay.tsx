'use client';

import { useRef } from 'react';
import { useHomeIntroSequence } from './hooks/useHomeIntroSequence';

/** The walker-and-three-dogs illustration, flattened to a silhouette in CSS. */
const WALKER_ART = '/img/3Top.png';

/**
 * Runs before anything paints, so the visitor never sees the nav or the hero
 * ahead of the loading screen. It has to be a plain inline <script> in the
 * markup — an effect runs after hydration (too late), and next/script's
 * `beforeInteractive` is root-layout only, which would put it on every route.
 *
 * It does three things and nothing else:
 *  - reduced motion, or a phone-width viewport (<= 768px, where the walker
 *    read as a flash over the stacked hero): leaves the attribute unset, so
 *    no loading screen at all
 *  - otherwise marks <html data-home-intro="loading">, which globals.css uses
 *    to hide everything but the overlay
 *  - arms a last-ditch failsafe: if the React sequence never runs at all, the
 *    page shows anyway. It sits behind useHomeIntroSequence's own watchdog on
 *    purpose — that one also unparks the nav, so it must get there first.
 */
const INTRO_BOOTSTRAP = `(function(){try{
var d=document.documentElement;
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
if(window.matchMedia('(max-width: 768px)').matches)return;
d.dataset.homeIntro='loading';
window.setTimeout(function(){if(d.dataset.homeIntro==='loading'){d.dataset.homeIntro='done';}},7000);
}catch(e){}})();`;

/**
 * Home loading screen: the walker silhouette centred on the paper background,
 * alone on screen until the hero's assets are ready. See useHomeIntroSequence
 * for the handoff into the nav drop and the hero entrance.
 */
export default function HomeIntroOverlay() {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const walkerRef = useRef<HTMLDivElement | null>(null);
  const mounted = useHomeIntroSequence(overlayRef, walkerRef);

  return (
    <>
      <script id="home-intro-bootstrap" dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }} />
      {mounted && (
        <div id="home-intro-overlay" ref={overlayRef} aria-hidden="true">
          {/* Shell moves, image bobs — see #home-intro-walker-shell in globals.css. */}
          <div id="home-intro-walker-shell" ref={walkerRef}>
            {/* First-paint-blocking loading screen (see the module comment on
                INTRO_BOOTSTRAP above): this element also carries its own
                running CSS keyframe animation (#home-intro-walker-silhouette
                in globals.css bobs it on a 2.4s loop, independent of the
                shell's own GSAP exit transform on walkerRef). Given how timing-
                sensitive this first paint is, converting it to next/image
                belongs with the rest of the hero/loading-media pass in P3
                (plans/010-production-final-mile-optimization.md), where it can
                get the same before/after Lighthouse comparison as the other
                above-the-fold media. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- first-paint loading overlay with its own CSS keyframe animation; next/image conversion deferred to P3 with the rest of the hero/loading media */}
            <img
              id="home-intro-walker-silhouette"
              src={WALKER_ART}
              alt=""
              fetchPriority="high"
              width={499}
              height={238}
              decoding="async"
            />
          </div>
        </div>
      )}
    </>
  );
}
