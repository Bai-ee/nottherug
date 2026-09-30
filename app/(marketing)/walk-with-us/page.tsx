import type { Metadata } from 'next';
import WalkWithUsPageContent from '@/components/marketing/WalkWithUsPageContent';
import { buildPageMetadata, OG_IMAGES } from '@/lib/content/site';
import { getBenchSettingsOrDefault } from '@/lib/server/bench';
import { readSource, readUtm } from '@/lib/bench/validation';

// Time blocks come from live bench settings, which Luis edits in the
// admin panel; a cached copy would offer walkers stale choices.
export const dynamic = 'force-dynamic';

// Linked from Indeed posts, not the site nav or the sitemap (plans/011 §12 #4).
export const metadata: Metadata = buildPageMetadata({
  path: '/walk-with-us',
  ogImage: OG_IMAGES.join,
  title: 'Join Our Team | Dog Walker Application',
  description: 'Apply to join the Not The Rug dog walking team in Williamsburg, Brooklyn, including substitute walker roles. Premium pay across all positions.',
});

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WalkWithUsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Allowlisted here and again on the server: an arbitrary URL value is never stored.
  const utm = readUtm({
    source: first(params.utm_source),
    medium: first(params.utm_medium),
    campaign: first(params.utm_campaign),
  });
  const source = first(params.src) ? readSource(first(params.src), utm) : undefined;
  const settings = await getBenchSettingsOrDefault();

  return (
    <WalkWithUsPageContent
      timeBlocks={settings.timeBlocks}
      source={source}
      utm={utm}
    />
  );
}
