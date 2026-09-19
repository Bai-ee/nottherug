'use client';

import { useRef } from 'react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from './SiteFooter';
import ReviewsMasonry from './ReviewsMasonry';
import { useSectionReveals } from './hooks/useSectionReveals';
import { INSTAGRAM_PLACEHOLDER_URL, YELP_URL, GOOGLE_REVIEW_URL } from '@/lib/content/site';

export default function ReviewsPageContent() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useSectionReveals(pageRef);

  return (
    <div id="reviews-page-shell" ref={pageRef}>
      <SiteNav />

      <div id="reviews-hero-section" className="page-hero bg-charcoal" style={{ background: "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00006.webp') center 20%/cover no-repeat" }}>
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>Client Reviews</div>
          <h1 style={{ color: 'white' }}>What Brooklyn<br />dog owners say</h1>
          <div className="reviews-hero-stats">
            <div>
              <div className="review-big-num">5.0</div>
              <div className="stars" style={{ fontSize: '20px', marginTop: '4px' }}>★★★★★</div>
              <div className="review-source-label">Google Rating</div>
            </div>
            <div className="reviews-divider"></div>
            <div>
              <div className="review-big-num">5.0</div>
              <div className="stars" style={{ fontSize: '20px', marginTop: '4px' }}>★★★★★</div>
              <div className="review-source-label">Yelp Rating · 34 Reviews</div>
            </div>
            <div className="reviews-divider"></div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '52px', color: 'white', lineHeight: 1 }}>15</div>
              <div className="review-source-label" style={{ marginTop: '4px' }}>Years of 5-star service</div>
            </div>
          </div>
        </div>
        <a href={INSTAGRAM_PLACEHOLDER_URL} target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-reviews"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Beans · @beans_wlmsbg</a>
      </div>

      {/* One content section split into two nav destinations. The CTA panel
          keeps its own 56px top margin, so the seam zeroes out the section
          padding either side of it to keep the original spacing. */}
      <section id="reviews-wall-section" className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <ReviewsMasonry />
        </div>
      </section>

      <section id="reviews-leave-review-section" className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginTop: '56px', padding: '40px', background: 'var(--warm-white)', border: '1px solid var(--light-gray)', borderRadius: 'var(--radius-lg)' }}>
            <div className="label">Leave a Review</div>
            <h3>Loved working with us?</h3>
            <p style={{ color: 'var(--mid-gray)', margin: '12px 0 28px' }}>Your review helps other Brooklyn dog owners find trustworthy care — and it means the world to our team.</p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a className="btn btn-primary" href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener">Review on Google</a>
              <a className="btn btn-outline" href={YELP_URL} target="_blank" rel="noopener">Review on Yelp</a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
