import type { Metadata } from 'next';
import ReviewsPageContent from '@/components/marketing/ReviewsPageContent';
import { buildPageMetadata, REVIEW_RATINGS } from '@/lib/content/site';
import { breadcrumb, jsonLd } from '@/lib/content/structuredData';

export const metadata: Metadata = buildPageMetadata({
  path: '/reviews',
  title: 'Reviews from Williamsburg Dog Owners',
  description: `What Williamsburg dog owners say about Not The Rug — ${REVIEW_RATINGS.google.rating} on Google (${REVIEW_RATINGS.google.count} reviews), ${REVIEW_RATINGS.yelp.rating} on Yelp (${REVIEW_RATINGS.yelp.count}), 15 years of dog walking.`,
});

export default function ReviewsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb('/reviews', 'Client Reviews')) }} />
      <ReviewsPageContent />
    </>
  );
}
