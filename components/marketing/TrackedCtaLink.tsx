'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';

type Props = ComponentProps<typeof Link> & {
  /** Which CTA this is — must be one of the locked, rendered ids in lib/analytics/events.ts. */
  cta: CtaId;
};

// A plain next/link that also records an anonymous cta_click — lets a
// Server Component (ClosingTrust, NeighborhoodDetail, SiteFooter) render a
// tracked link without itself becoming a Client Component. Internal route
// navigation only — for tel:/mailto:/external destinations use TrackedCtaAnchor.
export default function TrackedCtaLink({ cta, onClick, ...linkProps }: Props) {
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
      }}
    />
  );
}
