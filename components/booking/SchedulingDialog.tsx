'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@/lib/analytics/track';
import { buildCalendlyEmbedUrl } from '@/lib/booking/calendlyEmbedUrl';
import { isVerifiedCalendlyBookingEvent } from '@/lib/analytics/verifiedOrigin';

type Props = {
  open: boolean;
  onClose: () => void;
  calendlyUrl: string;
  /** Which surface opened the scheduler; the only field sent with its events. */
  source: string;
  /**
   * Invoked exactly once per attempt, and only for a scheduling message that
   * passes BOTH checks in isVerifiedCalendlyBookingEvent: Calendly's origin
   * AND this dialog's own iframe window. Never inferred from the dialog
   * merely being open — the welcome modal's booked confirmation hangs off
   * this callback, so a looser check here would let any page post a fake
   * booking into it.
   */
  onBooked?: () => void;
  /** A changed value starts a NEW attempt: the completion dedupe resets. */
  attemptId?: string;
  /**
   * Small caps line above the title. Defaults to "Step 2 of 2", true of the
   * questionnaire-first flow this dialog was built for (form, then
   * scheduler). The welcome modal opens it as its own second step with a
   * confirmation still to come, so it passes its own label instead.
   */
};

/**
 * track() is documented as best-effort/never-throwing, but this dialog runs
 * inside a raw window 'message' listener, where an uncaught throw would
 * surface as a console error for every real visitor. Every track() call in
 * this file goes through this wrapper.
 */
function safeTrack(name: Parameters<typeof track>[0], payload?: Parameters<typeof track>[1]) {
  try {
    track(name, payload);
  } catch (err) {
    console.warn('[booking] analytics call failed', err);
  }
}

/**
 * Turns one verified Calendly message into exactly one appointment_completed
 * event (and one onBooked call). `hasFired` is owned by the caller (a ref) so
 * dedupe survives the dialog being closed and reopened inside the same
 * attempt — Calendly can post the same event_scheduled message more than once
 * for a single real booking. Reads nothing from event.data beyond what the
 * verifier inspects: that payload carries the visitor's name and email, and
 * none of it is forwarded anywhere — the event carries only `source`.
 * Exported, free of component state, so it can be unit-tested.
 */
export function createAppointmentCompletionHandler(
  source: string,
  getIframeWindow: () => Window | null,
  hasFired: { current: boolean },
  onBooked?: () => void,
) {
  return function handleCalendlyMessage(event: MessageEvent) {
    if (hasFired.current) return;
    if (!isVerifiedCalendlyBookingEvent(event, getIframeWindow())) return;
    hasFired.current = true;
    safeTrack('appointment_completed', { source });
    if (!onBooked) return;
    try {
      onBooked();
    } catch (err) {
      // A caller's callback must never take this listener down with it.
      console.warn('[booking] onBooked callback failed', err);
    }
  };
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export default function SchedulingDialog({ open, onClose, calendlyUrl, source, onBooked, attemptId }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Persists for the dialog's whole mount lifetime by default; the effect
  // below is the one exception, for a genuinely new attempt.
  const bookingObservedRef = useRef(false);
  const attemptIdRef = useRef(attemptId);

  useEffect(() => {
    if (attemptId !== undefined && attemptId !== attemptIdRef.current) {
      bookingObservedRef.current = false;
    }
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  // Opening the scheduler is not a booked appointment — this records only
  // that the dialog was shown. Completion is reported separately, below, and
  // only from a verified Calendly message.
  useEffect(() => {
    if (open) safeTrack('scheduling_dialog_opened', { source });
  }, [open, source]);

  // Only listens while the dialog (and its iframe) are actually mounted;
  // always removed on close or unmount.
  useEffect(() => {
    if (!open) return;
    const handleMessage = createAppointmentCompletionHandler(
      source,
      () => iframeRef.current?.contentWindow ?? null,
      bookingObservedRef,
      onBooked,
    );
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, source, onBooked]);

  // Lock body scroll while open, restore it (and the page's scroll position) on close.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    // Matches the reduced-motion branch SiteNav's hash-scroll already uses:
    // an instant jump still needs to happen (the dialog renders at the top of
    // the viewport), it just shouldn't animate there.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' } as ScrollToOptions);
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [open]);

  // Focus trap + Escape-to-close + restore focus to whatever opened the dialog.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const container = dialogRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
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
      id="calendly-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Schedule your Meet and Greet"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28,28,26,0.82)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(8px, 2vw, 24px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        #calendly-modal-shell { max-height: 95vh; }
        @media (max-width: 767px) {
          #calendly-modal {
            align-items: flex-start !important;
            padding: 0 !important;
          }
          #calendly-modal-shell {
            width: 100vw !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            min-height: 100dvh;
            border-radius: 0 !important;
            border: none !important;
          }
          #calendly-modal-iframe { min-height: 75vh; }
        }
      `}</style>
      <div
        ref={dialogRef}
        id="calendly-modal-shell"
        style={{
          background: 'var(--paper)',
          borderRadius: '4px',
          border: '1px solid var(--olive)',
          width: '96vw',
          height: '95vh',
          maxWidth: '1400px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <div
          id="calendly-modal-header"
          style={{
            padding: '16px clamp(16px, 3vw, 26px)',
            // The same olive band the site nav wears, so the scheduler reads
            // as a room in this house rather than a third-party window.
            background: 'var(--olive)',
            color: 'var(--paper)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          {/* The mark alone: the band already says where you are, and a
              heading repeating the button you just pressed is noise. */}
          <img
            id="calendly-modal-logo"
            src="/img/horiz_logo_off_white.png"
            alt="Not The Rug"
            style={{ height: 'clamp(26px, 3.2vw, 34px)', width: 'auto', display: 'block' }}
          />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="btn btn-primary booking-forward-btn btn-sm btn-accent"
            style={{
              // The only thing the shared button styling does not cover: a
              // comfortable tap target on a phone.
              minHeight: '44px',
              minWidth: '44px',
              flexShrink: 0,
            }}
          >
            Close ×
          </button>
        </div>
        <iframe
          ref={iframeRef}
          id="calendly-modal-iframe"
          title="Calendly scheduling"
          src={buildCalendlyEmbedUrl(
            calendlyUrl,
            typeof window === 'undefined' ? undefined : window.location.hostname,
          )}
          style={{ flex: 1, width: '100%', border: 'none', background: 'var(--paper)' }}
        />
      </div>
    </div>,
    document.body
  );
}
