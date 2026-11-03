'use client';

import { NEWSLETTER_LABEL } from '@/lib/leads/consent';

/**
 * The newsletter checkbox every email form shows. Unchecked by default and
 * never required: leaving it empty changes nothing about the booking or form.
 */
export default function NewsletterOptIn({
  id,
  checked,
  onChange,
  className,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  return (
    <label htmlFor={id} id={`${id}-row`} className={`newsletter-opt-in ${className ?? ''}`.trim()}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{NEWSLETTER_LABEL}</span>
    </label>
  );
}
