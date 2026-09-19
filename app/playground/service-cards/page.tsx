import { notFound } from 'next/navigation';
import PlaygroundClient from './PlaygroundClient';
import { PersonalizedCareCarouselExperiment } from './PersonalizedCareCarouselExperiment';

// Dev-only animation playground (R16) — the tuning UI here is explicitly
// out of scope for production. `notFound()` only works reliably from a
// Server Component, so this file stays a server wrapper around the client
// component that holds the actual playground.
//
// PersonalizedCareCarouselExperiment (the disabled home-page section built on
// AnimatedServiceCards.tsx) is rendered below the tuning UI so it stays
// reachable and visually checkable from a dev-gated route instead of a
// production one — see that file's comment for the full rationale.
export default function ServiceCardsPlaygroundPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <>
      <PlaygroundClient />
      <PersonalizedCareCarouselExperiment />
    </>
  );
}
