'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';
import { waitForHomeIntro } from './homeIntroGate';
import { shouldPlayEntrance } from './homeIntroTiming';
import { introElapsedMs } from './homeIntroClock';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

function splitIntoWords(el: HTMLElement) {
  // Idempotency guard: gsap.context().revert() undoes the inline styles this
  // hook sets, but it does not undo splitIntoWords' own DOM rewrite — it's
  // plain innerHTML mutation, not a GSAP-tracked change. Without this check,
  // a second invocation (React StrictMode's dev-only double effect
  // invocation is the one that reaches this in practice; production runs
  // effects once) would re-split the already-split `.word-wrap`/`.word-inner`
  // markup, doubly nesting it and breaking the reveal. If it's already split,
  // there's nothing left to do — the existing spans are exactly what the
  // caller wants to animate.
  if (el.querySelector('.word-wrap')) return;

  const nodes = Array.from(el.childNodes);
  el.innerHTML = '';
  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      (node.textContent ?? '').split(/(\s+)/).forEach((word) => {
        if (!word.trim()) {
          el.appendChild(document.createTextNode(word));
          return;
        }
        const wrap = document.createElement('span');
        wrap.className = 'word-wrap';
        const inner = document.createElement('span');
        inner.className = 'word-inner';
        inner.textContent = word;
        wrap.appendChild(inner);
        el.appendChild(wrap);
      });
    } else if ((node as Element).nodeName === 'BR') {
      el.appendChild(document.createElement('br'));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      (node.textContent ?? '').split(/(\s+)/).forEach((word) => {
        if (!word.trim()) {
          el.appendChild(document.createTextNode(word));
          return;
        }
        const wrap = document.createElement('span');
        wrap.className = 'word-wrap';
        const inner = document.createElement('span');
        inner.className = 'word-inner';
        const clone = (node as Element).cloneNode(false) as Element;
        clone.textContent = word;
        inner.appendChild(clone);
        wrap.appendChild(inner);
        el.appendChild(wrap);
      });
    }
  });
}

/**
 * Home hero: brief decorative entrance (background clip-path reveal, headline
 * word-in, eyebrow and intro-copy fade) plus the hero image scroll parallax.
 * Scoped to the hero section ref — reverting on unmount only tears down this
 * section's tweens and ScrollTriggers.
 *
 * Nothing here gates usability. The markup is always fully visible; GSAP only
 * hides pieces at the instant it starts the entrance, and the entrance is
 * skipped outright when GSAP is not loaded by then (or the page is so late
 * that the loading screen is long over). The primary booking CTA row is never
 * made transparent or inert — it only gets a small rise. Under
 * prefers-reduced-motion, or if gsap fails to load or throws, the hero keeps
 * its normal final state.
 */
export function useHomeHeroMotion(heroRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || prefersReducedMotion()) return;

    let cancelled = false;
    let gsapReady = false;
    let parallaxCtx: GsapContext | undefined;
    let entranceCtx: GsapContext | undefined;
    // Set by the inline script in HomeIntroOverlay on a real document load.
    const introRan = document.documentElement.dataset.homeIntro === 'loading';

    const gsapLoaded = loadGsap();

    // Scroll parallax is independent of the entrance and of the loading screen.
    gsapLoaded
      .then(({ gsap }) => {
        gsapReady = true;
        if (cancelled) return;
        parallaxCtx = gsap.context(() => {
          const heroImg = hero.querySelector('#hero-bg-video') || hero.querySelector('.hero-visual .hero-img');
          if (heroImg) {
            gsap.to(heroImg, {
              yPercent: 20,
              ease: 'none',
              scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.8 },
            });
          }
        }, hero);
      })
      .catch((err) => {
        console.warn('[useHomeHeroMotion] gsap unavailable; hero renders without motion.', err);
      });

    // The entrance starts as the loading screen's paper lifts (a short fixed
    // timer, see homeIntroTiming) and only if GSAP is already there.
    waitForHomeIntro()
      .then(() => {
        if (cancelled || !gsapReady || !shouldPlayEntrance(introRan, introElapsedMs())) return;
        return gsapLoaded.then(({ gsap }) => {
          if (cancelled) return;
          // Created empty, then filled, so a throw part-way is still revertable.
          const ctx = gsap.context(() => {}, hero);
          entranceCtx = ctx;
          ctx.add(() => {
            gsap.defaults({ ease: 'power3.out', duration: 0.6 });
            // Opacity is animated on decorative text only; the CTA row keeps
            // opacity 1 so it is visible and operable throughout.
            gsap.set('.hero-eyebrow, .hero-p', { autoAlpha: 0, y: 24 });
            gsap.set('.hero-actions', { y: 16 });

            const heroH1 = hero.querySelector<HTMLElement>('.hero-h1');
            if (heroH1) {
              splitIntoWords(heroH1);
              gsap.set(heroH1.querySelectorAll('.word-inner'), { y: '110%' });
            }
            gsap.set('.hero-visual', { clipPath: 'inset(0 100% 0 0)' });

            const words = hero.querySelectorAll('.hero-h1 .word-inner');
            if (words.length) {
              gsap
                .timeline({ defaults: { ease: 'power4.out' } })
                .to('.hero-visual', {
                  clipPath: 'inset(0 0% 0 0)',
                  duration: 0.8,
                  ease: 'power4.inOut',
                  // A finished inset(0) still clips to the element's own box, so
                  // the polaroid badge that hangs off its left edge came back
                  // cut. Drop the property once the wipe is done.
                  onComplete: () => gsap.set('.hero-visual', { clipPath: 'none' }),
                }, 0)
                .to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.1)
                .to(words, { y: '0%', duration: 0.6, stagger: 0.04 }, 0.1)
                .to('.hero-p', { autoAlpha: 1, y: 0, duration: 0.5 }, 0.3)
                .to('.hero-actions', { y: 0, duration: 0.45 }, 0.3);
            }

            /* The proof band renders static (numbers are already correct in
               the markup, see HomeHero), so there is nothing to animate. */
          });
        });
      })
      .catch((err) => {
        // Entrance failed part-way: put everything back to its visible state.
        console.warn('[useHomeHeroMotion] entrance failed; hero shows its final state.', err);
        entranceCtx?.revert();
      });

    return () => {
      cancelled = true;
      entranceCtx?.revert();
      parallaxCtx?.revert();
    };
  }, [heroRef]);
}
