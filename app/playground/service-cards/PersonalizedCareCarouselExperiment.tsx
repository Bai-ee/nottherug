'use client';

// Recoverable copy of the disabled home-page "Personalized Care Carousel"
// section. Moved here from components/marketing/DisabledHomeSections.tsx
// (plans/010 P2.2 / P3.6) so AnimatedServiceCards.tsx — and the GSAP import
// and experimental card assets it pulls in — is reachable only from this
// dev-gated playground route (app/playground/service-cards/page.tsx returns
// notFound() in production), never from a production route's module graph.
// DisabledHomeSections.tsx keeping its own import of this component was
// enough to make Next include it in the homepage's client bundle even though
// the call site is gated with `{false && ...}` — the `false` branch never
// runs, but the static import is still part of the module graph the bundler
// has to account for.
//
// Re-enabling the section on the home page (plans/002 P2A still says not to,
// without a separate product decision) means moving this file's contents
// back into DisabledHomeSections.tsx and restoring the `{false && ...}` call
// site in HomePageContent.tsx.
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
