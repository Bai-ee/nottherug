'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { track } from '@/lib/analytics/track';

type Props = ComponentProps<typeof Link> & {
  /** Identifies which CTA this is (e.g. "closing_trust_book"), not free text. */
  cta: string;
  /** The page the CTA appears on (e.g. "home", "neighborhoods"). */
  page: string;
};

// A plain next/link that also records an anonymous cta_click — lets a
// Server Component (ClosingTrust, NeighborhoodDetail, SiteFooter) render a
// tracked link without itself becoming a Client Component.
export default function TrackedCtaLink({ cta, page, onClick, ...linkProps }: Props) {
  return (
    <Link
      {...linkProps}
      onClick={(e) => {
        track('cta_click', { cta, page });
        onClick?.(e);
      }}
    />
  );
}
