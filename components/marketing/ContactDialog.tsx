'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { openWelcomeWalkModal } from '@/lib/marketing/welcome-modal';
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
import { useScrollLock } from './hooks/useScrollLock';
import TrackedCtaLink from './TrackedCtaLink';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * The formal contact card as a modal: the same four facts the /contact page
 * carries (phone, email, service area, hours), stated once each, plus one
 * primary action — "Schedule a Meet & Greet". Opened only by the Contact Us
 * entries in the site nav and the footer (see ContactUsTrigger) — every other
 * contact link still goes to the /contact route.
 *
 * Wears the right-hand column of the welcome/booking modal (WelcomeWalkModal):
 * the "Serving Williamsburg" stamp and × close on top, the display headline,
 * then the details on the same pasted-paper sheet. Portal to <body>, Escape
 * and click-outside to close. It does not borrow SchedulingDialog's
 * scroll-to-top: this sheet is short and centered, so the page underneath can
 * stay where it was.
 *
 * The Schedule CTA hands off to the welcome modal's flow (email → Calendly →
 * questionnaire), which only the home route renders — the same rule SiteNav's
 * "Book a Walk" follows. Everywhere else the link goes to /book.
 */
export default function ContactDialog({ open, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  // Page behind the sheet stays put while it is open (see useScrollLock).
  useScrollLock(open);

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
        <div id="contact-modal-bar-panel">
          <span className="stamp-label" id="contact-modal-area-stamp">
            Serving Williamsburg
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            id="contact-modal-close-btn"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div id="contact-modal-heading-panel">
          <h2 id="contact-modal-title" className="hero-h1">
            Contact <em>Not The Rug</em>
          </h2>
        </div>

        <div id="contact-modal-form-panel">
          <div id="contact-modal-details-sheet" className="booking-form">
            <div className="booking-form-body">
              <dl id="contact-modal-detail-list">
                <div className="contact-modal-detail">
                  <dt>
                    Call or Text
                  </dt>
                  <dd>
                    <TrackedCtaAnchor
                      href={PHONE_HREF}
                      id="contact-modal-phone-link"
                      cta="contact_phone"
                      className="contact-modal-detail-value contact-modal-detail-value-lead"
                    >
                      {PHONE_DISPLAY}
                    </TrackedCtaAnchor>
                    <p className="contact-modal-detail-note">Fastest reply. Luis answers personally.</p>
                  </dd>
                </div>

                <div className="contact-modal-detail">
                  <dt>
                    Email
                  </dt>
                  <dd>
                    <TrackedCtaAnchor
                      href={EMAIL_HREF}
                      id="contact-modal-email-link"
                      cta="contact_email"
                      className="contact-modal-detail-value contact-modal-detail-value-lead"
                    >
                      {EMAIL_DISPLAY}
                    </TrackedCtaAnchor>
                    <p className="contact-modal-detail-note">New client intake and detailed questions.</p>
                  </dd>
                </div>

                <div className="contact-modal-detail">
                  <dt>
                    Service Area
                  </dt>
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
                  <dt>
                    Response Hours
                  </dt>
                  <dd>
                    <p className="contact-modal-detail-value">{RESPONSE_HOURS}</p>
                    <p className="contact-modal-detail-note">{RESPONSE_TIME_NOTE}</p>
                  </dd>
                </div>
              </dl>

              <div id="contact-modal-cta-row">
                <TrackedCtaLink
                  href="/book"
                  id="contact-modal-schedule-cta"
                  className="btn btn-primary btn-accent"
                  cta="contact_modal_schedule"
                  onClick={(e) => {
                    // A cmd/ctrl/shift-click means "open this somewhere else":
                    // let the browser follow the real href.
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    // Only the home route renders the welcome modal.
                    if (pathname !== '/') return;
                    e.preventDefault();
                    onClose();
                    openWelcomeWalkModal();
                  }}
                >
                  Schedule a Meet &amp; Greet
                </TrackedCtaLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
