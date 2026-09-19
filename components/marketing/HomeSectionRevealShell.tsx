'use client';

import { useRef } from 'react';
import { useSectionReveals } from './hooks/useSectionReveals';
import { useScrollToTopOnLoad } from './hooks/useScrollToTopOnLoad';

/**
 * The home page's one client boundary for scroll/reveal orchestration.
 * HomePageContent (a Server Component) renders the page's sections — some of
 * them Server Components themselves, some already client leaves like
 * HomeHero — and passes the whole tree in here as `children`. That keeps this
 * file's own module graph to just itself plus the two hooks: nothing it
 * receives as children is pulled into its client bundle by being rendered
 * here (see the Next.js docs on interleaving Server and Client Components —
 * children passed to a Client Component are rendered ahead of time on the
 * server, not imported into the client's graph).
 *
 * Renders the same `#page-home` div HomePageContent used to render directly,
 * with the same ref target, so useSectionReveals' querySelectorAll scope and
 * globals.css's `#page-home.active` / `#page-home .foo` selectors are
 * unchanged.
 */
export default function HomeSectionRevealShell({ children }: { children: React.ReactNode }) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  // Home always opens at the top — no restored offset mid-page while the
  // reveals replay from the start.
  useScrollToTopOnLoad();
  useSectionReveals(pageRef);

  return (
    <div id="page-home" className="page active" ref={pageRef}>
      {children}
    </div>
  );
}
