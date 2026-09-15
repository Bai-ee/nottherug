// Human-authored map that turns raw line numbers into the section names the
// founder sees in COPY-REVIEW-TOOL.md. Ranges are inclusive and must stay in
// sync with the source files; anything outside a listed range lands in "Other"
// so nothing silently disappears from the inventory.
//
// Updated for the P2A route/component extraction (plans/002-production-readiness.md):
// app/page.tsx no longer exists — its nine virtual pages are now real routes
// composed from components/marketing/**. Most files now map to a single
// section; a few still carry more than one of the old sections and keep
// split ranges below.
//
// Entry shape: [startLine, endLine, sectionId, sectionTitle, sectionNote?]

export const SECTIONS = {
  'components/SiteNav.tsx': [
    [1, 999, 'nav-standalone', 'Navigation (all pages)', 'Shown on every marketing page — desktop links and the mobile menu both live here now.'],
  ],
  'components/marketing/SiteFooter.tsx': [
    [1, 999, 'footer', 'Footer', 'Appears on every page except /book and /contact.'],
  ],

  'components/marketing/HomeHero.tsx': [
    [1, 999, 'hero', 'Homepage hero', 'First thing a visitor reads.'],
  ],
  'components/marketing/ProofMarquee.tsx': [
    [1, 999, 'proof-marquee', 'Scrolling review strip', 'Each quote appears twice in the code so the strip can loop seamlessly. Editing one updates both.'],
  ],
  'components/marketing/HowItWorksStrip.tsx': [
    [1, 999, 'how-it-works-strip', 'How it works (homepage strip)', ''],
  ],
  'components/marketing/TrustBar.tsx': [
    [1, 999, 'trust-bar', 'Trust bar', 'Short credential chips. Very tight space.'],
  ],
  'components/marketing/ServicesPreview.tsx': [
    [1, 999, 'services-preview', 'Services preview + rates (homepage)', 'Prices here must match the Services page.'],
  ],
  'components/marketing/ClosingTrust.tsx': [
    [1, 999, 'closing-trust', 'Safety + Williamsburg recap', ''],
  ],
  'components/marketing/FeaturedReviews.tsx': [
    [1, 999, 'featured-reviews', 'Featured reviews', 'Real customer quotes — only edit if the quote is inaccurate or the customer asked.'],
  ],
  'components/marketing/HomePageContent.tsx': [
    [1, 999, 'booking-cta', 'Booking call-to-action (homepage form heading)', ''],
  ],

  'components/marketing/ServicesPageContent.tsx': [
    [1, 12, 'services-hero', 'Services page hero', ''],
    [13, 34, 'services-included', "What's always included", ''],
    [35, 65, 'services-hero', 'Services page hero', ''],
    [66, 97, 'services-forms', 'Services page booking form', 'Form labels and the fallback contact note (replaces the old fake "Book a Service" / "Ask a Question" tabs).'],
  ],
  'components/marketing/ServiceGrid.tsx': [
    [1, 999, 'services-grid', 'Services + pricing grid', 'Prices must match the homepage rates.'],
  ],

  'components/marketing/HowItWorksPageContent.tsx': [
    [1, 999, 'hiw-hero', 'How It Works page hero', ''],
  ],
  'components/marketing/ProcessSteps.tsx': [
    [1, 999, 'hiw-steps', 'How It Works steps', ''],
  ],
  'components/marketing/SampleWalkReportCard.tsx': [
    [1, 999, 'hiw-steps', 'How It Works steps + walk report', ''],
  ],

  'components/marketing/AboutPageContent.tsx': [
    [1, 999, 'about-hero', 'About page (hero + origin story + section headings)', ''],
  ],
  'components/marketing/TeamGrid.tsx': [
    [1, 43, 'about-team', 'Team bios', 'Fixed at the current number of people. Adding or removing a team member is a code change, not a copy change.'],
    [44, 999, 'about-team', 'Team section ("Join the team" card)', ''],
  ],
  'components/marketing/ValuesGrid.tsx': [
    [1, 999, 'about-how-we-work', 'How we work (values)', ''],
  ],

  'components/marketing/SafetyPageContent.tsx': [
    [1, 999, 'safety-hero', 'Safety page hero + certifications heading', ''],
  ],
  'components/marketing/TrustCards.tsx': [
    [1, 999, 'safety-standards', 'Safety standards', 'Insurance and certification claims — must be factually true.'],
  ],
  'components/marketing/CertificationStrip.tsx': [
    [1, 999, 'safety-certs', 'Certifications strip (shared: homepage + Safety page)', 'Must be factually true. Editing this updates both places it appears.'],
  ],
  'components/marketing/SafetyFaq.tsx': [
    [1, 15, 'safety-faq', 'Safety FAQ', 'Each question keeps its answer. Do not add new questions here.'],
    [16, 999, 'safety-faq', 'Safety FAQ (heading)', ''],
  ],

  'components/marketing/NeighborhoodsPageContent.tsx': [
    [1, 999, 'hoods-hero', 'Neighborhoods page hero', ''],
  ],
  'components/marketing/NeighborhoodCard.tsx': [
    [1, 999, 'hoods-card', 'Neighborhood card label', 'Used on the Neighborhoods page and (disabled) on the homepage teaser.'],
  ],
  'components/marketing/NeighborhoodDetail.tsx': [
    [1, 999, 'hoods-williamsburg', 'Williamsburg detail', 'Williamsburg is the only neighborhood page by design.'],
  ],
  'lib/content/coverage.ts': [
    [1, 999, 'hoods-williamsburg', 'Williamsburg page content', ''],
  ],

  'components/marketing/ReviewsPageContent.tsx': [
    [1, 999, 'reviews-hero', 'Reviews page hero', ''],
  ],
  'components/marketing/ReviewsMasonry.tsx': [
    [1, 999, 'reviews-list', 'Review cards', 'Real customer quotes — only edit if inaccurate.'],
  ],

  'app/(marketing)/book/page.tsx': [
    [1, 13, 'book-meta', '/book — search engine + link preview', 'Title shows in the browser tab and in Google results. Keep under ~60 characters.'],
    [14, 999, 'bookpage-hero', '/book — page content', ''],
  ],
  'app/(marketing)/contact/page.tsx': [
    [1, 13, 'contact-meta', '/contact — search engine + link preview', ''],
    [14, 999, 'contactpage-hero', '/contact — hero', ''],
  ],
  'components/marketing/ContactInfoCard.tsx': [
    [1, 999, 'contactpage-body', 'Contact details', 'Phone, email and hours — check these are current.'],
  ],

  // components/MeetGreetForm.tsx is now a re-export shim; the real form
  // moved to components/booking/** (Worker A, in progress concurrently with
  // this extraction). Only BookingForm.tsx's own JSX is mapped so far.
  'components/booking/BookingForm.tsx': [
    [1, 9999, 'form', 'Meet & Greet form', 'Field labels, helper text, buttons and confirmation messages.'],
  ],

  'lib/content/services.ts': [
    [1, 999, 'services-data', 'Service names, copy and prices (typed data)', 'Feeds both the homepage rates preview and the /services grid. The two use different names/copy for the same services on purpose — see the file comment.'],
  ],
  'lib/content/contact.ts': [
    [1, 999, 'contactpage-body', 'Contact details (typed data)', 'Phone, email, address and hours — feeds the /contact page.'],
  ],

  'app/(marketing)/page.tsx': [[1, 999, 'home-meta', 'Home — search engine + link preview', '']],
  'app/(marketing)/services/page.tsx': [[1, 999, 'services-meta', '/services — search engine + link preview', '']],
  'app/(marketing)/how-it-works/page.tsx': [[1, 999, 'hiw-meta', '/how-it-works — search engine + link preview', '']],
  'app/(marketing)/about/page.tsx': [[1, 999, 'about-meta', '/about — search engine + link preview', '']],
  'app/(marketing)/safety/page.tsx': [[1, 999, 'safety-meta', '/safety — search engine + link preview', '']],
  'app/(marketing)/neighborhoods/williamsburg/page.tsx': [[1, 999, 'hoods-meta', '/neighborhoods/williamsburg — search engine + link preview', '']],
  'app/(marketing)/reviews/page.tsx': [[1, 999, 'reviews-meta', '/reviews — search engine + link preview', '']],

  'app/layout.tsx': [
    [1, 120, 'site-meta', 'Site-wide search engine + link preview (root fallback)', 'Every page now sets its own title/description; this is only the fallback if one is ever missing.'],
  ],
};

