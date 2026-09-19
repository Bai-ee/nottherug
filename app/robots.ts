import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/content/site';

// Crawling policy only — indexing in non-production is already handled by
// proxy.ts, which sends `X-Robots-Tag: noindex, nofollow` on every response
// when VERCEL_ENV !== 'production'. This file must not contradict that, so it
// stays a single crawl policy for every environment rather than trying to
// re-derive "are we live" here: allow the public marketing routes, keep
// crawlers out of admin, the dev-only playground, and the API surface.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/playground', '/playground/', '/api', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
