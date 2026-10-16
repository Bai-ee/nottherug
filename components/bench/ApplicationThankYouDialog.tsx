'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SUCCESS_MESSAGE } from '@/lib/bench/contract';
import { useScrollLock } from '@/components/marketing/hooks/useScrollLock';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Shown when the application saved but the resume upload did not. */
  resumeNote?: string;
};

/**
 * Thank-you shown over the page once a walker application is saved, so the
 * applicant gets a clear confirmation instead of a form that quietly turned
 * into a note. Portalled to <body>; focus, Escape and the scroll lock follow
 * TeamMemberDialog.
 */
export default function ApplicationThankYouDialog({ open, onClose, resumeNote }: Props) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<ThankYouSheet onClose={onClose} resumeNote={resumeNote} />, document.body);
}

function ThankYouSheet({ onClose, resumeNote }: { onClose: () => void; resumeNote?: string }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useScrollLock(true);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        frameRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
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
  }, [onClose]);

  return (
    <div
      id="walker-application-thank-you"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walker-application-thank-you-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`
        #walker-application-thank-you {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: rgba(28, 28, 26, 0.55);
          animation: walkerThankYouIn 0.18s cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        @keyframes walkerThankYouIn { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { #walker-application-thank-you { animation: none; } }
        #walker-application-thank-you-panel {
          position: relative;
          width: 100%;
          max-width: 480px;
          max-height: calc(100dvh - 48px);
          overflow-y: auto;
          background: var(--warm-white) url('/textures/paper-grain.png');
          background-size: 300px 300px;
          border: 1px solid var(--ink);
          border-radius: var(--radius);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
          padding: clamp(24px, 4vw, 36px);
          color: var(--ink);
        }
        #walker-application-thank-you-title {
          font-family: var(--font-display);
          margin: 14px 0 10px;
        }
        #walker-application-thank-you-body { color: var(--mid-gray); margin: 0 0 22px; line-height: 1.55; }
        #walker-application-thank-you-close-x {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(36, 35, 33, 0.25);
          border-radius: 4px;
          background: transparent;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          color: var(--ink);
        }
      `}</style>
      <div id="walker-application-thank-you-panel" ref={frameRef}>
        <button
          type="button"
          id="walker-application-thank-you-close-x"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <span className="stamp-label">Application received</span>
        <h2 id="walker-application-thank-you-title">You&apos;re on our list.</h2>
        <p id="walker-application-thank-you-body">{SUCCESS_MESSAGE}</p>
        {resumeNote ? <p className="form-note form-alert">{resumeNote}</p> : null}
        <button
          ref={closeButtonRef}
          type="button"
          id="walker-application-thank-you-done-btn"
          className="btn btn-primary btn-accent"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}
