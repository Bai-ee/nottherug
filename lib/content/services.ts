// Service names, copy, and prices — copied verbatim from app/page.tsx during
// the P2A route extraction. The home preview and the /services catalog used
// different names/copy for overlapping services in the source (e.g. "Solo
// Walk" vs "Solo Visit"); that inconsistency is preserved here rather than
// unified, per the "do not correct copy" constraint. Flag for P4 owner review.

export type PriceUnit = 'per walk' | '/visit' | '/night';

export interface ServicePreviewItem {
  title: string;
  copy: string;
  price: string;
  priceUnit: PriceUnit;
  /**
   * Matching value from SERVICE_INTEREST_OPTIONS (lib/leads/contract.ts), for
   * the Book CTA's booking-form prefill. Card titles don't line up 1:1 with
   * that list (see file header), so this is set explicitly per card; omitted
   * where nothing matches (e.g. Cat Visits) and the CTA falls back to "Not
   * sure yet".
   */
  serviceInterest?: string;
  /**
   * Title split into exactly two lines for the home rates row, where every
   * name is set on two lines so the prices below them share a baseline.
   * Wrapping cannot guarantee that (names range from "Cat Visits" to
   * "Boarding & Overnight Sitting"), so the break is authored here.
   */
  nameLines?: [string, string];
  /**
   * One-line summary for that same row, kept to a similar length across
   * services. `copy` stays the full description used elsewhere.
   */
  fineprint?: string;
}

// Home page "rates preview" — two rows of three, no icon or badge.
/** The headline package. Rendered in the rates row AND in the welcome modal. */
export const GROUP_WALK_PREVIEW: ServicePreviewItem = {
  title: 'Group Walk',
  copy: '45-minute walk with up to three dogs max.',
  price: '$33',
  priceUnit: 'per walk',
  serviceInterest: 'Daily Group Walks',
  nameLines: ['Group', 'Walk'],
  fineprint: '45 minutes, three dogs max',
};

/**
 * Compact label for the same package, used where there is no room for the
 * copy line (the welcome modal). Keep the duration matching `copy` above.
 */
export const GROUP_WALK_SHORT_LABEL = '45 Min Group Rate';

/**
 * First-walk promotion on the headline package. It lives here rather than in
 * the card that renders it because two surfaces advertise it — the featured
 * rate card on the home page (GroupWalkFeatureCard) and the welcome modal's
 * package line — and they had already drifted: the card offered 20% off
 * while the modal quoted the undiscounted rate.
 */
export const FIRST_WALK_DISCOUNT = 0.2;

/** `$33` as a number, for the discount maths. */
export const GROUP_WALK_FULL_PRICE = Number(GROUP_WALK_PREVIEW.price.replace(/[^0-9.]/g, ''));

/** What the first walk actually costs, rounded to the dollar. */
export const GROUP_WALK_FIRST_WALK_PRICE = Math.round(
  GROUP_WALK_FULL_PRICE * (1 - FIRST_WALK_DISCOUNT),
);

export const FIRST_WALK_PROMO_LINE = '20% off your first walk';
export const FIRST_WALK_PROMO_BADGE = `-${Math.round(FIRST_WALK_DISCOUNT * 100)}%`;
export const FIRST_WALK_TAX_NOTE = '+ sales tax · first walk only';

export const HOME_SERVICE_PREVIEW_ROW_1: ServicePreviewItem[] = [
  {
    title: 'Solo Walk',
    copy: 'A private 60-minute walk.',
    price: '$60',
    priceUnit: 'per walk',
    serviceInterest: 'Solo Visits',
    nameLines: ['Solo', 'Walk'],
    fineprint: '60 minutes, one-on-one',
  },
  GROUP_WALK_PREVIEW,
  {
    title: 'Senior Dog Visits',
    copy: 'Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs.',
    price: '$35',
    priceUnit: '/visit',
    serviceInterest: 'Senior Dog Care',
    nameLines: ['Senior Dog', 'Visits'],
    fineprint: '20+ minutes, gentle pace',
  },
];

