'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, type GsapBundle } from './gsapLoader';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

/**
 * Adds a drop shadow + `.nav-scrolled` once the page scrolls past the top of
 * the viewport, and removes it on scroll back up. Scoped to the nav element
 * itself; does not depend on prefers-reduced-motion since it is a state
 * change, not a motion effect, and it degrades to "no shadow" if gsap fails.
 */
export function useNavScrollShadow(navRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    let cancelled = false;
    let ctx: GsapContext | undefined;

    loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;
        ctx = gsap.context(() => {
          ScrollTrigger.create({
            trigger: document.body,
            start: 'top+=60 top',
            onEnter: () => {
              gsap.to(nav, { boxShadow: '0 2px 32px rgba(0,0,0,0.09)', duration: 0.3 });
              nav.classList.add('nav-scrolled');
            },
            onLeaveBack: () => {
              gsap.to(nav, { boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.3 });
              nav.classList.remove('nav-scrolled');
            },
          });
        }, nav);
      })
      .catch((err) => {
        console.warn('[useNavScrollShadow] gsap unavailable; nav renders without scroll shadow.', err);
      });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [navRef]);
}
