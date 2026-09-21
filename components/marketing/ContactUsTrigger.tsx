'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';
import ContactDialog from './ContactDialog';

type Props = {
  /** DOM handle for the trigger itself; the dialog's ids are its own. */
  id: string;
  /** nav_contact from the site nav, footer_contact from the footer. */
  cta: CtaId;
  className?: string;
  /** Runs when the dialog opens — the site nav uses it to close its menu. */
  onOpen?: () => void;
  children: React.ReactNode;
};

/**
 * The Contact Us entry in the site nav and the footer. A button, not a link:
 * it opens ContactDialog in place instead of navigating, which is the whole
 * point — the details are one press away from wherever the visitor already
 * is. Every other contact link on the site still routes to /contact.
 *
 * Each trigger owns its own dialog instance rather than sharing one through
 * context: only one can be open at a time anyway (the open sheet traps focus
 * and covers the page), and this keeps the footer a server component with a
 * single client child.
 */
export default function ContactUsTrigger({ id, cta, className, onOpen, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        id={id}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          onOpen?.();
          // Same event the link it replaced reported, so the owner's contact
          // numbers stay continuous across this change.
          try {
            track('cta_click', { cta, page: pathname });
          } catch (err) {
            console.warn('[analytics] cta_click failed', err);
          }
        }}
      >
        {children}
      </button>
      <ContactDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
