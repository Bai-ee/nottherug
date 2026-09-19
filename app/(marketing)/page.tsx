import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import HomePageContent from '@/components/marketing/HomePageContent';
import { resolveLegacyMarketingPath } from '@/lib/content/legacy-routes';
import { buildPageMetadata } from '@/lib/content/site';

const PAGE_PATH = '/';

export const metadata: Metadata = buildPageMetadata({
  path: PAGE_PATH,
  title: 'Not The Rug — Williamsburg Dog Walking Since 2011',
  description:
    "Not The Rug is Williamsburg's most trusted dog walking service. No strangers, no first-time handlers — just experienced professionals who show up consistently.",
  // Matches app/layout.tsx's own default title exactly; `absoluteTitle` skips
  // the layout's `%s · Not The Rug` template so the brand name isn't repeated.
  absoluteTitle: true,
});

// Legacy `?page=`/`?hood=` deep links (see lib/content/legacy-routes.ts)
// still resolve here and redirect server-side before anything renders.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; hood?: string | string[] }>;
}) {
  const params = await searchParams;
  const target = resolveLegacyMarketingPath(params);
  if (target && target !== PAGE_PATH) {
    redirect(target);
  }

  return <HomePageContent />;
}
