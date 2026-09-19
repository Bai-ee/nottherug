'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getSectionLinks } from '@/lib/navigation/sections';
import { scrollToSectionId } from '@/lib/navigation/scrollToSection';
import { useActiveSection } from './hooks/useActiveSection';

// Desktop-only left rail: one dot per registered section, plus a fill that
// tracks page scroll. Routes with no entry in the section-nav contract render
// nothing (getSectionLinks returns an empty array), so this can be mounted
// once for the whole marketing site. The mobile counterpart is SectionJump.
//
// The rail is hidden below 1200px in CSS rather than by a matchMedia branch
// here, so server and client markup always agree (no hydration mismatch) and
// a resize past the breakpoint costs nothing.
export default function SectionRail() {
  const pathname = usePathname();
  const links = getSectionLinks(pathname);
  const activeId = useActiveSection(links);
  const fillRef = useRef<HTMLDivElement | null>(null);

  // Scroll progress is written straight to the fill's transform instead of
  // through state: this runs on every scroll frame, and a re-render per frame
  // would drag the whole rail (and its markers) through React for one number.
  useEffect(() => {
    if (links.length === 0) return;
    const fill = fillRef.current;
    if (!fill) return;

    let frame = 0;
    const paint = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      fill.style.transform = `scaleY(${progress})`;
    };
    // Coalesce to one paint per frame — scroll events can outpace the
    // compositor on trackpads, and resize matters because scrollable height
    // (the denominator) changes with the viewport.
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    paint();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [links]);

  if (links.length === 0) return null;

  return (
    <nav id="section-rail-shell" aria-label="Page sections">
      <div id="section-rail-track">
        <div id="section-rail-fill" ref={fillRef} />
        <ul id="section-rail-marker-list">
          {links.map((link) => (
            <li key={link.id} className="section-rail-marker-item">
              <button
                type="button"
                id={`section-rail-marker-${link.id}`}
                className="section-rail-marker"
                // Only the current marker carries aria-current, so screen
                // readers announce one position rather than a state per dot.
                aria-current={link.id === activeId ? 'true' : undefined}
                aria-label={`Go to ${link.label}`}
                onClick={() => scrollToSectionId(link.id)}
              >
                <span className="section-rail-marker-dot" aria-hidden="true" />
                <span className="section-rail-marker-label" aria-hidden="true">
                  {link.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
