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
}

// Home page "rates preview" — two rows of three, no icon or badge.
export const HOME_SERVICE_PREVIEW_ROW_1: ServicePreviewItem[] = [
  { title: 'Solo Walk', copy: 'A private 60-minute walk.', price: '$60', priceUnit: 'per walk' },
  { title: 'Group Walk', copy: '45-minute walk with up to three dogs max.', price: '$33', priceUnit: 'per walk' },
  {
    title: 'Senior Dog Visits',
    copy: 'Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs.',
    price: '$35',
    priceUnit: '/visit',
  },
];

export const HOME_SERVICE_PREVIEW_ROW_2: ServicePreviewItem[] = [
  { title: 'Puppy Walk', copy: 'Designed for puppies still learning.', price: '$35', priceUnit: 'per walk' },
  {
    title: 'Boarding & Overnight Sitting',
    copy: "Loving overnight care in your dog's own home, where they can stick to their routine and sleep in familiar surroundings while you're away.",
    price: '$100',
    priceUnit: '/night',
  },
  {
    title: 'Cat Visits',
    copy: "Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We'll also water plants, bring in the mail, and keep an eye on your home while you're away.",
    price: '$35',
    priceUnit: '/visit',
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
