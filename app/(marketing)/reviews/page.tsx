import type { Metadata } from 'next';
import ReviewsPageContent from '@/components/marketing/ReviewsPageContent';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/reviews',
  title: 'Client Reviews — Not The Rug',
  description: 'What Brooklyn dog owners say about Not The Rug — 5-star ratings on Yelp and Google, 15 years of service.',
});

export default function ReviewsPage() {
  return <ReviewsPageContent />;
}
