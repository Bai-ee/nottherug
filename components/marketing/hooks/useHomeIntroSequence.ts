'use client';

import { useEffect, useState } from 'react';
import { releaseHomeIntro } from './homeIntroGate';
import { startHomeIntro } from './homeIntroTiming';
import { getIntroAnimations, introElapsedMs, introKeyframesDone } from './homeIntroClock';

/**
 * `data-home-intro` on <html> is set by the inline script in HomeIntroOverlay,
 * before the page paints. globals.css plays the whole loading screen off it
 * (walker exit, paper wipe, nav drop) as CSS keyframes, so the visuals need no
 * JavaScript, GSAP or asset to finish. The page underneath is never hidden or
 * made inert: the overlay is pointer-transparent and decorative only.
 */
function setIntroDone() {
  document.documentElement.dataset.homeIntro = 'done';
}

/**
 * Home loading screen controller. It only keeps two timers: one opens the
 * hero-entrance gate as the paper starts to lift, and the intro ends (overlay
 * removed, state cleared) when the CSS keyframes actually finish, with a
 * ceiling timer as the fallback. Both are measured on the keyframes' own clock
 * — there is no asset wait and no added hold (see homeIntroTiming).
 *
 * Returns false once the overlay can leave the DOM.
 *
 * Under prefers-reduced-motion the inline script never sets the loading state,
 * so this hook finds no "loading" attribute, releases the hero immediately and
 * the page renders in its final state.
 */
export function useHomeIntroSequence() {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const root = document.documentElement;

    // Not a first document load (client-side nav back to home), reduced
    // motion, the inline script never ran, or a background tab (CSS timelines
    // do not tick in view there): nothing to play.
    if (root.dataset.homeIntro !== 'loading' || document.hidden) {
      setIntroDone();
      releaseHomeIntro();
      // Next tick, not inline: dropping the overlay is not a render-time sync.
      const unmount = setTimeout(() => setMounted(false), 0);
      return () => clearTimeout(unmount);
    }

    const animations = getIntroAnimations();
    return startHomeIntro({
      elapsedMs: introElapsedMs(animations),
      keyframesDone: introKeyframesDone(animations),
      onReveal: releaseHomeIntro,
      onDone: () => {
        setIntroDone();
        releaseHomeIntro();
        setMounted(false);
      },
    });
  }, []);

  return mounted;
}
