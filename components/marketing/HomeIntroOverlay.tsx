'use client';

import { useEffect } from 'react';
import { useHomeIntroSequence } from './hooks/useHomeIntroSequence';

/**
 * The walker-and-three-dogs illustration, flattened to a silhouette in CSS
 * (brightness(0)), so only its shape matters: this is /img/3Top.png reduced to
 * a black alpha mask. It is first-paint critical and fetched at high priority,
 * and the full-colour PNG was ~95 KB of the early request budget.
 */
const WALKER_ART = '/img/home-intro-walker-silhouette.webp';

/**
 * Runs before anything paints, so the visitor never sees the nav or the hero
 * ahead of the loading screen. It has to be a plain inline <script> in the
 * markup — an effect runs after hydration (too late), and next/script's
 * `beforeInteractive` is root-layout only, which would put it on every route.
 *
 * It does three things and nothing else:
 *  - reduced motion: leaves the attributes unset, so no loading screen at all
 *  - otherwise marks <html data-home-intro="loading">, which starts the
 *    CSS-only loading screen in globals.css (it never hides the page), and
 *    <html data-home-intro-ran>, which stays for the life of the page (see
 *    INTRO_PAGE_FADE_OFF)
 *  - arms a last-ditch failsafe: if the React sequence never runs at all, the
 *    intro state is cleared anyway (the CSS keyframes have long finished).
 */
const INTRO_BOOTSTRAP = `(function(){try{
var d=document.documentElement;
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
d.dataset.homeIntro='loading';d.dataset.homeIntroRan='';
window.setTimeout(function(){if(d.dataset.homeIntro==='loading'){d.dataset.homeIntro='done';}},2500);
}catch(e){}})();`;

/**
 * The page's own 0.4s fade-in (`.page.active` in globals.css) plays entirely
 * behind the opaque loading sheet, so it is invisible here, but it costs the
 * LCP: the browser does not record the hero as painted while it is fading in,
 * and nothing repaints it until GSAP touches it, so the reported LCP slides
 * from the first frame (~0.35s) to ~0.85s. That moves the cutoff Lighthouse
 * simulates against and pulls in far more of the page's downloads.
 *
 * Keyed on data-home-intro-ran, not data-home-intro: the latter is cleared
 * when the intro ends, and a fade that is switched off and back on starts over,
 * which would flash the whole page. Without the loading screen (reduced motion,
 * client-side navigation back to home) the fade is unchanged.
 */
const INTRO_PAGE_FADE_OFF = '[data-home-intro-ran] #page-home { animation: none; }';

/**
 * Home loading screen: a brief, fixed-length decorative intro — the walker
 * silhouette on the paper background walks off, the paper lifts and the nav
 * drops in. It never waits on assets and never blocks the page underneath.
 * See useHomeIntroSequence for the timers and the hero-entrance handoff.
 */
export default function HomeIntroOverlay() {
  const mounted = useHomeIntroSequence();

  // The marker belongs to this document load's first home view only.
  useEffect(() => () => {
    delete document.documentElement.dataset.homeIntroRan;
  }, []);

  return (
    <>
      <script id="home-intro-bootstrap" dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }} />
      <style id="home-intro-page-fade-off">{INTRO_PAGE_FADE_OFF}</style>
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
          {/* Dashed walk line under the walker: draws out, then retracts
              behind it as it leaves (#home-intro-walk-path in globals.css). */}
          <span id="home-intro-walk-path" />
        </div>
      )}
    </>
  );
}
