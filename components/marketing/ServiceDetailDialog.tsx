'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { openWelcomeWalkModal } from '@/lib/marketing/welcome-modal';
import { track } from '@/lib/analytics/track';
import type { ServicePreviewItem } from '@/lib/content/services';
import { useScrollLock } from './hooks/useScrollLock';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  /** Every service, in the order the carousel steps through them. */
  services: readonly ServicePreviewItem[];
  /** Which one is showing; null keeps the dialog closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

/**
 * The full write-up for one service — lead line, what a walk includes, every
 * rate, and the fine print — which the home rates row keeps off the page. It
 * is opened by the olive "›" labels on each rate (ServicesPreview) and on the
 * featured Dog Walking card (GroupWalkFeatureCard).
 *
 * A looping slide carousel on Embla (already a dependency; see
 * components/ui/carousel.tsx): every service is a slide in one track, so the
 * headline and the facts travel together. Touch swipes and mouse drags move
 * the track under the pointer, and the ‹ › buttons, the dots and the arrow
 * keys step it too. Stepping past the last service wraps to the first.
 *
 * Deliberately the same object as the Contact Us modal (ContactDialog): the
 * stamp and × close on top, the display headline, then icon-and-label facts
 * as cells of one ruled grid on the pasted-paper sheet, and one full-width
 * action. Its overlay, shell and close button are the rules the two modals
 * share in globals.css (CONTACT MODAL); the grid and the carousel are this
 * dialog's own (SERVICE DETAIL MODAL).
 *
 * The action hands off to the welcome modal's flow (email → meet & greet
 * with Luis → questionnaire). Only the home route renders the rates row, so
 * that flow is always present when this dialog is.
 */
export default function ServiceDetailDialog(props: Props) {
  // The carousel mounts only while open, so each opening starts on the service
  // that was tapped without re-initialising Embla on every step.
  if (props.index === null || typeof document === 'undefined') return null;
  return createPortal(<ServiceCarouselSheet {...props} index={props.index} />, document.body);
}

