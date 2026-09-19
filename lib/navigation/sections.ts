/**
 * Section-nav contract: the canonical in-page destination list per marketing
 * route. Consumed by the desktop left rail (SectionRail) and the mobile jump
 * button (SectionJump) so both entry points agree on order and labels.
 *
 * Ids must match a real element id on that route. A route with no entry (or
 * fewer than MIN_SECTIONS entries) renders no section nav at all.
 */

export type SectionLink = {
  /** DOM id of the scroll target on that route. */
  id: string;
  /** Short label — shown in the rail on hover/active and in the mobile sheet. */
  label: string;
};

/** Below this many destinations a section nav is noise, so we skip it. */
export const MIN_SECTIONS = 3;

export const SECTION_NAV: Record<string, SectionLink[]> = {
  '/': [
    { id: 'home-hero-section', label: 'Top' },
    { id: 'home-how-it-works-section', label: 'How It Works' },
    { id: 'home-personalized-care-section', label: 'Rates' },
    { id: 'home-closing-trust-section', label: 'Why Us' },
    { id: 'home-featured-reviews-section', label: 'Reviews' },
    { id: 'home-contact-sheet-section', label: 'Meet & Greet' },
    { id: 'main-footer', label: 'Contact' },
  ],
  '/services': [
    { id: 'services-hero-section', label: 'Top' },
    { id: 'services-rates-section', label: 'Rates' },
    { id: 'services-included-section', label: 'Included' },
    { id: 'services-signup-section', label: 'Meet & Greet' },
    { id: 'main-footer', label: 'Contact' },
  ],
  '/about': [
    { id: 'about-hero-section', label: 'Top' },
    { id: 'about-story-section', label: 'Our Story' },
    { id: 'about-team-section', label: 'Team' },
    { id: 'about-principles-section', label: 'Principles' },
    { id: 'main-footer', label: 'Contact' },
  ],
  '/neighborhoods/williamsburg': [
    { id: 'neighborhoods-williamsburg-hero-section', label: 'Top' },
    { id: 'neighborhoods-williamsburg-coverage-section', label: 'Coverage' },
    { id: 'neighborhoods-williamsburg-detail-section', label: 'Williamsburg' },
    { id: 'main-footer', label: 'Contact' },
  ],
  '/safety': [
    { id: 'safety-hero-section', label: 'Top' },
    { id: 'safety-standards-section', label: 'Standards' },
    { id: 'safety-credentials-section', label: 'Credentials' },
    { id: 'safety-faq-section', label: 'FAQ' },
    { id: 'main-footer', label: 'Contact' },
  ],
  '/reviews': [
    { id: 'reviews-hero-section', label: 'Top' },
    { id: 'reviews-wall-section', label: 'Reviews' },
    { id: 'reviews-leave-review-section', label: 'Review Us' },
    { id: 'main-footer', label: 'Contact' },
  ],
  // /how-it-works is intentionally absent: its body is a single two-column
  // grid (process steps beside a sticky sample report), so splitting it into
  // sibling sections would break that layout rather than add destinations.
};

const NO_SECTIONS: SectionLink[] = [];

/** Stable array identity per route, so consumers can use it as an effect dep. */
export function getSectionLinks(pathname: string): SectionLink[] {
  const links = SECTION_NAV[pathname];
  return links && links.length >= MIN_SECTIONS ? links : NO_SECTIONS;
}
