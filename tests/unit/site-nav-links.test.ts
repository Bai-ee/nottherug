/**
 * Coverage for components/SiteNav.tsx's nav_services wiring.
 *
 * SiteNav itself uses hooks (useState, useRef, usePathname) and this repo's
 * vitest environment is 'node' with no DOM/renderer, so — consistent with
 * every other test in this suite — it cannot be called directly the way
 * hookless leaf components are. NAV_LINKS is exported specifically so the
 * data-driven wiring (exactly one entry carries a cta id, and both the
 * desktop and mobile renders map the same array) is still verifiable: each
 * map() iteration attaches onClick straight from `link.cta` with no shared
 * handler or wrapper listener, so one click on one rendered anchor produces
 * exactly one track() call — see components/SiteNav.tsx for that wiring.
 */
import { describe, it, expect } from 'vitest';
import { NAV_LINKS } from '@/components/SiteNav';

describe('SiteNav NAV_LINKS wiring', () => {
  it('gives the Services entry, and only the Services entry, a cta id', () => {
    const withCta = NAV_LINKS.filter((link) => link.cta !== undefined);
    expect(withCta).toHaveLength(1);
    expect(withCta[0]).toMatchObject({ href: '/services', cta: 'nav_services' });
  });

  it('does not attach a stale reserved id to any nav entry', () => {
    const ctas = NAV_LINKS.map((link) => link.cta).filter(Boolean);
    expect(ctas).not.toContain('nav_phone');
  });
});