function ServiceCarouselSheet({
  services,
  index,
  onIndexChange,
  onClose,
}: Props & { index: number }) {
  const count = services.length;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [startIndex] = useState(index);
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    startIndex,
    duration: reduceMotion ? 0 : 24,
  });

  // The parent owns which service is showing; Embla reports every settle.
  useEffect(() => {
    if (!emblaApi) return;
    const handleSelect = () => onIndexChange(emblaApi.selectedScrollSnap());
    emblaApi.on('select', handleSelect);
    return () => {
      emblaApi.off('select', handleSelect);
    };
  }, [emblaApi, onIndexChange]);

  // Page behind the sheet stays put while it is open (see useScrollLock).
  useScrollLock(true);

  // Focus goes to the close button on open and back to the label that opened
  // the dialog on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus();
    };
  }, []);

  // Focus trap, Escape and the arrow keys; re-bound only when Embla appears.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.key === 'ArrowRight') emblaApi?.scrollNext();
        else emblaApi?.scrollPrev();
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [emblaApi, onClose]);

  const current = services[index];

  return (
    <div
      id="service-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`service-modal-title-${index}`}
      aria-roledescription="carousel"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div id="service-modal-sheet" ref={sheetRef}>
        <div id="service-modal-bar-panel">
          <span className="stamp-label" id="service-modal-area-stamp">
            Serving Williamsburg
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            id="service-modal-close-btn"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div id="service-modal-viewport" ref={emblaRef}>
          <div id="service-modal-track">
            {services.map((service, i) => (
              <ServiceSlide
                key={service.title}
                service={service}
                slideIndex={i}
                count={count}
                active={i === index}
              />
            ))}
          </div>
        </div>

        <div id="service-modal-footer-panel">
          <div id="service-modal-carousel-nav">
            <button
              type="button"
              id="service-modal-prev-btn"
              className="service-modal-step-btn"
              aria-label={`Previous: ${services[(index - 1 + count) % count].title}`}
              onClick={() => emblaApi?.scrollPrev()}
            >
              ‹
            </button>
            <div id="service-modal-carousel-dots">
              {services.map((item, i) => (
                <button
                  key={item.title}
                  type="button"
                  className="service-modal-dot"
                  aria-label={item.title}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => emblaApi?.scrollTo(i)}
                />
              ))}
              <span id="service-modal-carousel-count" aria-hidden="true">
                {index + 1} / {count}
              </span>
            </div>
            <button
              type="button"
              id="service-modal-next-btn"
              className="service-modal-step-btn"
              aria-label={`Next: ${services[(index + 1) % count].title}`}
              onClick={() => emblaApi?.scrollNext()}
            >
              ›
            </button>
          </div>
          {/* Announces the service each step lands on. */}
          <span className="sr-only" aria-live="polite">
            {current.title}, {index + 1} of {count}
          </span>

          <button
            type="button"
            id="service-modal-get-started-cta"
            className="btn btn-primary btn-accent"
            onClick={() => {
              // Best effort: a failed track must never block the hand-off.
              try {
                track('cta_click', { cta: 'service_modal_get_started' });
              } catch (err) {
                console.warn('[analytics] cta_click failed', err);
              }
              onClose();
              openWelcomeWalkModal();
            }}
          >
            Contact Luis, to Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceSlide({
  service,
  slideIndex,
  count,
  active,
}: {
  service: ServicePreviewItem;
  slideIndex: number;
  count: number;
  active: boolean;
}) {
  const [nameFirst, nameSecond] = service.nameLines ?? [service.title, ''];
  // A single headline rate when the entry has no fuller breakdown.
  const rateLines = service.rateLines ?? [`${service.price} ${service.priceUnit}`];

  return (
    <div
      className="service-modal-slide"
      role="group"
      aria-roledescription="slide"
      aria-label={`${slideIndex + 1} of ${count}`}
      // Off-screen slides hold no focus and stay out of the reading order.
      inert={!active}
    >
      <div className="service-modal-slide-heading">
        <h2 id={`service-modal-title-${slideIndex}`} className="hero-h1 service-modal-title">
          {nameFirst} {nameSecond && <em>{nameSecond}</em>}
        </h2>
      </div>

      <div className="service-modal-slide-body">
        <div className="booking-form service-modal-details-sheet">
          <div className="booking-form-body">
            {/* Three rows for every service: the rates panel first (the
                prices are the first read), then The Walk, then a footnote
                strip. The rates panel takes any spare height (see
                globals.css), so shorter services still fill the sheet. */}
            <dl className="service-modal-detail-list">
              <div className="service-modal-rates-row">
                {(service.rateGroups ?? [{ label: 'Rates', lines: rateLines }]).map((group) => (
                  <div className="contact-modal-detail service-modal-detail-rates" key={group.label}>
                    <dt>{group.label}</dt>
                    <dd>
                      {group.lines.map((line) => (
                        <RateLine key={line} line={line} />
                      ))}
                    </dd>
                  </div>
                ))}
              </div>

              <div className="contact-modal-detail service-modal-detail-walk">
                <dt>The Walk</dt>
                <dd>
                  <p className="contact-modal-detail-value">{service.copy}</p>
                  {service.details?.map((line) => (
                    <p key={line} className="contact-modal-detail-note">{line}</p>
                  ))}
                </dd>
              </div>

              {service.notes && service.notes.length > 0 && (
                <div className="contact-modal-detail service-modal-detail-notes">
                  <dt>Good to Know</dt>
                  <dd>
                    {service.notes.map((line) => (
                      <p key={line} className="contact-modal-detail-note">{line}</p>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A leading price ("$33", "$100–110") and the terms after it. */
const RATE_PATTERN = /^(\$[\d.,]+(?:[–-]\d+)?)\s+(.+)$/;

/**
 * One rate line with the price as the first read: the amount set large in the
 * display face, its terms small beneath. A line with no leading price
 * ("Rates cover both dogs walking together.") stays a plain note.
 */
function RateLine({ line }: { line: string }) {
  const match = RATE_PATTERN.exec(line);
  if (!match) return <p className="contact-modal-detail-note">{line}</p>;
  return (
    <p className="service-modal-rate">
      {/* A range ("$100–110") is twice as wide as a single price, so it
          takes a smaller scale to fit the same panel (globals.css). */}
      <span className={`service-modal-rate-amount${match[1].length > 4 ? ' service-modal-rate-amount-range' : ''}`}>
        {match[1]}
      </span>
      <span className="service-modal-rate-terms">{match[2]}</span>
    </p>
  );
}
