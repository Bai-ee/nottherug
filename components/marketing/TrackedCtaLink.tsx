'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';
import { openWelcomeWalkModal } from '@/lib/marketing/welcome-modal';

type Props = ComponentProps<typeof Link> & {
  /** Which CTA this is — must be one of the locked, rendered ids in lib/analytics/events.ts. */
  cta: CtaId;
  /**
   * The "Book a Walk" / "Book a Meet & Greet" family: opens the Set Up an In Person
   * Meeting modal in place. The href stays a real link, so a cmd/ctrl/shift
   * click, no-JS and pre-hydration still reach the booking page.
   */
  opensWelcomeModal?: boolean;
};

// A plain next/link that also records an anonymous cta_click — lets a
// Server Component (ClosingTrust, NeighborhoodDetail, SiteFooter) render a
// tracked link without itself becoming a Client Component. Internal route
// navigation only — for tel:/mailto:/external destinations use TrackedCtaAnchor.
export default function TrackedCtaLink({ cta, opensWelcomeModal, onClick, ...linkProps }: Props) {
  return (
    <Link
      {...linkProps}
      onClick={(e) => {
        // A tracking failure (e.g. sessionStorage unavailable) must never
        // stop a caller's own onClick or the navigation itself.
        try {
          track('cta_click', { cta });
        } catch (err) {
          console.warn('[analytics] cta_click failed', err);
        }
        onClick?.(e);
        if (!opensWelcomeModal || e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        // Only cancel the link when the modal took the request.
        if (openWelcomeWalkModal()) e.preventDefault();
      }}
    />
  );
}
