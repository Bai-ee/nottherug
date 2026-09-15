// Shared marketing-site constants. Values copied verbatim from the source
// JSX during the app/page.tsx extraction (see plans/002-production-readiness.md,
// P2A) — not corrected or reconciled here.

import type { Metadata } from 'next';

export const SITE_URL = process.env.PUBLIC_BASE_URL || 'https://nottherug.com';
export const SITE_NAME = 'Not The Rug';
export const OG_IMAGE_CONTACT = `${SITE_URL}/img/og_meta_img_contact.png`;

export const YELP_URL = 'https://www.yelp.com/biz/not-the-rug-brooklyn-8';
export const GOOGLE_REVIEW_URL = 'https://share.google/xbrJjkZt4eoHUOxBl';
export const INSTAGRAM_URL = 'https://www.instagram.com/nottherug/';
export const INSTAGRAM_HANDLE = '@nottherug';

// Carried over as-is from the source JSX (page-hero Instagram credit links).
// Not a real destination — flagged in the P2A report, fix belongs to P4/R18.
export const INSTAGRAM_PLACEHOLDER_URL = 'https://instagram.com/placeholder';

/**
 * Builds the per-page <title>/description/canonical/OG/Twitter metadata
 * shared shape used by every marketing route. Each route still supplies its
 * own title/description/path — this only removes the boilerplate, it does
 * not decide page content (see plans/002-production-readiness.md P2A item 1:
 * "Each page gets its own metadata export").
 */
export function buildPageMetadata({
  path,
  title,
  description,
  noIndex,
}: {
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [{ url: OG_IMAGE_CONTACT, width: 1200, height: 630, alt: description }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE_CONTACT],
    },
  };
}