export const HOME_SERVICE_PREVIEW_ROW_2: ServicePreviewItem[] = [
  {
    title: 'Puppy Walk',
    copy: 'Designed for puppies still learning.',
    price: '$35',
    priceUnit: 'per walk',
    serviceInterest: 'Puppy Visits',
    nameLines: ['Puppy', 'Walk'],
    fineprint: 'Short walks, still learning',
  },
  {
    title: 'Boarding & Overnight Sitting',
    copy: "Loving overnight care in your dog's own home, where they can stick to their routine and sleep in familiar surroundings while you're away.",
    price: '$100',
    priceUnit: '/night',
    serviceInterest: 'Boarding / Sitting',
    nameLines: ['Boarding &', 'Sitting'],
    fineprint: 'Overnight care, their home',
  },
  {
    title: 'Cat Visits',
    copy: "Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We'll also water plants, bring in the mail, and keep an eye on your home while you're away.",
    price: '$35',
    priceUnit: '/visit',
    nameLines: ['Cat', 'Visits'],
    fineprint: 'Food, litter, playtime',
  },
];

/** Icon keys map to the inline SVGs in components/marketing/ServicesPreview.tsx. */
export type IncludedIcon = 'gps' | 'photo' | 'leash' | 'chat';

/**
 * Included with every walk, shown under the home rates row. `image` is the
 * preview shown centred on the page while a callout is hovered or tapped —
 * left empty until the artwork exists; a placeholder renders in its absence.
 */
export const ALWAYS_INCLUDED: Array<{
  title: string;
  copy: string;
  icon: IncludedIcon;
  image?: string;
}> = [
  {
    icon: 'gps',
    title: 'GPS Tracking',
    copy: 'Live route map sent after every walk so you see exactly where they went.',
  },
  {
    icon: 'photo',
    title: 'Photo Report',
    copy: 'Post-walk update with photos, mood notes, and any observations.',
  },
  {
    icon: 'leash',
    title: 'Double-Leash Safety',
    copy: 'Our signature dual collar-and-harness method on every walk.',
  },
  {
    icon: 'chat',
    title: 'Direct Communication',
    copy: 'Text or call your walker directly — no support tickets, no bots.',
  },
];

export interface ServiceCatalogItem extends ServicePreviewItem {
  icon: string;
  badge?: string;
}

// /services page grid — six cards with icon art and an optional badge.
export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    title: 'Small Group Visit',
    copy: '45-minute visit with up to three dogs max. GPS tracked, personalized report card included, and paws cleaned before returning home.',
    price: '$33',
    priceUnit: '/visit',
    icon: '/img/icons/service-small-group.svg',
    badge: 'Most Popular',
  },
  {
    title: 'Solo Visit',
    copy: 'A private 60-minute visit for nervous, anxious, or reactive dogs, or pups who simply do better with one-on-one attention. Built around patience, consistency, and positive reinforcement.',
    price: '$60',
    priceUnit: '/visit',
    icon: '/img/icons/service-solo.svg',
    badge: 'Premium',
  },
  {
    title: 'Puppy Visits',
    copy: 'Designed for puppies still learning the ropes. Visits focus on potty breaks, enrichment, socialization, and positive reinforcement. Discounts available for multiple daily visits.',
    price: '$35',
    priceUnit: '/visit',
    icon: '/img/icons/service-puppy.svg',
  },
  {
    title: 'Senior Dog Visits',
    copy: 'Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs. We move at their pace, with patience, comfort, and plenty of care.',
    price: '$35',
    priceUnit: '/visit',
    icon: '/img/icons/service-senior.svg',
  },
  {
    title: 'Boarding & Overnight Sitting',
    copy: "Loving overnight care in your dog's own home, where they can stick to their routine and sleep in familiar surroundings while you're away.",
    price: '$100',
    priceUnit: '/night',
    icon: '/img/icons/service-boarding.svg',
    badge: '7+ day discounts',
  },
  {
    title: 'Cat Visits',
    copy: "Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We'll also water plants, bring in the mail, and keep an eye on your home while you're away.",
    price: '$35',
    priceUnit: '/visit',
    icon: '/img/icons/service-cat.svg',
  },
];
