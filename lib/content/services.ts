// Service names, copy, and prices for the home page rates section. The copy
// here is the owner-approved service verbiage (2026-09-29) and is the source
// of truth: the featured card, the rate columns, the service detail modal
// (ServiceDetailDialog), the welcome modal and the footer's rate links all
// read from these entries. The home page shows only the name, headline price
// and `fineprint`; everything else lives in the detail modal.

export interface RateGroup {
  label: string;
  lines: readonly string[];
}

export interface ServicePreviewItem {
  title: string;
  /** The service's lead line, verbatim — the first fact in the detail modal. */
  copy: string;
  /** Headline price: the lowest standard rate. `rateLines`/`rateGroups` carry the full rates. */
  price: string;
  priceUnit: string;
  /**
   * Matching value from SERVICE_INTEREST_OPTIONS (lib/leads/contract.ts), for
   * the Book CTA's booking-form prefill.
   */
  serviceInterest?: string;
  /**
   * Title split into exactly two lines for the home rates row, where every
   * name is set on two lines so the prices below them share a baseline.
   */
  nameLines?: [string, string];
  /** One short line under the price on the home page. Must fit on one line. */
  fineprint?: string;
  /** Body paragraphs for the detail modal, in reading order. */
  details?: readonly string[];
  /** Full rate lines, verbatim, when one headline price is not the whole story. */
  rateLines?: readonly string[];
  /** Rates split by who they cover (Dog Walking: one dog / two dogs). */
  rateGroups?: readonly RateGroup[];
  /** Closing notes: discounts, sales tax. */
  notes?: readonly string[];
}

/** The headline package. Rendered as the featured rate card AND in the welcome modal. */
export const GROUP_WALK_PREVIEW: ServicePreviewItem = {
  title: 'Dog Walking',
  copy: '45-minute walks. Small groups of up to three dogs.',
  price: '$33',
  priceUnit: 'per walk',
  serviceInterest: 'Daily Group Walks',
  nameLines: ['Dog', 'Walking'],
  fineprint: '45 minutes, three dogs max',
  details: [
    'Experienced walkers who get to know your dog’s personality and pace. Each walk includes fresh water, treats, clean paws, and a photo and update so you know how it went. Feeding and medication can be arranged in advance.',
  ],
  rateGroups: [
    {
      label: 'One dog',
      lines: [
        '$33 per walk for 9 or more walks per month',
        '$35 per walk for 8 or fewer walks per month',
      ],
    },
    {
      label: 'Two dogs from the same household',
      lines: [
        '$48 per walk for 9 or more walks per month',
        '$50 per walk for 8 or fewer walks per month',
        'Rates cover both dogs walking together.',
      ],
    },
  ],
  notes: ['All rates are subject to applicable sales tax.'],
};

/**
 * Compact label for the same package, used where there is no room for the
 * copy line (the welcome modal). Keep the duration matching `copy` above.
 */
export const GROUP_WALK_SHORT_LABEL = '45-Minute Dog Walking';

/** Small print under the headline price wherever it appears alone. */
export const GROUP_WALK_PRICE_NOTE = '+ sales tax · 9+ walks a month';

/** Rates other than Dog Walking, shown as columns beside the featured card, in this order. */
export const HOME_OTHER_RATES: ServicePreviewItem[] = [
  {
    title: 'Boarding & Dog Sitting',
    copy: 'Familiar care while you’re away.',
    price: '$100',
    priceUnit: 'from, per day',
    serviceInterest: 'Boarding / Sitting',
    nameLines: ['Boarding &', 'Dog Sitting'],
    fineprint: 'Familiar care while you’re away',
    details: [
      'Available exclusively to our dog-walking clients, so your dog stays in the care of a team they already know. We’ll go over feeding, walks, sleeping arrangements, and any special needs beforehand to help keep their routine consistent and their stay comfortable.',
    ],
    rateLines: ['$100–110 per day'],
    notes: ['Discounts available for stays longer than seven days.', 'Plus applicable sales tax.'],
  },
  {
    title: 'Puppy Walks',
    copy: 'For puppies ages 2–6 months. One-on-one care for their first routines.',
    price: '$35',
    priceUnit: 'per walk',
    serviceInterest: 'Puppy Walks',
    nameLines: ['Puppy', 'Walks'],
    fineprint: 'For puppies ages 2–6 months',
    details: [
      'Potty breaks, play, and gentle encouragement while you’re away. Our solo walks support potty training, early social skills, and everyday routines through positive reinforcement.',
      'We’ll work with you to plan walks around your puppy’s age, needs, and your schedule. Multiple daily walks are available, with reduced rates for the second and third walks on the same day.',
      'As your puppy grows, we’ll adjust their schedule together and introduce small-group walks when they’re ready.',
    ],
    notes: ['Plus applicable sales tax.'],
  },
  {
    title: 'Senior & Special Needs Walks',
    copy: '20-minute walks. Gentle care at your dog’s pace.',
    price: '$25',
    priceUnit: 'per walk',
    serviceInterest: 'Senior Dog Care',
    nameLines: ['Senior &', 'Special Needs'],
    fineprint: '20 minutes, at your dog’s pace',
    details: [
      'For dogs who benefit from a shorter outing and a little extra attention. We make time for potty breaks and sniffing, with fresh water, treats, clean paws, and a photo and update after each walk. Feeding and medication can be arranged in advance.',
      'Choose a walk with a compatible dog friend or a solo walk for one-on-one care.',
    ],
    rateLines: ['$25 per walk with a dog friend', '$35 per walk for solo care'],
    notes: ['Plus applicable sales tax.'],
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
