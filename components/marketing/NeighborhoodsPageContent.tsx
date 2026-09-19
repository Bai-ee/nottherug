'use client';

import { useRef } from 'react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from './SiteFooter';
import NeighborhoodCard from './NeighborhoodCard';
import NeighborhoodDetail from './NeighborhoodDetail';
import { useSectionReveals } from './hooks/useSectionReveals';
import { WILLIAMSBURG } from '@/lib/content/coverage';
import { INSTAGRAM_PLACEHOLDER_URL } from '@/lib/content/site';

export default function NeighborhoodsPageContent() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useSectionReveals(pageRef);

  return (
    <div id="neighborhoods-williamsburg-page-shell" ref={pageRef}>
      <SiteNav />

      <div id="neighborhoods-williamsburg-hero-section" className="page-hero" style={{ background: "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00005.webp') center 20%/cover no-repeat" }}>
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>Service Areas</div>
          <h1>Williamsburg is our<br />backyard</h1>
          <p>We&apos;re a Williamsburg service through and through — we know every park, shortcut, and puddle to avoid.</p>
        </div>
        <a href={INSTAGRAM_PLACEHOLDER_URL} target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-neighborhoods"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Pepper · @pepper_bklyn</a>
      </div>

      <section id="neighborhoods-williamsburg-coverage-section" className="section">
        <div className="container">
          <div className="grid-3" style={{ gap: '24px' }}>
            <NeighborhoodCard
              id="neighborhoods-williamsburg-hood-card"
              href="/neighborhoods/williamsburg"
              name={WILLIAMSBURG.name}
              desc="Our home since 2011"
              style={{ aspectRatio: '1', position: 'relative' }}
            />
          </div>
        </div>
      </section>

      <section id="neighborhoods-williamsburg-detail-section" className="section bg-warm">
        <div className="container">
          <NeighborhoodDetail hood={WILLIAMSBURG} />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
