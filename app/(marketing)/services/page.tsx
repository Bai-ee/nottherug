import type { Metadata } from 'next';
import ServicesPageContent from '@/components/marketing/ServicesPageContent';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/services',
  title: 'Services & Rates — Not The Rug',
  description: 'Every service includes a free consultation, GPS tracking, and post-walk photo updates. Transparent pricing, no surprises.',
});

export default function ServicesPage() {
  return <ServicesPageContent />;
}
