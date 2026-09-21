'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  PHONE_DISPLAY,
  PHONE_HREF,
  EMAIL_DISPLAY,
  EMAIL_HREF,
  ADDRESS_LINE_1,
  ADDRESS_LINE_2,
  RESPONSE_HOURS,
  RESPONSE_TIME_NOTE,
  SERVICE_AREA_SHORT,
} from '@/lib/content/contact';
import TrackedCtaAnchor from './TrackedCtaAnchor';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * The formal contact card as a modal: the same four facts the /contact page
 * carries (phone, email, service area, hours), stated once each with no
 * surrounding sales copy. Opened only by the Contact Us entries in the site
 * nav and the footer (see ContactUsTrigger) — every other contact link still
 * goes to the /contact route.
 *
 * Built on the same shape as the booking SchedulingDialog — portal to
 * <body>, olive header band with the wordmark, paper sheet, Escape and
 * click-outside to close — so the two modals on this site read as one
 * pattern. It does not borrow that dialog's scroll-to-top: this sheet is
 * short and centered, so the page underneath can stay where it was.
 */
export default function ContactDialog({ open, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Body scroll lock. The page keeps its scroll position — the sheet is
  // centered in the viewport, so nothing has to move underneath it.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus trap + Escape, and focus goes back to whatever opened the dialog.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="contact-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div id="contact-modal-sheet" ref={sheetRef}>
        <div id="contact-modal-header">
          <Image
            id="contact-modal-logo"
            src="/img/horiz_logo_off_white.png"
            alt="Not The Rug"
            width={498}
            height={88}
            sizes="200px"
          />
          <button
            ref={closeButtonRef}
            type="button"
            id="contact-modal-close-btn"
            aria-label="Close"
            onClick={onClose}
          >
            Close ×
          </button>
        </div>

        <div id="contact-modal-body">
          <h2 id="contact-modal-title">Contact Not The Rug</h2>

          <dl id="contact-modal-detail-list">
            <div className="contact-modal-detail">
              <dt>Call or Text</dt>
              <dd>
                <TrackedCtaAnchor
                  href={PHONE_HREF}
                  id="contact-modal-phone-link"
                  cta="contact_phone"
                  className="contact-modal-detail-value"
                >
                  {PHONE_DISPLAY}
                </TrackedCtaAnchor>
                <p className="contact-modal-detail-note">Fastest reply. Luis answers personally.</p>
              </dd>
            </div>

            <div className="contact-modal-detail">
              <dt>Email</dt>
              <dd>
                <TrackedCtaAnchor
                  href={EMAIL_HREF}
                  id="contact-modal-email-link"
                  cta="contact_email"
                  className="contact-modal-detail-value"
                >
                  {EMAIL_DISPLAY}
                </TrackedCtaAnchor>
                <p className="contact-modal-detail-note">New client intake and detailed questions.</p>
              </dd>
            </div>

            <div className="contact-modal-detail">
              <dt>Service Area</dt>
              <dd>
                <p className="contact-modal-detail-value">{SERVICE_AREA_SHORT}</p>
                <p className="contact-modal-detail-note">
                  {ADDRESS_LINE_1}
                  <br />
                  {ADDRESS_LINE_2}
                </p>
              </dd>
            </div>

            <div className="contact-modal-detail">
              <dt>Response Hours</dt>
              <dd>
                <p className="contact-modal-detail-value">{RESPONSE_HOURS}</p>
                <p className="contact-modal-detail-note">{RESPONSE_TIME_NOTE}</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>,
    document.body
  );
}
