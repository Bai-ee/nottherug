'use client';

import { usePathname } from 'next/navigation';
import { getSectionLinks } from '@/lib/navigation/sections';
import { scrollToSectionId } from '@/lib/navigation/scrollToSection';
import { useActiveSection } from './hooks/useActiveSection';

// Desktop-only left rail: one paw print per registered section, stepping up
// the gutter left-right-left like the home page's scroll paw trail (the same
// prints, at rail size: public/img/paw-rail-{left,right}.webp, cut from
// pawl.png / pawr.png). Each print is the button for its section. Routes with
// no entry in the section-nav contract render nothing (getSectionLinks returns
// an empty array), so this can be mounted once for the whole marketing site.
// The mobile counterpart is SectionJump.
//
// The rail is hidden below 1280px in CSS rather than by a matchMedia branch
// here, so server and client markup always agree (no hydration mismatch) and
// a resize past the breakpoint costs nothing.
const PAW_SRC = { left: '/img/paw-rail-left.webp', right: '/img/paw-rail-right.webp' } as const;

export default function SectionRail() {
  const pathname = usePathname();
  const links = getSectionLinks(pathname);
  const activeId = useActiveSection(links);
  const activeIndex = links.findIndex((link) => link.id === activeId);

  if (links.length === 0) return null;

  return (
    <nav id="section-rail-shell" aria-label="Page sections">
      <ul id="section-rail-marker-list">
        {links.map((link, i) => (
          <li key={link.id} className="section-rail-marker-item">
            <button
              type="button"
              id={`section-rail-marker-${link.id}`}
              className="section-rail-marker"
              data-foot={i % 2 === 0 ? 'left' : 'right'}
              // Sections above the current one read as prints already made.
              data-passed={activeIndex > -1 && i < activeIndex ? 'true' : undefined}
              // Only the current marker carries aria-current, so screen
              // readers announce one position rather than a state per print.
              aria-current={link.id === activeId ? 'true' : undefined}
              aria-label={`Go to ${link.label}`}
              onClick={() => scrollToSectionId(link.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 2KB decorative print at a fixed CSS size; next/image adds runtime for nothing here */}
              <img
                className="section-rail-marker-paw"
                src={i % 2 === 0 ? PAW_SRC.left : PAW_SRC.right}
                alt=""
                width={48}
                height={51}
                aria-hidden="true"
                decoding="async"
              />
              <span className="section-rail-marker-label" aria-hidden="true">
                {link.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
