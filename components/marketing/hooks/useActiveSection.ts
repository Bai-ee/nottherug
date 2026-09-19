'use client';

import { useEffect, useState } from 'react';
import type { SectionLink } from '@/lib/navigation/sections';

/**
 * Tracks which registered section currently owns the viewport, for the
 * desktop rail and the mobile jump sheet. A section becomes current only once
 * it clearly occupies the viewport's center band, so short strips between two
 * tall sections don't flicker the active state.
 *
 * At the very bottom of the page the center band can sit past the last
 * section, so the final entry is forced current there (the footer otherwise
 * never lights up).
 */
export function useActiveSection(links: SectionLink[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (links.length === 0) return;
    const elements = links
      .map((link) => document.getElementById(link.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    elements.forEach((el) => observer.observe(el));

    const atBottom = () => {
      const remaining =
        document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (remaining <= 8) setActiveId(links[links.length - 1].id);
    };
    window.addEventListener('scroll', atBottom, { passive: true });
    atBottom();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', atBottom);
    };
  }, [links]);

  return activeId;
}
