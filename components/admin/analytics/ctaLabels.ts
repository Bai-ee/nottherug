import { LIVE_CTA_IDS, type CtaId } from '@/lib/analytics/events';

/**
 * Owner-facing label for every live CTA id — the business owner reads this
 * dashboard weekly and is non-technical, so a raw id like "hero_view_services"
 * is meaningless to him.
 *
 * Typed as Record<CtaId, string> (not Partial) so adding an id to CTA_IDS in
 * lib/analytics/events.ts without adding its label here is a TypeScript
 * compile error, not a silently blank/raw-id row on the dashboard.
 */
export const CTA_LABELS: Record<CtaId, string> = {
  // Booking entry points.
  nav_book: 'Top nav: Book',
  mobile_menu_book: 'Mobile menu: Book',
  closing_trust_book: 'Homepage closing section: Book',
  neighborhood_detail_book: 'Williamsburg page: Book',
  footer_book: 'Footer: Book',
  group_walk_card_submit: 'Homepage group walk card: Get started',
  welcome_modal_schedule: 'Welcome modal: Pick a time',
  welcome_modal_details: 'Welcome modal: Answer questions first',

  // Contact intent — a click toward talking to Luis, not an email or call.
  nav_contact: 'Top nav: Get started',
  footer_contact: 'Footer: Contact',
  hero_contact: 'Homepage hero: Contact Luis',
  neighborhood_detail_contact: 'Williamsburg page: Ask about coverage',

  // tel: links.
  contact_phone: 'Contact page: Phone tap',

  // mailto: links.
  contact_email: 'Contact page: Email tap',

  // Service discovery — measures interest in what is offered, before booking.
  hero_view_services: 'Homepage hero: View services',
  nav_services: 'Top nav: What we do',
  footer_services: 'Footer: Rates links',
};

/**
 * Groups the CTA table by what the click MEANS — the owner's question is
 * "which path brings people in," not "which button ranks highest." Fixed
 * display order, unrelated to click volume.
 */
export const CTA_CATEGORY_ORDER = ['Booking', 'Contact', 'Phone', 'Email', 'Service discovery'] as const;
export type CtaCategory = (typeof CTA_CATEGORY_ORDER)[number];

/**
 * Assigns every CtaId to exactly one category via an exhaustive switch (not a
 * suffix guess) — the `never` default makes it a compile error to add an id
 * to CTA_IDS without also deciding which group it belongs in.
 */
function categorize(id: CtaId): CtaCategory {
  switch (id) {
    case 'nav_book':
    case 'mobile_menu_book':
    case 'closing_trust_book':
    case 'neighborhood_detail_book':
    case 'footer_book':
    case 'group_walk_card_submit':
    case 'welcome_modal_schedule':
    case 'welcome_modal_details':
      return 'Booking';

    case 'nav_contact':
    case 'footer_contact':
    case 'hero_contact':
    case 'neighborhood_detail_contact':
      return 'Contact';

    case 'contact_phone':
      return 'Phone';

    case 'contact_email':
      return 'Email';

    case 'hero_view_services':
    case 'nav_services':
    case 'footer_services':
      return 'Service discovery';

    default: {
      const exhaustiveCheck: never = id;
      throw new Error(`No CTA category assigned for id: ${exhaustiveCheck}`);
    }
  }
}

/** LIVE_CTA_IDS, partitioned into the display groups above, in category order. */
export function groupLiveCtaIds(): Record<CtaCategory, CtaId[]> {
  const groups = Object.fromEntries(CTA_CATEGORY_ORDER.map((category) => [category, [] as CtaId[]])) as Record<
    CtaCategory,
    CtaId[]
  >;
  for (const id of LIVE_CTA_IDS) {
    groups[categorize(id)].push(id);
  }
  return groups;
}
