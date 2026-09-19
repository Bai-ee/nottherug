'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';
import { waitForHomeIntro } from './homeIntroGate';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

const STAT_TARGETS = [5, 5, 79, 15];
const STAT_SUFFIXES = ['★', '★', '', '+'];

function splitIntoWords(el: HTMLElement) {
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
 * image scroll parallax, and the animated stat counters. Scoped to the hero
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
      .then(([{ gsap, ScrollTrigger }]) => {
        if (cancelled) return;

        ctx = gsap.context(() => {
          gsap.defaults({ ease: 'power3.out', duration: 0.8 });
          gsap.set('.hero-eyebrow, .hero-p, .hero-actions, .hero-stats', { autoAlpha: 0, y: 30 });

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
              .to('.hero-actions', { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.5')
              .to('.hero-stats', { autoAlpha: 1, y: 0, duration: 0.7 }, 'afterHeadline+=0.25');
          }

          const heroImg = hero.querySelector('#hero-bg-video') || hero.querySelector('.hero-visual .hero-img');
          if (heroImg) {
            gsap.to(heroImg, {
              yPercent: 20,
              ease: 'none',
              scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.8 },
            });
          }

          const statEls = hero.querySelectorAll('.hero-stat-num');
          if (statEls.length) {
            let statsAnimated = false;
            ScrollTrigger.create({
              trigger: '.hero-stats',
              start: 'top 90%',
              once: true,
              onEnter: () => {
                if (statsAnimated) return;
                statsAnimated = true;
                statEls.forEach((el, i) => {
                  const obj = { val: 0 };
                  gsap.to(obj, {
                    val: STAT_TARGETS[i],
                    duration: 1.9,
                    delay: 0.6 + i * 0.07,
                    ease: 'power2.out',
                    onUpdate() {
                      el.textContent = Math.round(obj.val) + STAT_SUFFIXES[i];
                    },
                  });
                });
              },
            });
          }
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
