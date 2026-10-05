// Shared marketing-site constants. Values copied verbatim from the source
// JSX during the app/page.tsx extraction (see plans/002-production-readiness.md,
// P2A) — not corrected or reconciled here.

import type { Metadata } from 'next';

/** Host used when PUBLIC_BASE_URL is unset or unusable. The owner chose nottherug.com as the canonical domain (2026-10-05). */
export const DEFAULT_SITE_URL = 'https://nottherug.com';

/**
 * The ONE place the configured public base URL is cleaned up. Trims
 * whitespace, requires an http(s) URL, and reduces it to its origin, so a
 * trailing slash, a path, a query or credentials can never leak into a built
 * URL. Throws a clear error for anything else; callers that must not fail
 * (SITE_URL, email links) catch it and fall back, see resolvePublicBaseUrl.
 */
export function normalizePublicBaseUrl(raw: string): string {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`PUBLIC_BASE_URL is not a valid URL: ${JSON.stringify(raw)}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`PUBLIC_BASE_URL must start with http:// or https://, got ${JSON.stringify(raw)}`);
  }
  return url.origin;
}

/**
 * Safe-fallback wrapper: an unset/blank value uses `fallback` silently (the
 * pre-existing behavior); a set-but-invalid value also uses `fallback` and logs
 * the reason once, rather than taking the whole site down over a bad env var.
 */
export function resolvePublicBaseUrl(raw: string | undefined, fallback: string = DEFAULT_SITE_URL): string {
  if (!raw || !raw.trim()) return fallback;
  try {
    return normalizePublicBaseUrl(raw);
  } catch (err) {
    console.warn(`${(err as Error).message}; using ${fallback}`);
    return fallback;
  }
}

/** Origin only (no trailing slash). Every absolute URL is built from this. */
export const SITE_URL = resolvePublicBaseUrl(process.env.PUBLIC_BASE_URL);

/** Absolute URL for a site path, using URL semantics (never string concatenation). */
export function absoluteUrl(path: string, base: string = SITE_URL): string {
  return new URL(path, `${base}/`).href;
}
export const SITE_NAME = 'Not The Rug';
// Link-preview images, one per page type. Relative paths: Next resolves them
// against `metadataBase`, so a trailing slash on PUBLIC_BASE_URL can't produce
// a `//img/...` URL (which 308-redirects and some preview bots won't follow).
export const OG_IMAGES = {
  default: '/img/og_meta_img_contact.png',
  home: '/img/og_meta_mainpage.png',
  book: '/img/og_meta_book.png',
  join: '/img/og_meta_join.png',
  admin: '/img/og_meta_admin.png',
} as const;
/** Every og_meta_*.png is exported at this size. */
export const OG_IMAGE_SIZE = { width: 548, height: 315 } as const;
export const OG_IMAGE_CONTACT = OG_IMAGES.default;

export const YELP_URL = 'https://www.yelp.com/biz/not-the-rug-brooklyn-8';
/** The Google Business Profile (Maps listing), by place id: where visitors read Google reviews. */
export const GOOGLE_REVIEW_URL = 'https://www.google.com/maps/place/?q=place_id:ChIJvW9dSVlZwokR4cwWUqQruvA';
/**
 * Google's own "write a review" form for the same place. Google allows a
 * business to ask for reviews (never for payment or only from happy
 * customers); it asks the visitor to sign in first.
 */
export const GOOGLE_WRITE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJvW9dSVlZwokR4cwWUqQruvA';
/**
 * r/williamsburg thread with two unprompted recommendations. Reddit has no
 * reviews: this is shown as a showcase, never as a request to post.
 */
export const REDDIT_RECOMMENDATIONS_URL = 'https://www.reddit.com/r/williamsburg/comments/1s2ys0x/looking_for_a_confident_and_reliable_dogwalker/';

/**
 * Public ratings, as the platforms showed them on 2026-09-29 (owner-supplied).
 * Every rating on the site reads from here; update both numbers together
 * when they change.
 */
export const REVIEW_RATINGS = {
  google: { rating: '4.9', count: 51, url: GOOGLE_REVIEW_URL },
  yelp: { rating: '5.0', count: 37, url: YELP_URL },
} as const;
/**
 * Upvotes on the unprompted Not The Rug recommendations in the linked
 * r/williamsburg thread (5 + 3), as counted on 2026-09-29.
 */
export const REDDIT_UPVOTES = 8;

/**
 * Which platform has the most recent reviews, so "Read our reviews" sends
 * visitors to the freshest ones. Checked by hand; flip it when the other
 * platform gets a newer review. Yelp is never asked for reviews (its rules
 * forbid soliciting them), so it only ever appears as a place to read them.
 */
export const FRESHEST_REVIEWS: keyof typeof REVIEW_RATINGS = 'google';
export const INSTAGRAM_URL = 'https://www.instagram.com/nottherug/';
export const INSTAGRAM_HANDLE = '@nottherug';

// Carried over as-is from the source JSX (page-hero Instagram credit links).
// Not a real destination — flagged in the P2A report, fix belongs to P4/R18.
export const INSTAGRAM_PLACEHOLDER_URL = 'https://instagram.com/placeholder';

// Single source of truth for app/sitemap.ts. Every entry must be a real route
// that answers 200 and is indexable. Deliberately absent:
// - /services and /how-it-works: they redirect to home anchors (next.config.ts).
// - /contact: it sets `noIndex: true` below (unchanged from the pre-P2A route),
//   and a noindexed page has no business in the sitemap.
// - /walk-with-us: the walker application. It is linked from the nav
//   (components/SiteNav.tsx) and the team grid, and it is NOT noindexed and not
//   blocked in robots.ts, so crawlers can reach and index it via those links;
//   it is simply not listed here. Whether to list it is an owner decision
//   (plans/reports/013-P34-worker-K.md): add '/walk-with-us' to list it, or
//   pass `noIndex: true` in its buildPageMetadata call to keep it out of search.
// /admin and /playground are never public routes and must never appear here —
// see app/robots.ts.
export const PUBLIC_ROUTES: string[] = [
  '/',
  '/about',
  '/safety',
  '/neighborhoods/williamsburg',
  '/reviews',
  '/book',
  '/signup',
];

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
  absoluteTitle,
  ogImage = OG_IMAGES.default,
}: {
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
  /** Link-preview image path (see OG_IMAGES); defaults to the contact image. */
  ogImage?: string;
  /**
   * app/layout.tsx applies a `%s · Not The Rug` title template to every page
   * title, so every route's `title` here should be brand-suffix-free (e.g.
   * "Services & Rates", not "Services & Rates — Not The Rug"). Pass this only
   * for the homepage, which wants the exact root default title verbatim
   * instead of that title run through the template a second time.
   */
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    metadataBase: new URL(SITE_URL),
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [{ url: ogImage, ...OG_IMAGE_SIZE, alt: description }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
