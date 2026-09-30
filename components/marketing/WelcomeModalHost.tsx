'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  WELCOME_MODAL_OPEN_EVENT,
  type OpenWelcomeWalkModalOptions,
} from '@/lib/marketing/welcome-modal';

// Loaded only when a CTA asks for it. WelcomeWalkModal drags in the scheduler,
// the onboarding handoff and the intake form, which is why it is not part of
// every marketing route's bundle (see lib/marketing/welcome-modal.ts).
const WelcomeWalkModal = dynamic(() => import('./WelcomeWalkModal'), { ssr: false });

/**
 * Makes every "Book a Walk" / "Book a Meet & Greet" CTA open the Set Up an In Person
 * Meeting modal on every marketing page, not just the home page.
 *
 * The home page renders the modal itself (HomePageContent), so this host does
 * nothing there. On any other route it waits for the first
 * WELCOME_MODAL_OPEN_EVENT, loads the modal, and mounts it already open with
 * that request's options. From then on the modal's own listener handles later
 * clicks. It is manual-only: the first-visit auto-open stays a home-page
 * behaviour.
 */
export default function WelcomeModalHost() {
  const pathname = usePathname();
  const onHome = pathname === '/';
  // null until a CTA has asked; then the request that opened it.
  const [request, setRequest] = useState<OpenWelcomeWalkModalOptions | null>(null);
  const requested = request !== null;

  useEffect(() => {
    if (onHome || requested) return;
    function handleOpenRequest(event: Event) {
      // Claims the request: the modal is on its way, so the CTA's own link
      // must not navigate.
      event.preventDefault();
      const detail = (event as CustomEvent<OpenWelcomeWalkModalOptions | undefined>).detail;
      setRequest(detail ?? {});
    }
    window.addEventListener(WELCOME_MODAL_OPEN_EVENT, handleOpenRequest);
    return () => window.removeEventListener(WELCOME_MODAL_OPEN_EVENT, handleOpenRequest);
  }, [onHome, requested]);

  if (onHome || !requested) return null;
  return <WelcomeWalkModal openOnMount={request} manualOnly />;
}
