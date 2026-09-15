// Human-authored map that turns raw line numbers into the section names the
// founder sees in COPY-REVIEW-TOOL.md. Ranges are inclusive and must stay in
// sync with the source files; anything outside a listed range lands in "Other"
// so nothing silently disappears from the inventory.
//
// Entry shape: [startLine, endLine, sectionId, sectionTitle, sectionNote?]

export const SECTIONS = {
  'app/page.tsx': [
    [691, 705, 'brand-badge', 'Floating brand badge', 'Not visible text — the description screen readers and Google read for the logo badge.'],
    [656, 677, 'nav-desktop', 'Desktop navigation', 'Shown on every page. Keep labels short — long labels wrap badly.'],
    [678, 690, 'nav-mobile', 'Mobile menu', 'Same links as desktop plus Contact.'],

    [706, 753, 'hero', 'Homepage hero', 'First thing a visitor reads.'],
    [754, 775, 'proof-marquee', 'Scrolling review strip', 'Each quote appears twice in the code so the strip can loop seamlessly. Editing one updates both.'],
    [776, 829, 'how-it-works-strip', 'How it works (homepage strip)', ''],
    [830, 856, 'trust-bar', 'Trust bar', 'Short credential chips. Very tight space.'],
    [857, 942, 'services-preview', 'Services preview + rates', 'Prices here must match the Services page.'],
    [943, 1010, 'closing-trust', 'Safety + Williamsburg recap', ''],
    [1011, 1080, 'featured-reviews', 'Featured reviews', 'Real customer quotes — only edit if the quote is inaccurate or the customer asked.'],
    [1081, 1125, 'other-services', 'Other services', ''],
    [1126, 1144, 'booking-cta', 'Booking call-to-action', ''],
    [1145, 1172, 'weekday-benefits', 'Regular client benefits', ''],
    [1173, 1204, 'visit-includes', 'What every visit includes', ''],
    [1205, 1220, 'founder-quote', 'Founder quote', 'Luis speaking in first person.'],
    [1221, 1238, 'service-areas', 'Service areas', ''],

    [1241, 1250, 'services-hero', 'Services page hero', ''],
    [1251, 1316, 'services-grid', 'Services + pricing grid', 'Prices must match the homepage rates.'],
    [1317, 1348, 'services-included', "What's always included", ''],
    [1349, 1443, 'services-forms', 'Services page booking forms', 'Form labels and button text.'],

    [1447, 1456, 'hiw-hero', 'How It Works page hero', ''],
    [1457, 1544, 'hiw-steps', 'How It Works steps + walk report', ''],

    [1548, 1557, 'about-hero', 'About page hero', ''],
    [1558, 1589, 'about-origin', 'Origin story', ''],
    [1590, 1656, 'about-team', 'Team bios', 'Fixed at the current number of people. Adding or removing a team member is a code change, not a copy change.'],
    [1657, 1689, 'about-how-we-work', 'How we work', ''],

    [1693, 1702, 'safety-hero', 'Safety page hero', ''],
    [1703, 1742, 'safety-standards', 'Safety standards', 'Insurance and certification claims — must be factually true.'],
    [1743, 1766, 'safety-certs', 'Certifications strip', 'Must be factually true.'],
    [1767, 1798, 'safety-faq', 'Safety FAQ', 'Each question keeps its answer. Do not add new questions here.'],

    [1802, 1811, 'hoods-hero', 'Neighborhoods page hero', ''],
    [1812, 1832, 'hoods-williamsburg', 'Williamsburg', 'Williamsburg is the only neighborhood page by design.'],

    [1835, 1861, 'reviews-hero', 'Reviews page hero', ''],
    [1862, 1914, 'reviews-list', 'Review cards', 'Real customer quotes — only edit if inaccurate.'],

    [1918, 1927, 'bookpage-hero', 'Book page hero (in-site)', ''],
    [1928, 2028, 'bookpage-forms', 'Book page forms (in-site)', ''],
    [2029, 2069, 'bookpage-roadmap', 'Website roadmap', 'Public-facing roadmap. Check the phase timings are still true.'],

    [2073, 2082, 'contactpage-hero', 'Contact page hero (in-site)', ''],
    [2083, 2166, 'contactpage-body', 'Contact details', 'Phone, email and hours — check these are current.'],

    [2168, 2234, 'footer', 'Footer', 'Appears on every page.'],

    [551, 561, 'hoods-data', 'Williamsburg page content', ''],
  ],

  'components/AnimatedServiceCards.tsx': [
    [217, 270, 'service-cards', 'Service cards (names, descriptions, prices)', 'Fixed at six cards. Prices must match the Services page.'],
  ],

  'components/SiteNav.tsx': [
    [1, 999, 'nav-standalone', 'Navigation on /book and /contact', 'Must match the main navigation labels exactly.'],
  ],

  'components/MeetGreetForm.tsx': [
    [1, 9999, 'form', 'Meet & Greet form', 'Field labels, helper text, buttons and confirmation messages.'],
  ],

  'app/book/page.tsx': [
    [1, 40, 'book-meta', '/book — search engine + link preview', 'Title shows in the browser tab and in Google results. Keep under ~60 characters.'],
    [41, 999, 'book-page', '/book — page content', ''],
  ],

  'app/contact/page.tsx': [
    [1, 45, 'contact-meta', '/contact — search engine + link preview', ''],
    [46, 999, 'contact-page', '/contact — page content', ''],
  ],

  'app/layout.tsx': [
    [1, 120, 'site-meta', 'Site-wide search engine + link preview', 'This is the homepage title in Google and the preview text when someone shares the link. Keep the title under ~60 characters and the description under ~155.'],
  ],
};

// Pages in the order the founder should walk them.
export const PAGE_ORDER = [
  'global', 'home', 'services', 'how-it-works', 'about', 'safety',
  'neighborhoods', 'reviews', 'book', 'contact',
  'AnimatedServiceCards', 'SiteNav', 'MeetGreetForm', 'page', 'layout',
];

export const PAGE_TITLES = {
  global: 'Site-wide (navigation + footer)',
  home: 'Home',
  services: 'Services & Rates',
  'how-it-works': 'How It Works',
  about: 'About Us',
  safety: 'Safety & Trust',
  neighborhoods: 'Williamsburg',
  reviews: 'Reviews',
  book: 'Book a Walk',
  contact: 'Contact',
  AnimatedServiceCards: 'Service cards',
  SiteNav: 'Navigation (standalone pages)',
  MeetGreetForm: 'Meet & Greet form',
  page: 'Standalone pages',
  layout: 'Search engine + social previews',
};

// Text that is decoration, structure or a third-party name — never founder copy.
export const IGNORE_TEXT = new Set([
  'Login', '★★★★★', '★', '&ldquo;', '&rdquo;', '&nbsp;', '&middot;', '·', '—', '–',
]);

export const IGNORE_PATTERNS = [
  /^[\s&;·•–—★☆|@#/\\+·.,:()\[\]-]*$/,       // punctuation / symbol only
  /^&[a-z]+;$/,                                // lone HTML entity
  /^@[a-z0-9_]+$/i,                            // instagram handle only
  /^https?:\/\//,                              // raw URL
  /^0?\d$/,                                    // step numbers (1, 2, 01, 02) — structure, not copy
];

// Extra guidance attached to specific strings the founder is likely to question.
export const FIELD_NOTES = {};
