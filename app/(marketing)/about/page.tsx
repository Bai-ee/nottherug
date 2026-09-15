import type { Metadata } from 'next';
import AboutPageContent from '@/components/marketing/AboutPageContent';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/about',
  title: 'About Us — Not The Rug',
  description: 'Not The Rug was born in Williamsburg and has never left. 15 years of walks, one neighborhood.',
});

export default function AboutPage() {
  return <AboutPageContent />;
}
