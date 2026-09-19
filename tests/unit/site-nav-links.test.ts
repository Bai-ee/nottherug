/**
 * Coverage for components/SiteNav.tsx's nav CTA wiring.
 *
 * SiteNav itself uses hooks (useState, useRef, usePathname) and this repo's
 * vitest environment is 'node' with no DOM/renderer, so — consistent with
 * every other test in this suite — it cannot be called directly the way
 * hookless leaf components are. NAV_LINKS is exported specifically so the
 * data-driven wiring (which entries carry a cta id, and that both the
 * desktop and mobile renders map the same array) is still verifiable: each
 * map() iteration reads onClick straight from `link.cta` with no shared
 * handler or wrapper listener, so one click on one rendered anchor produces
 * exactly one track() call — see components/SiteNav.tsx for that wiring.
 *
 * The two Book links are not in this array (they are written out once each,
 * with nav_book and mobile_menu_book) and so are not covered here.
 */
import { describe, it, expect } from 'vitest';
import { NAV_LINKS } from '@/components/SiteNav';
import { CTA_IDS } from '@/lib/analytics/events';

describe('SiteNav NAV_LINKS wiring', () => {
  it('gives a cta id to the service and contact entries, and to no others', () => {
    const withCta = NAV_LINKS.filter((link) => link.cta !== undefined);
    expect(withCta).toHaveLength(2);
    expect(withCta).toEqual([
      expect.objectContaining({ href: '/#home-personalized-care-section', cta: 'nav_services' }),
      expect.objectContaining({ href: '/#home-contact-sheet-section', cta: 'nav_contact' }),
    ]);
  });

  it('attaches only ids that exist in the locked analytics contract', () => {
    const ctas = NAV_LINKS.map((link) => link.cta).filter(Boolean);
    for (const cta of ctas) {
      expect(CTA_IDS).toContain(cta);
    }
    // Ids from the retired /services and /how-it-works pages, and a nav_phone
    // link that never shipped, must not come back.
    expect(ctas).not.toContain('nav_phone');
    expect(ctas).not.toContain('nav_how_it_works');
  });
});
