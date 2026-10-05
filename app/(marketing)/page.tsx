import type { Metadata } from 'next';
import HomePageContent from '@/components/marketing/HomePageContent';
import { buildPageMetadata, OG_IMAGES } from '@/lib/content/site';

const PAGE_PATH = '/';

export const metadata: Metadata = buildPageMetadata({
  path: PAGE_PATH,
  ogImage: OG_IMAGES.home,
  title: 'Not The Rug — Williamsburg Dog Walking Since 2011',
  description:
    "Not The Rug is Williamsburg's most trusted dog walking service. No strangers, no first-time handlers — just experienced professionals who show up consistently.",
  // Matches app/layout.tsx's own default title exactly; `absoluteTitle` skips
  // the layout's `%s · Not The Rug` template so the brand name isn't repeated.
  absoluteTitle: true,
});

// Legacy `?page=`/`?hood=` deep links redirect in proxy.ts (lib/routing/legacyRedirects.ts),
// so this page reads no request data and renders statically.
export default function HomePage() {
  return <HomePageContent />;
}
