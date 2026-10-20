import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES, absoluteUrl } from '@/lib/content/site';

// lastModified is the build time: every deploy republishes every page, and
// Google ignores changefreq/priority, so that is the one honest signal.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((path) => ({ url: absoluteUrl(path), lastModified }));
}
