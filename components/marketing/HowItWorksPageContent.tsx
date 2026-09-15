'use client';

import { useRef } from 'react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from './SiteFooter';
import ProcessSteps from './ProcessSteps';
import SampleWalkReportCard from './SampleWalkReportCard';
import { useSectionReveals } from './hooks/useSectionReveals';
import { INSTAGRAM_PLACEHOLDER_URL } from '@/lib/content/site';

export default function HowItWorksPageContent() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useSectionReveals(pageRef);

  return (
    <div id="how-it-works-page-shell" ref={pageRef}>
      <SiteNav />

      <div className="page-hero" style={{ background: "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00002.png') center 20%/cover no-repeat" }}>
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>The Process</div>
          <h1>How it works</h1>
          <p>From first contact to daily walks — here&apos;s exactly what to expect when you join Not The Rug.</p>
        </div>
        <a href={INSTAGRAM_PLACEHOLDER_URL} target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-howitworks"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Mochi · @mochi_wlmsbg</a>
      </div>

      <section className="section">
        <div className="container">
          <div className="grid-2" style={{ gap: '80px' }}>
            <ProcessSteps />
            <div>
              <SampleWalkReportCard />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
