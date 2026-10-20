import type { Metadata } from 'next';
import SafetyPageContent from '@/components/marketing/SafetyPageContent';
import { buildPageMetadata } from '@/lib/content/site';
import { breadcrumb, jsonLd } from '@/lib/content/structuredData';

export const metadata: Metadata = buildPageMetadata({
  path: '/safety',
  title: 'Safety, Insurance & Trust — Williamsburg Dog Walking',
  description:
    'How Not The Rug keeps Williamsburg dogs safe: insured and bonded, background-checked walkers, GPS-tracked walks, collar-plus-harness leashing, and our injury, vaccine and cancellation policies.',
});

export default function SafetyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb('/safety', 'Safety & Trust')) }} />
      <SafetyPageContent />
    </>
  );
}
