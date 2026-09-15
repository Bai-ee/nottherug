'use client';

import { useRef } from 'react';
import SiteNav from '@/components/SiteNav';
import MeetGreetForm from '@/components/MeetGreetForm';
import HomeHero from './HomeHero';
import ProofMarquee from './ProofMarquee';
import HowItWorksStrip from './HowItWorksStrip';
import TrustBar from './TrustBar';
import ServicesPreview from './ServicesPreview';
import ClosingTrust from './ClosingTrust';
import FeaturedReviews from './FeaturedReviews';
import SiteFooter from './SiteFooter';
import { useSectionReveals } from './hooks/useSectionReveals';
import {
  PersonalizedCareCarousel,
  OtherServicesTeaser,
  WeekdayBenefits,
  VisitIncludes,
  FounderPullQuote,
  NeighborhoodTeaser,
} from './DisabledHomeSections';

export default function HomePageContent() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useSectionReveals(pageRef);

  return (
    <>
      <SiteNav />

      {/* Fixed circular brand seal, bottom-right of the viewport. Visibility
          (home only) is handled in CSS via #home-floating-logo-badge's
          :has() selector — this element only needs to exist on the home
          route, which it now does since this component is home-only. */}
      <img id="home-floating-logo-badge" src="/logos/notRugGreen.png" alt="Not The Rug NYC dog walking" width={1080} height={1080} />

      {/* id + "active" class kept: globals.css gates #home-floating-logo-badge
          and several homepage-only masking-tape decorations on
          `#page-home.active` / `#page-home .foo` (see :has() rule above). */}
      <div id="page-home" className="page active" ref={pageRef}>
        <HomeHero />
        <ProofMarquee />
        <HowItWorksStrip />
        <TrustBar />

        {/* Animated product carousel — disabled per current direction; the
            static rate cards in ServicesPreview replace it. Left in place
            (not deleted) in case it comes back. */}
        {false && <PersonalizedCareCarousel />}
        <ServicesPreview />

        <ClosingTrust />
        <FeaturedReviews />

        {false && <OtherServicesTeaser />}

        <section className="section" id="home-contact-sheet-section">
          <div className="container">
            <div id="home-contact-sheet-header">
              <div className="stamp-label stamp-label-dark stamp-label-heading">Form 02 · Meet &amp; Greet</div>
              <h2>What We&apos;d Like to Know....</h2>
            </div>
            <div id="home-book-form-wrap" className="booking-form-wrap">
              <div className="booking-form" id="home-contact-sheet-form-sheet">
                <div className="booking-form-body">
                  <MeetGreetForm paneId="home-meetgreet" source="home" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {false && <WeekdayBenefits />}
        {false && <VisitIncludes />}
        {false && <FounderPullQuote />}
        {false && <NeighborhoodTeaser />}
      </div>

      <SiteFooter />
    </>
  );
}
