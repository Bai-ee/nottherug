import type { Metadata } from 'next';
import SafetyPageContent from '@/components/marketing/SafetyPageContent';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/safety',
  title: 'Safety & Trust — Not The Rug',
  description: 'Every trust and safety standard we hold ourselves to — and why we hold it.',
});

export default function SafetyPage() {
  return <SafetyPageContent />;
}
