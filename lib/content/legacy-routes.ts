// Compatibility map for the old SPA's `?page=`/`?hood=` deep links
// (app/page.tsx's `showPage`/`showNeighborhood`), still referenced by
// external links and bookmarks. See plans/002-production-readiness.md P2A
// item 3 — these are redirected, not re-implemented.

export const LEGACY_PAGE_REDIRECTS: Record<string, string> = {
  home: '/',
  services: '/#home-personalized-care-section',
  'how-it-works': '/#home-how-it-works-block',
  about: '/about',
  safety: '/safety',
  neighborhoods: '/neighborhoods/williamsburg',
  reviews: '/reviews',
  book: '/book',
  contact: '/contact',
};

export const LEGACY_HOOD_REDIRECTS: Record<string, string> = {
  williamsburg: '/neighborhoods/williamsburg',
};

/**
 * Resolves a legacy `?page=`/`?hood=` search param pair to its new path, or
 * `null` if neither param matches a known legacy value (nothing to redirect).
 */
export function resolveLegacyMarketingPath(searchParams: {
  page?: string | string[];
  hood?: string | string[];
}): string | null {
  const hood = Array.isArray(searchParams.hood) ? searchParams.hood[0] : searchParams.hood;
  if (hood && LEGACY_HOOD_REDIRECTS[hood]) {
    return LEGACY_HOOD_REDIRECTS[hood];
  }

  const page = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  if (page && LEGACY_PAGE_REDIRECTS[page]) {
    return LEGACY_PAGE_REDIRECTS[page];
  }

  return null;
}
