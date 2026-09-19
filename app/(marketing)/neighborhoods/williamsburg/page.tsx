import type { Metadata } from 'next';
import NeighborhoodsPageContent from '@/components/marketing/NeighborhoodsPageContent';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/neighborhoods/williamsburg',
  title: 'Dog Walking in Williamsburg, Brooklyn',
  description: "We're a Williamsburg service through and through — we know every park, shortcut, and puddle to avoid.",
});

export default function WilliamsburgPage() {
  return <NeighborhoodsPageContent />;
}
