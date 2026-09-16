'use client';

import type { ComponentProps } from 'react';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';

type Props = ComponentProps<'a'> & {
  /** Which CTA this is — must be one of the locked, rendered ids in lib/analytics/events.ts. */
  cta: CtaId;
  /** The page the CTA appears on (e.g. "contact", "services"). */
  page: string;
};

// A plain <a> that also records an anonymous cta_click — for tel:, mailto:,
// and external destinations, where next/link (TrackedCtaLink) is the wrong
// semantics and renders the wrong element. Never calls preventDefault, so
// the browser's native tel/mailto handoff and modified-click behavior
// (cmd/ctrl/shift/middle-click) are untouched.
export default function TrackedCtaAnchor({ cta, page, onClick, ...anchorProps }: Props) {
  return (
    <a
      {...anchorProps}
      onClick={(e) => {
        // A tracking failure must never stop a caller's own onClick or the
        // tel:/mailto:/external handoff itself.
        try {
          track('cta_click', { cta, page });
        } catch (err) {
          console.warn('[analytics] cta_click failed', err);
        }
        onClick?.(e);
      }}
    />
  );
}
