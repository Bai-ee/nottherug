'use client';

// Recoverable copy of the disabled home-page "Personalized Care Carousel"
// section (plans/010 P2.2 / P3.6) so AnimatedServiceCards.tsx — and the GSAP
// import and experimental card assets it pulls in — is reachable only from this
// dev-gated playground route (app/playground/service-cards/page.tsx returns
// notFound() in production), never from a production route's module graph.
// A gated `{false && ...}` call site with a static import would still put this
// component in the homepage's client bundle, so none is kept.
//
// Re-enabling the section on the home page (plans/002 P2A still says not to,
// without a separate product decision) means mounting this component from
// components/marketing/HomePageContent.tsx again. The former
// DisabledHomeSections.tsx and its other four sections were deleted
// (plan 014 H1); recover them from git history if needed.
import AnimatedServiceCards from '@/components/AnimatedServiceCards';

export function PersonalizedCareCarouselExperiment() {
  return (
    <div id="home-personalized-care-pin-stage">
      <div id="home-personalized-care-scroll-window">
        <AnimatedServiceCards />
      </div>
    </div>
  );
}
