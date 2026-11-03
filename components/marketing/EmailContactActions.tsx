'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { EMAIL_DISPLAY, EMAIL_HREF } from '@/lib/content/contact';
import { track } from '@/lib/analytics/track';
import TrackedCtaAnchor from './TrackedCtaAnchor';

/**
 * Copies `text`. Clipboard API first; then the legacy selection copy, which
 * still works in some in-app browsers that block the API. Resolves true only
 * when a copy is known to have happened — the caller shows "Copied" on true
 * and a manual fallback on false, never a guess. Exported for tests.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      // Some browsers leave the promise pending (e.g. a permission prompt the
      // visitor never sees). Waiting forever would show nothing at all, so a
      // slow answer is treated as a failure and the manual fallback appears.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('clipboard timeout')), 2000);
      });
      try {
        await Promise.race([navigator.clipboard.writeText(text), timedOut]);
      } finally {
        clearTimeout(timer);
      }
      return true;
    }
  } catch {
    // Permission denied / insecure context: try the legacy path below.
  }
  try {
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

type Props = {
  /** Stable id for the mailto link; the copy control derives its own from it. */
  id: string;
  linkClassName?: string;
  linkStyle?: CSSProperties;
  className?: string;
};

/**
 * The contact email, everywhere it appears: the visible address as a mailto
 * link (one activation = one cta_click 'contact_email'), plus "Copy email
 * address" for visitors whose device has no mail app set up — the likely
 * story behind bursts of repeated email taps.
 *
 * Says only what is known. A mailto: link cannot report whether a mail app
 * opened or an email was sent, so nothing here claims either; "Copied" shows
 * only after the copy actually succeeded, and a failed copy shows the address
 * selected in a field instead.
 */
export default function EmailContactActions({ id, linkClassName, linkStyle, className }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const manualRef = useRef<HTMLInputElement | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  useEffect(() => {
    if (copyState === 'manual') manualRef.current?.select();
  }, [copyState]);

  async function handleCopy() {
    const ok = await copyText(EMAIL_DISPLAY);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (ok) {
      setCopyState('copied');
      try {
        track('email_copied');
      } catch {
        // Analytics never blocks the copy.
      }
      resetTimer.current = setTimeout(() => setCopyState('idle'), 4000);
    } else {
      setCopyState('manual');
    }
  }

  return (
    <span id={`${id}-actions`} className={`email-contact-actions ${className ?? ''}`.trim()}>
      <TrackedCtaAnchor
        href={EMAIL_HREF}
        id={id}
        cta="contact_email"
        className={`email-contact-link ${linkClassName ?? ''}`.trim()}
        style={linkStyle}
      >
        {EMAIL_DISPLAY}
      </TrackedCtaAnchor>
      {copyState === 'manual' ? (
        <span id={`${id}-manual-copy`}>
          <label htmlFor={`${id}-manual-input`} className="sr-only">Email address</label>
          <input
            id={`${id}-manual-input`}
            ref={manualRef}
            className="email-contact-manual"
            readOnly
            value={EMAIL_DISPLAY}
            onFocus={(e) => e.currentTarget.select()}
            aria-describedby={`${id}-copy-status`}
          />
        </span>
      ) : (
        <button type="button" id={`${id}-copy-btn`} className="email-contact-copy-btn" onClick={handleCopy}>
          Copy email address
        </button>
      )}
      <span id={`${id}-copy-status`} className="email-contact-status" role="status" aria-live="polite">
        {copyState === 'copied' ? 'Copied' : copyState === 'manual' ? 'Couldn’t copy automatically — select the address and copy it.' : ''}
      </span>
    </span>
  );
}