// Pages in the order the founder should walk them.
export const PAGE_ORDER = [
  'global', 'home', 'services', 'how-it-works', 'about', 'safety',
  'neighborhoods', 'reviews', 'book', 'contact', 'MeetGreetForm', 'layout',
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
  MeetGreetForm: 'Meet & Greet form',
  layout: 'Search engine + social previews (site-wide fallback)',
};

// Text that is decoration, structure or a third-party name — never founder copy.
export const IGNORE_TEXT = new Set([
  'Login', '★★★★★', '★', '&ldquo;', '&rdquo;', '&nbsp;', '&middot;', '·', '—', '–',
  // Every marketing/*PageContent.tsx file's jsxRange starts exactly at its
  // component's own `return (` line (see extract-copy.mjs JSX_SOURCES
  // comment) — the scanner reads that literal text before it reaches the
  // first JSX tag, so it always shows up as one throwaway "text" run.
  'return (',
]);

export const IGNORE_PATTERNS = [
  /^[\s&;·•–—★☆|@#/\\+·.,:()[\]-]*$/,          // punctuation / symbol only
  /^&[a-z]+;$/,                                // lone HTML entity
  /^@[a-z0-9_]+$/i,                            // instagram handle only
  /^https?:\/\//,                              // raw URL
  /^0?\d$/,                                    // step numbers (1, 2, 01, 02) — structure, not copy
];

// Extra guidance attached to specific strings the founder is likely to question.
export const FIELD_NOTES = {};
