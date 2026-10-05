'use client';

import { useEffect } from 'react';

/**
 * Pins the page at the top for as long as the page that calls this is mounted.
 *
 * Browsers restore the previous scroll offset on reload — and again when a
 * page comes back out of the bfcache — which drops the visitor mid-page while
 * the section reveals replay from the top, reading as the page re-animating
 * under them. Scroll restoration is switched to `manual` here and the window
 * is forced back to 0.
 *
 * A fresh navigation is left alone (nothing to undo). A URL hash wins: a deep link to a section still lands on that section.
 */
/** Only the first mount in a document can follow a browser scroll restoration. */
let firstMountOfDocument = true;

export function useScrollToTopOnLoad() {
  useEffect(() => {
    const isFirstMount = firstMountOfDocument;
    firstMountOfDocument = false;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const toTop = () => {
      if (window.location.hash) return;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    };

    // A hash from an earlier in-page jump (nav "Let's Get Started", the
    // section rail) survives a reload or a back/forward return, and the
    // browser would honour it and open the page at that section. Only a fresh
    // navigation to a hash link is a deliberate request for that section.
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (window.location.hash && navEntry && navEntry.type !== 'navigate') {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }

    // A fresh navigation (link, typed URL) has nothing restored to undo, and
    // forcing the top here would also yank away a scroll the visitor made
    // before hydration finished. Reload and back/forward still pin to the top.
    if (!(isFirstMount && navEntry?.type === 'navigate')) toTop();

    // Safari/Firefox restore a bfcache entry's offset at `pageshow`, after
    // mount — the effect above has already run by then, so re-pin there too.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) toTop();
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);
}
