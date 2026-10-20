import type { Metadata } from 'next';
import AboutPageContent from '@/components/marketing/AboutPageContent';
import { buildPageMetadata } from '@/lib/content/site';
import { breadcrumb, jsonLd } from '@/lib/content/structuredData';

export const metadata: Metadata = buildPageMetadata({
  path: '/about',
  title: 'About Our Williamsburg Dog Walkers',
  description:
    'Meet Luis and the Not The Rug team: Williamsburg dog walkers since 2011, the same walker every time, max 3 dogs per walk. Born in the neighborhood and never left.',
});

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb('/about', 'About Us')) }} />
      <AboutPageContent />
    </>
  );
}
