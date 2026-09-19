'use client';

import { useEffect, useState, type RefObject } from 'react';
import { loadGsap, type GsapBundle } from './gsapLoader';
import { releaseHomeIntro } from './homeIntroGate';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

/** Floor: below this the loading screen reads as a flash of colour. */
const MIN_HOLD_MS = 800;
/** Ceiling: a stalled video or font must not hold the page hostage. */
const MAX_HOLD_MS = 2500;
/** Last resort once the sequence is running — see the watchdog below. */
const WATCHDOG_MS = 6000;

/**
 * `data-home-intro` on <html> is set by the inline script in HomeIntroOverlay,
 * before the nav or the page have painted. globals.css keys the hidden state
 * off it, so nothing but the overlay is ever on screen while it reads
 * "loading".
 */
type IntroState = 'loading' | 'revealing' | 'done';

function setIntroState(state: IntroState) {
  document.documentElement.dataset.homeIntro = state;
}

/**
 * Resolves once the two things the first frame is judged on are ready: the
 * webfonts (the headline re-flows without them) and the hero video (it sits
 * behind the wipe and would otherwise pop in after).
 */
function whenHeroAssetsReady(): Promise<unknown> {
  const waits: Promise<unknown>[] = [];

  if (document.fonts?.ready) waits.push(document.fonts.ready);

  const video = document.getElementById('hero-bg-video') as HTMLVideoElement | null;
  // HAVE_FUTURE_DATA (3) — enough buffered to start playing.
  if (video && video.readyState < 3) {
    waits.push(
      new Promise<void>((resolve) => {
        const done = () => resolve();
        video.addEventListener('canplay', done, { once: true });
        // A video that errors is still a resolved question: stop waiting.
        video.addEventListener('error', done, { once: true });
      })
    );
  }

  return Promise.all(waits);
}

function afterMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * How many copies of this hook are mounted. React's dev StrictMode mounts the
 * overlay, unmounts it and mounts it again: the first teardown must not clear
 * the loading state (the intro would be skipped in dev every time) and must
 * not leave it set either if that unmount was a real one.
 */
let activeMounts = 0;
/** Grace period for the StrictMode remount to take over the loading state. */
const REMOUNT_GRACE_MS = 150;

/**
 * Home loading screen: holds the walker silhouette on the paper background
 * until the hero's assets are ready, then walks it off, wipes the overlay up,
 * drops the nav logo in from above with the nav band following it, and opens
 * the gate so the existing hero entrance plays alongside.
 *
 * Returns false once the overlay has finished and can leave the DOM.
 *
 * Under prefers-reduced-motion the inline script never sets the loading state,
 * so this hook finds no "loading" attribute, releases the hero immediately and
 * the page renders as it always has.
 */
export function useHomeIntroSequence(
  overlayRef: RefObject<HTMLElement | null>,
  walkerRef: RefObject<HTMLElement | null>
) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const overlay = overlayRef.current;
    const root = document.documentElement;

    // Not a first document load (client-side nav back to home), reduced
    // motion, or the inline script never ran: no loading screen to play.
    //
    // A background tab is skipped too (opened in a new tab, restored session):
    // requestAnimationFrame is throttled there, so the timeline would sit
    // frozen until the visitor switched to it — they would arrive at a page
    // mid-intro, or at one the failsafe had already revealed.
    if (!overlay || root.dataset.homeIntro !== 'loading' || document.hidden) {
      setIntroState('done');
      releaseHomeIntro();
      setMounted(false);
      return;
    }

    let cancelled = false;
    let revealStarted = false;
    let ctx: GsapContext | undefined;
    activeMounts += 1;

    Promise.all([
      loadGsap(),
      Promise.race([whenHeroAssetsReady(), afterMs(MAX_HOLD_MS)]).then(() => afterMs(MIN_HOLD_MS)),
    ])
      .then(([{ gsap }]) => {
        if (cancelled) return;

        const navBar = document.getElementById('main-nav');
        const navLogo = document.querySelector<HTMLElement>('.nav-logo');
        let finished = false;

        ctx = gsap.context(() => {
          // Park the nav off-screen while it is still hidden, so unhiding it
          // mid-timeline reveals nothing at its resting position first.
          // yPercent (not y) leaves the logo's own CSS transform — the
          // translateY(-50%) that centres it on the bar, plus its rotation —
          // intact underneath.
          if (navBar) gsap.set(navBar, { yPercent: -100 });
          if (navLogo) gsap.set(navLogo, { yPercent: -180 });

          /**
           * The one way out of the intro, however it ends. Everything it
           * undoes is something that leaves the page unusable if it is
           * skipped — the nav is parked off-screen at this point, and only
           * clearProps hands it back to CSS.
           */
          const finishIntro = () => {
            if (finished) return;
            finished = true;
            window.clearTimeout(watchdog);
            setIntroState('done');
            // Hand the transforms back to CSS: #main-nav.nav-scrolled
            // restyles .nav-logo's transform on scroll, and an inline
            // transform from gsap outranks it.
            if (navBar) gsap.set(navBar, { clearProps: 'transform' });
            if (navLogo) gsap.set(navLogo, { clearProps: 'transform' });
            setMounted(false);
          };

          const tl = gsap.timeline({ onComplete: finishIntro });

          // If the timeline stops advancing (tab backgrounded mid-intro, so
          // rAF stops firing) jump it to the end rather than leave the nav
          // sitting off-screen. suppressEvents: onComplete would re-enter.
          const watchdog = window.setTimeout(() => {
            tl.progress(1, true);
            finishIntro();
          }, WATCHDOG_MS);

          // The walker heads off the right edge — the direction the mirrored
          // silhouette faces — then the paper lifts away.
          tl.to(walkerRef.current, { xPercent: 42, autoAlpha: 0, duration: 0.7, ease: 'power2.in' })
            .to(
              overlay,
              {
                yPercent: -100,
                duration: 0.9,
                ease: 'power3.inOut',
                onStart: () => {
                  // Page and nav become visible behind the rising paper, and
                  // the hero entrance starts on the same beat.
                  revealStarted = true;
                  setIntroState('revealing');
                  releaseHomeIntro();
                },
              },
              '-=0.35'
            )
            // Logo first, band behind it — the label drops in and the green
            // catches up under it.
            .to(navLogo, { yPercent: 0, duration: 0.7, ease: 'power4.out' }, '<0.1')
            .to(navBar, { yPercent: 0, duration: 0.6, ease: 'power3.out' }, '<0.12');
        }, overlay);
      })
      .catch((err) => {
        console.warn('[useHomeIntroSequence] intro could not play; revealing the page directly.', err);
        revealStarted = true;
        setIntroState('done');
        releaseHomeIntro();
        setMounted(false);
      });

    return () => {
      cancelled = true;
      activeMounts -= 1;
      ctx?.revert();

      if (revealStarted) {
        // Mid-reveal teardown: the page is already showing, just make sure
        // nothing is left hidden or waiting.
        setIntroState('done');
        releaseHomeIntro();
        return;
      }

      // Torn down before the reveal. If this was StrictMode's throwaway mount
      // the replacement is already on its way and keeps the loading state; if
      // it was a real unmount, nothing is left to lift the overlay's hidden
      // state off the page, so clear it.
      setTimeout(() => {
        if (activeMounts > 0) return;
        if (document.documentElement.dataset.homeIntro === 'loading') setIntroState('done');
        releaseHomeIntro();
      }, REMOUNT_GRACE_MS);
    };
  }, [overlayRef, walkerRef]);

  return mounted;
}
