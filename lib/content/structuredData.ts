import { absoluteUrl, GOOGLE_REVIEW_URL, INSTAGRAM_URL, OG_IMAGES, REVIEW_RATINGS, SITE_NAME, YELP_URL } from '@/lib/content/site';
import { ADDRESS_LINE_1, EMAIL_DISPLAY, PHONE_HREF } from '@/lib/content/contact';

/**
 * Schema.org JSON-LD for the marketing site. Every fact here is read from the
 * same constants the visible pages use (contact.ts, site.ts), so the markup
 * can never disagree with the footer or the reviews page. Only the Google
 * rating feeds aggregateRating: Google treats self-hosted ratings as
 * self-serving, so this is entity data, not a rich-result play.
 */

const BUSINESS_ID = absoluteUrl('/#business');
const ORG_ID = absoluteUrl('/#organization');
const SITE_ID = absoluteUrl('/#website');
const FOUNDER_ID = absoluteUrl('/#luis');
const LOGO_URL = absoluteUrl('/logos/notRugGreen.png');

// RESPONSE_HOURS in contact.ts is display copy ("Mon–Fri, 9 AM–7 PM · Sat–Sun,
// 10 AM–4 PM"); these are the same hours in schema form.
const OPENING_HOURS = [
  { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '19:00' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday'], opens: '10:00', closes: '16:00' },
];

const SAME_AS = [INSTAGRAM_URL, YELP_URL];

export function siteGraph(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['LocalBusiness', 'PetSitter'],
        '@id': BUSINESS_ID,
        name: SITE_NAME,
        url: absoluteUrl('/'),
        description:
          'Williamsburg dog walking, puppy visits, boarding and senior pet care since 2011. Small groups, GPS-tracked walks, and an update after every visit.',
        image: absoluteUrl(OG_IMAGES.home),
        logo: LOGO_URL,
        telephone: PHONE_HREF.replace('tel:', ''),
        email: EMAIL_DISPLAY,
        foundingDate: '2011',
        founder: { '@id': FOUNDER_ID },
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: ADDRESS_LINE_1.split(', Brooklyn')[0],
          addressLocality: 'Brooklyn',
          addressRegion: 'NY',
          postalCode: '11211',
          addressCountry: 'US',
        },
        areaServed: [{ '@type': 'Neighborhood', name: 'Williamsburg, Brooklyn' }],
        openingHoursSpecification: OPENING_HOURS,
        hasMap: GOOGLE_REVIEW_URL,
        sameAs: SAME_AS,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: REVIEW_RATINGS.google.rating,
          bestRating: '5',
          reviewCount: String(REVIEW_RATINGS.google.count),
        },
      },
      { '@type': 'Organization', '@id': ORG_ID, name: SITE_NAME, url: absoluteUrl('/'), logo: LOGO_URL, sameAs: SAME_AS },
      { '@type': 'WebSite', '@id': SITE_ID, url: absoluteUrl('/'), name: SITE_NAME, publisher: { '@id': ORG_ID }, inLanguage: 'en-US' },
      { '@type': 'Person', '@id': FOUNDER_ID, name: 'Luis', jobTitle: 'Founder', worksFor: { '@id': ORG_ID } },
    ],
  };
}

/** Home → page breadcrumb for an inner marketing page. */
export function breadcrumb(path: string, name: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name, item: absoluteUrl(path) },
    ],
  };
}

/** Serialised for a <script type="application/ld+json">; `<` is escaped so page HTML can never break out of the script. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
