import type { Metadata } from 'next';
import HowItWorksPageContent from '@/components/marketing/HowItWorksPageContent';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/how-it-works',
  title: 'How It Works',
  description: "From first contact to daily walks — here's exactly what to expect when you join Not The Rug.",
});

export default function HowItWorksPage() {
  return <HowItWorksPageContent />;
}
