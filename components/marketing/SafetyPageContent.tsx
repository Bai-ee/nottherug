'use client';

import { useRef } from 'react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from './SiteFooter';
import TrustCards from './TrustCards';
import CertificationStrip from './CertificationStrip';
import SafetyFaq from './SafetyFaq';
import { useSectionReveals } from './hooks/useSectionReveals';
import { INSTAGRAM_PLACEHOLDER_URL } from '@/lib/content/site';

export default function SafetyPageContent() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useSectionReveals(pageRef);

  return (
    <div id="safety-page-shell" ref={pageRef}>
      <SiteNav />

      <div className="page-hero" style={{ background: "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00004.png') center 20%/cover no-repeat" }}>
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>Safety &amp; Trust</div>
          <h1>Why trust matters<br />more than price</h1>
          <p>Every trust and safety standard we hold ourselves to — and why we hold it.</p>
        </div>
        <a href={INSTAGRAM_PLACEHOLDER_URL} target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-safety"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Waffles · @waffles_nyc</a>
      </div>

      <section className="section">
        <div className="container">
          <TrustCards />

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="label">Certifications &amp; Memberships</div>
            <h3>Professional credentials</h3>
          </div>
          <CertificationStrip style={{ justifyContent: 'center' }} />

          <SafetyFaq />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
