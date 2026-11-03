'use client';

import type { ComponentProps } from 'react';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';

/**
 * Native click events already recorded. One activation must produce one
 * event even if this anchor is ever nested in another tracked handler or a
 * handler gets attached twice; a genuine second click is a new native event
 * and is still recorded, so repeated intentional clicks stay countable.
 */
const recordedClicks = new WeakSet<Event>();

type Props = ComponentProps<'a'> & {
  /** Which CTA this is — must be one of the locked, rendered ids in lib/analytics/events.ts. */
  cta: CtaId;
};

// A plain <a> that also records an anonymous cta_click — for tel:, mailto:,
// and external destinations, where next/link (TrackedCtaLink) is the wrong
// semantics and renders the wrong element. Never calls preventDefault, so
// the browser's native tel/mailto handoff and modified-click behavior
// (cmd/ctrl/shift/middle-click) are untouched.
export default function TrackedCtaAnchor({ cta, onClick, ...anchorProps }: Props) {
  return (
    <a
      {...anchorProps}
      onClick={(e) => {
        // A tracking failure must never stop a caller's own onClick or the
        // tel:/mailto:/external handoff itself.
        try {
          const native = e?.nativeEvent;
          const seen = native && typeof native === 'object' ? recordedClicks.has(native) : false;
          if (!seen) {
            if (native && typeof native === 'object') recordedClicks.add(native);
            track('cta_click', { cta });
          }
        } catch (err) {
          console.warn('[analytics] cta_click failed', err);
        }
        onClick?.(e);
      }}
    />
  );
}
