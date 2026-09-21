import SiteNav from '@/components/SiteNav';
import MeetGreetForm from '@/components/MeetGreetForm';
import { BookedSelfReportPrompt } from '@/components/booking/BookedSelfReportPrompt';
import HomeHero from './HomeHero';
import ProofMarquee from './ProofMarquee';
import WalkConceptsMarquee from './WalkConceptsMarquee';
import TrustBar from './TrustBar';
import ServicesPreview from './ServicesPreview';
import TeamBand from './TeamBand';
import ClosingTrust from './ClosingTrust';
import FeaturedReviews from './FeaturedReviews';
import SiteFooter from './SiteFooter';
import WelcomeWalkModal from './WelcomeWalkModal';
import HomeIntroOverlay from './HomeIntroOverlay';
import HomePawWalk from './HomePawWalk';
import HowItWorksStrip from './HowItWorksStrip';
import HomeSectionRevealShell from './HomeSectionRevealShell';
import {
  OtherServicesTeaser,
  WeekdayBenefits,
  VisitIncludes,
  FounderPullQuote,
  NeighborhoodTeaser,
} from './DisabledHomeSections';

// Server Component: this file composes the page but owns no browser state
// itself. ProofMarquee, WalkConceptsMarquee, TrustBar, TeamBand, ClosingTrust,
// FeaturedReviews and SiteFooter carry no 'use client' of their own, so
// rendering them here (rather than from inside a client file) keeps them, and
// everything they import, out of the homepage's client JS. The scroll/reveal
// orchestration that used to run at this level now lives in
// HomeSectionRevealShell, the one client boundary this page needs; everything
// else already client-side (HomeHero, ServicesPreview, HowItWorksStrip,
// HomePawWalk, HomeIntroOverlay, WelcomeWalkModal) keeps its own 'use client'
// and is passed in as children/direct JSX, not imported by the shell itself —
// see that file's comment for why that distinction matters here.
export default function HomePageContent() {
  return (
    <>
      {/* Loading screen. First in the tree so its inline gate script runs
          before the nav or the page paint — nothing is on screen ahead of the
          walker silhouette. */}
      <HomeIntroOverlay />

      <SiteNav />

      {/* First-visit popup promoting the free meet & greet. Home only — /book
          and /contact already put the form in front of the visitor. */}
      <WelcomeWalkModal />

      {/* id + "active" class kept: globals.css gates several homepage-only
          masking-tape decorations on `#page-home.active` / `#page-home .foo`. */}
      <HomeSectionRevealShell>
        {/* Paw trail walking the whole page along an editable SVG route.
            First child so it measures #page-home, and z-indexed above the
            sections it crosses — see lib/marketing/paw-walk-path.ts. */}
        <HomePawWalk />

        <HomeHero />

        {/* Rates follow the fold directly — the featured Group Walk card is
            the page's primary conversion surface. Everything else follows. */}
        <ServicesPreview />

        {/* The dark trust bar closes the rates section: pricing first, then a
            full-bleed black rule of credentials under it. */}
        <TrustBar />

        <TeamBand />

        {/* Roster first: the steps below describe what these people do, so the
            faces come before the process. Same surface as the strip, so the
            two bands read as one. */}

        {/* Credentials sit directly under the roster: these are the people,
            and this is what backs them — insured, checked, local. Header-less
            and pad-less on top so it reads as one band with the faces above. */}
        <ClosingTrust />

        {/* The process steps answer the question the rates raise — what do I
            actually get. Its own dark band now (it used to be nested inside
            the sage-dark reviews band and inherited that surface). */}

        {/* Review quotes scroll past, then the reviews section they come
            from. Both run on cream, so the marquee and the voices band read as
            one light break after the green process strip. */}
        <ProofMarquee />
        <FeaturedReviews />

        {/* Black seam line between the voices band and the process strip that
            opens the closing band — the walk itself, listed. */}
        {/* Process block on cream, under the voices band: the clients speak,
            then what working with us actually looks like. Trial placement —
            it used to open the green closing band above the form. */}
        <section className="section" id="home-process-section">
          <div className="container">
            <HowItWorksStrip />
          </div>
        </section>

        <WalkConceptsMarquee />

        {/* Animated product carousel — disabled per current direction; the
            static rate cards in ServicesPreview replace it. The
            AnimatedServiceCards-based version of this section now lives at
            app/playground/service-cards/PersonalizedCareCarouselExperiment.tsx
            instead of being gated here, so its GSAP import stays out of this
            route's module graph — see that file for how to bring it back. */}

        {false && <OtherServicesTeaser />}

        {/* Closing band: the How It Works / Meet & Greet sheet and the footer
            share one shell so a single background paints across both. Each of
            them used to carry its own surface, and the two met as a visible
            crease at the seam. Their backgrounds are cleared inside this shell
            (see #home-closing-band-shell in globals.css). */}
        <div id="home-closing-band-shell">
        <section className="section" id="home-contact-sheet-section">
          <div className="container">
            {/* The process steps close the page inside this band, directly
                above the form they lead to — the strip dropped its own section
                chrome so the green runs unbroken. */}
            <div id="home-contact-sheet-header">
              <div id="home-contact-sheet-header-copy">
                <div className="stamp-label stamp-label-dark stamp-label-heading">Sign Up 05 · Let’s Get Started</div>
                <h2>What We&apos;d Like to Know....</h2>
              </div>
              {/* Decorative: the halftone bridge clipping fills the empty half
                  of this row on wide screens. Alt is empty on purpose — it
                  carries no information the headline doesn't already give. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                id="home-contact-sheet-clipping"
                src="/img/bg-section-graphic-1.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                width={1620}
                height={971}
              />
            </div>
            <div id="home-book-form-wrap" className="booking-form-wrap">
              <div className="booking-form" id="home-contact-sheet-form-sheet">
                <div className="booking-form-body">
                  <BookedSelfReportPrompt />
                  <MeetGreetForm paneId="home-meetgreet" source="home" layout="full" />
                </div>
              </div>
            </div>
          </div>
        </section>
          <SiteFooter />
        </div>

        {false && <WeekdayBenefits />}
        {false && <VisitIncludes />}
        {false && <FounderPullQuote />}
        {false && <NeighborhoodTeaser />}
      </HomeSectionRevealShell>
    </>
  );
}
