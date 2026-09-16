'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@/lib/analytics/track';
import { isVerifiedCalendlyBookingEvent } from '@/lib/analytics/verifiedOrigin';

type Props = {
  open: boolean;
  onClose: () => void;
  calendlyUrl: string;
  source: string;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * track() is documented as best-effort/never-throwing, but this dialog must
 * not be able to break the booking flow it's shown from because that
 * contract was violated (plans/004-frontend-tracking-coverage.md T4 item 6).
 * Every track() call in this file goes through this wrapper.
 */
function safeTrack(name: Parameters<typeof track>[0], payload?: Parameters<typeof track>[1]) {
  try {
    track(name, payload);
  } catch (err) {
    console.warn('[booking] analytics call failed', err);
  }
}

/**
 * Builds the window "message" handler that turns one verified Calendly
 * scheduling event into exactly one appointment_completed call (plans/003
 * A3, decision 9). `hasFired` is owned by the caller (a ref) so dedup
 * survives the dialog being closed and reopened within the same booking
 * attempt — Calendly can post the same event_scheduled message more than
 * once for a single real booking. Never reads anything from `event.data`
 * beyond what isVerifiedCalendlyBookingEvent itself inspects to validate the
 * message — the Calendly payload carries the visitor's name/email, and none
 * of it is forwarded to track(). Exported, state-free of the component, for
 * tests/unit/scheduling-dialog-appointment.test.ts.
 */
export function createAppointmentCompletionHandler(
  source: string,
  getIframeWindow: () => Window | null,
  hasFired: { current: boolean },
) {
  return function handleCalendlyMessage(event: MessageEvent) {
    if (hasFired.current) return;
    if (!isVerifiedCalendlyBookingEvent(event, getIframeWindow())) return;
    hasFired.current = true;
    safeTrack('appointment_completed', { source });
  };
}

export default function SchedulingDialog({ open, onClose, calendlyUrl, source }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Persists for the dialog's whole mount lifetime (not reset on close/
  // reopen) — see createAppointmentCompletionHandler above.
  const appointmentCompletedRef = useRef(false);

  // Opening the scheduler is not a booked appointment — this only records
  // that the dialog was shown. Completion is reported separately, below,
  // only from a verified Calendly postMessage event.
  useEffect(() => {
    if (open) safeTrack('scheduling_dialog_opened', { source });
  }, [open, source]);

  // Real completion, verified against the actual Calendly iframe window —
  // never inferred from the dialog simply being open, and never trusting an
  // unfiltered postMessage. Only active while the dialog (and its iframe)
  // are actually mounted; always removed on close or unmount.
  useEffect(() => {
    if (!open) return;
    const handleMessage = createAppointmentCompletionHandler(
      source,
      () => iframeRef.current?.contentWindow ?? null,
      appointmentCompletedRef,
    );
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, source]);

  // Lock body scroll while open, restore it (and the page's scroll position) on close.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      aria-labelledby="calendly-modal-title"
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
          background: '#f7f5f1',
          borderRadius: '4px',
          border: '1px solid #1c1c1a',
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
            padding: '18px 26px',
            borderBottom: '1px solid #1c1c1a',
            background: '#1c1c1a',
            color: '#EDF3DB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div
              style={{
                fontFamily: 'var(--font-type)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(237,243,219,0.6)',
              }}
            >
              Step 2 of 2
            </div>
            <div
              id="calendly-modal-title"
              style={{
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontSize: 'clamp(16px, 2.4vw, 22px)',
                color: '#EDF3DB',
                letterSpacing: '-0.005em',
                lineHeight: 1.15,
              }}
            >
              Schedule your Meet &amp; Greet
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(237,243,219,0.35)',
              borderRadius: '4px',
              fontFamily: 'var(--font-type)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: '#EDF3DB',
              padding: '8px 14px',
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
          src={calendlyUrl}
          style={{ flex: 1, width: '100%', border: 'none', background: '#f7f5f1' }}
        />
      </div>
    </div>,
    document.body
  );
}
