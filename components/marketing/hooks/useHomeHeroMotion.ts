'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';
import { waitForHomeIntro } from './homeIntroGate';

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
 * Home hero: headline word-in entrance, background clip-path reveal, hero
 * image scroll parallax. Scoped to the hero
 * section ref — reverting on unmount only tears down this section's timeline
 * and ScrollTriggers. The entrance waits on the home loading screen (see
 * homeIntroGate): it plays as the overlay wipes away, not behind it. Under prefers-reduced-motion, or if gsap fails to load,
 * the hero renders with its normal (already visible) markup — nothing here
 * ever hides it via CSS ahead of time.
 */
export function useHomeHeroMotion(heroRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || prefersReducedMotion()) return;

    let cancelled = false;
    let ctx: GsapContext | undefined;

    Promise.all([loadGsap(), waitForHomeIntro()])
      .then(([{ gsap }]) => {
        if (cancelled) return;

        ctx = gsap.context(() => {
          gsap.defaults({ ease: 'power3.out', duration: 0.8 });
          gsap.set('.hero-eyebrow, .hero-p, .hero-actions', { autoAlpha: 0, y: 30 });

          const heroH1 = hero.querySelector<HTMLElement>('.hero-h1');
          if (heroH1) {
            splitIntoWords(heroH1);
            gsap.set(heroH1.querySelectorAll('.word-inner'), { y: '110%' });
          }
          gsap.set('.hero-visual', { clipPath: 'inset(0 100% 0 0)' });

          const words = hero.querySelectorAll('.hero-h1 .word-inner');
          if (words.length) {
            gsap
              .timeline({ delay: 0.12, defaults: { ease: 'power4.out' } })
              .to('.hero-visual', {
                clipPath: 'inset(0 0% 0 0)',
                duration: 1.1,
                ease: 'power4.inOut',
                // A finished inset(0) still clips to the element's own box, so
                // the polaroid badge that hangs off its left edge came back
                // cut. Drop the property once the wipe is done.
                onComplete: () => gsap.set('.hero-visual', { clipPath: 'none' }),
              }, 0)
              .to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' }, '-=0.4')
              .to(words, { y: '0%', duration: 0.88, stagger: 0.065 }, '-=0.35')
              .addLabel('afterHeadline')
              .to('.hero-p', { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.65')
              .to('.hero-actions', { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.5');
          }

          const heroImg = hero.querySelector('#hero-bg-video') || hero.querySelector('.hero-visual .hero-img');
          if (heroImg) {
            gsap.to(heroImg, {
              yPercent: 20,
              ease: 'none',
              scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.8 },
            });
          }

          /* The proof band renders static. Its figures used to count up from
             zero on a 1.9s stagger, which read as the digits scrambling, and
             the band itself used to fade and rise with the rest of the hero —
             both are gone: the numbers are already correct in the markup
             (HomeHero), so there is nothing to animate toward. */
        }, hero);
      })
      .catch((err) => {
        console.warn('[useHomeHeroMotion] gsap unavailable; hero renders without entrance animation.', err);
      });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [heroRef]);
}
