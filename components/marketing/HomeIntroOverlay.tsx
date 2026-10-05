'use client';

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
 *  - reduced motion: leaves the attribute unset, so no loading screen at all
 *  - otherwise marks <html data-home-intro="loading">, which starts the
 *    CSS-only loading screen in globals.css (it never hides the page)
 *  - arms a last-ditch failsafe: if the React sequence never runs at all, the
 *    intro state is cleared anyway (the CSS keyframes have long finished).
 */
const INTRO_BOOTSTRAP = `(function(){try{
var d=document.documentElement;
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
d.dataset.homeIntro='loading';
window.setTimeout(function(){if(d.dataset.homeIntro==='loading'){d.dataset.homeIntro='done';}},2500);
}catch(e){}})();`;

/**
 * Home loading screen: a brief, fixed-length decorative intro — the walker
 * silhouette on the paper background walks off, the paper lifts and the nav
 * drops in. It never waits on assets and never blocks the page underneath.
 * See useHomeIntroSequence for the timers and the hero-entrance handoff.
 */
export default function HomeIntroOverlay() {
  const mounted = useHomeIntroSequence();

  return (
    <>
      <script id="home-intro-bootstrap" dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }} />
      {mounted && (
        <div id="home-intro-overlay" aria-hidden="true">
          {/* Shell exits, image bobs — see #home-intro-walker-shell in globals.css. */}
          <div id="home-intro-walker-shell">
            {/* First-paint-blocking loading screen (see the module comment on
                INTRO_BOOTSTRAP above): this element also carries its own
                running CSS keyframe animation (#home-intro-walker-silhouette
                in globals.css bobs it on a 2.4s loop, independent of the
                shell's own exit keyframe). Given how timing-
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
