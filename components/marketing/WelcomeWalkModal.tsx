'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  GROUP_WALK_PREVIEW,
  GROUP_WALK_SHORT_LABEL,
  GROUP_WALK_FIRST_WALK_PRICE,
  FIRST_WALK_PROMO_LINE,
  FIRST_WALK_PROMO_BADGE,
  FIRST_WALK_TAX_NOTE,
} from '@/lib/content/services';
import { isValidEmail } from '@/lib/leads/validation';
import {
  createOnboardingHandoff,
  clearOnboardingHandoff,
  getOnboardingHandoffStorage,
  newOnboardingAttemptId,
  writeOnboardingHandoff,
  ONBOARDING_SCOPE_PARAM,
  ONBOARDING_SCOPE_VALUE,
} from '@/lib/booking/onboarding-handoff';
import SchedulingDialog from '@/components/booking/SchedulingDialog';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';
import {
  WELCOME_MODAL_DELAY_MS,
  hasSeenWelcomeModal,
  markWelcomeModalSeen,
  type WelcomeModalStorage,
} from '@/lib/marketing/welcome-modal';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MODAL_SOURCE = 'welcome-modal';

/**
 * cta_click, best effort. track() is documented as never throwing, but a
 * violation of that contract must never block the navigation or view change
 * this fires alongside. Only the locked id travels — never a typed value.
 */
function trackCta(cta: CtaId) {
  try {
    track('cta_click', { cta });
  } catch (err) {
    console.warn('[analytics] cta_click failed', err);
  }
}

/**
 * The Group Walk illustration from the product carousel in
 * components/AnimatedServiceCards.tsx (CARDS[2]), blown up to fill the left
 * column instead of sitting in that component's 150px stage.
 */
const GROUP_WALK_CARD = {
  topLayer: { src: '/img/3Top.png', ratio: 238 / 499 },
} as const;

/** Brooklyn Bridge / Manhattan skyline collage — the walk's backdrop. */
const SKYLINE_IMAGE = '/img/bg_section_graphic_1.png';

/** Same circular seal as the home page's floating badge. */
const LOGO_BADGE = '/logos/notRugGreen.png';

/** The one area served — shown locked, never asked. */
const SERVICE_AREA_LABEL = 'Williamsburg, Brooklyn only';

/**
 * `?welcome=1` forces the modal open immediately and does NOT mark it seen —
 * the way to review it in a production build, where the once-per-browser
 * gate otherwise hides it after the first visit. Display only: it changes
 * nothing about what is captured or where it is sent.
 */
const FORCE_PARAM = 'welcome';

/**
 * Any element on the page can open this modal by dispatching this event —
 * the home hero's primary CTA does. Kept as a DOM event so callers don't need
 * a shared provider or a lifted state hook just to pop the sheet.
 */
const OPEN_EVENT = 'ntr:open-welcome-modal';

/** Opens the welcome modal from anywhere on the page. */
export function openWelcomeWalkModal() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

function isForced(): boolean {
  try {
    return new URLSearchParams(window.location.search).get(FORCE_PARAM) === '1';
  } catch {
    return false;
  }
}

/** localStorage access itself can throw when site data is blocked. */
function readStorage(): WelcomeModalStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Appends the visitor's email (and hide_gdpr_banner) to the configured
 * Calendly URL — the one place this modal ever puts the email anywhere
 * outside browser storage. Falls back to plain string concatenation if the
 * configured URL somehow isn't parseable, so a malformed env value degrades
 * gracefully instead of throwing during render.
 */
function buildCalendlyEmailUrl(base: string, email: string): string {
  try {
    const url = new URL(base);
    url.searchParams.set('email', email);
    url.searchParams.set('hide_gdpr_banner', '1');
    return url.toString();
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}email=${encodeURIComponent(email)}&hide_gdpr_banner=1`;
  }
}

const ONBOARDING_BOOK_HREF = `/book?${ONBOARDING_SCOPE_PARAM}=${ONBOARDING_SCOPE_VALUE}`;

type View = 'gate' | 'scheduler' | 'confirmation';

/**
 * Booking-first entry point: email-only gate → Calendly (free Meet & Greet)
 * → verified-completion confirmation → optional questionnaire handoff to
 * /book. Ported from the standalone design-review worktree
 * (NotTheRug-welcome-modal) and reworked per
 * plans/005-booking-first-onboarding.md: the name/phone inputs are gone, the
 * neighborhood row is a locked display only, and the modal never puts a
 * contact detail in a site URL — see lib/booking/onboarding-handoff.ts for
 * the short-lived, sessionStorage-only draft this hands off to /book.
 *
 * Shown once per browser: lib/marketing/welcome-modal.ts owns that rule.
 * SchedulingDialog owns its own focus trap/scroll lock while it's open; this
 * component suspends its own (see `welcomeDialogVisible` below) so only one
 * is ever active at a time.
 */
export default function WelcomeWalkModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('gate');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Set by the OPEN_EVENT handler and by every dismissal path below. Guards
  // the delayed first-visit timer: without this, a visitor who opens the
  // modal manually (hero CTA) and dismisses it before WELCOME_MODAL_DELAY_MS
  // elapses would see it pop back open uninvited when the timer fires —
  // acceptance scenario 15 requires the reopen to stay deliberate. Never
  // read by the once-per-browser localStorage gate or the `?welcome=1` force
  // path, which are unaffected by anything that happens within a session.
  const interactedRef = useRef(false);

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || '';
  // The scheduler owns the focus trap/scroll lock while it's open — this
  // dialog's own effects below are suspended for that phase so only one of
  // the two is ever active, per plans/005 "one active dialog at a time".
  const welcomeDialogVisible = open && view !== 'scheduler';

  useEffect(() => {
    const forced = isForced();
    const storage = readStorage();
    if (!forced && hasSeenWelcomeModal(storage)) return;
    const timer = window.setTimeout(
      () => {
        // Only the natural delayed auto-open is guarded — a visitor who
        // already opened (or dismissed) the modal this session made a
        // deliberate choice the timer must not override.
        if (!forced && interactedRef.current) return;
        if (!forced) markWelcomeModalSeen(storage);
        setOpen(true);
      },
      forced ? 0 : WELCOME_MODAL_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, []);

  /**
   * Manual opens (the hero CTA) bypass the first-visit gate entirely: they
   * neither check nor set the once-per-browser flag, so a visitor who already
   * dismissed the popup can still pull it back up from the button. Whatever
   * phase/email the visitor had left it in is preserved.
   */
  useEffect(() => {
    function handleOpenRequest() {
      interactedRef.current = true;
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, handleOpenRequest);
    return () => window.removeEventListener(OPEN_EVENT, handleOpenRequest);
  }, []);

  /**
   * Freeze the page behind the modal. `overflow: hidden` on <body> alone is
   * not enough here — globals.css sets `html { overflow-x: hidden }`, which
   * makes <html> the scrolling element in some browsers, and touch scrolling
   * ignores it either way. Pinning the body at its current offset stops both,
   * and the offset is restored on close so the visitor keeps their place.
   */
  useEffect(() => {
    if (!welcomeDialogVisible) return;
    const { body, documentElement: html } = document;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [welcomeDialogVisible]);

  // Focus trap + Escape-to-close + focus restore. Re-runs every time this
  // dialog (re)becomes the visible one — including gate ↔ confirmation
  // transitions, since those always pass through `welcomeDialogVisible`
  // flipping false (scheduler phase) then true again.
  useEffect(() => {
    if (!welcomeDialogVisible) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        interactedRef.current = true;
        setOpen(false);
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
  }, [welcomeDialogVisible]);

  /** Opens the scheduler for a validated email — the Book-Luis CTA and "Pick a time" share this. */
  function openScheduler() {
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('Please enter your email.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      setFieldError('Please enter a valid email address.');
      return;
    }
    setFieldError('');
    const id = newOnboardingAttemptId();
    setAttemptId(id);
    const handoff = createOnboardingHandoff({
      email: trimmed,
      source: MODAL_SOURCE,
      attemptId: id,
      bookingObserved: false,
    });
    // Best-effort: a storage failure here must never block opening the
    // scheduler (plans/005 handoff rules).
    if (handoff) writeOnboardingHandoff(getOnboardingHandoffStorage(), handoff);
    trackCta('welcome_modal_schedule');
    setView('scheduler');
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    openScheduler();
  }

  /**
   * Scheduler dismissed (X / Escape / backdrop) without a verified booking.
   * Stable identity: passed directly as SchedulingDialog's `onClose`, which
   * sits in that dialog's Escape/focus-trap effect dependency array — a new
   * function every render would detach/reattach that listener on every
   * render of this component.
   */
  const handleSchedulerDismiss = useCallback(() => {
    setView('gate');
  }, []);

  /**
   * Verified completion — fires exactly once per attempt, from
   * SchedulingDialog. Stable identity: passed directly as `onBooked`, which
   * sits in that dialog's message-listener effect dependency array — a new
   * function every render would detach/reattach the `window.addEventListener('message', ...)`
   * listener on every render of this component, not just on real state changes.
   */
  const handleBooked = useCallback(() => {
    if (attemptId) {
      const handoff = createOnboardingHandoff({
        email: email.trim(),
        source: MODAL_SOURCE,
        attemptId,
        bookingObserved: true,
      });
      if (handoff) writeOnboardingHandoff(getOnboardingHandoffStorage(), handoff);
    }
    setView('confirmation');
  }, [attemptId, email]);

  /** "Answer questions first" — available at the missing-scheduler gate and after abandonment. */
  function goAnswerQuestions() {
    const trimmed = email.trim();
    const id = attemptId ?? newOnboardingAttemptId();
    if (!attemptId) setAttemptId(id);
    const handoff = createOnboardingHandoff({
      email: trimmed,
      source: MODAL_SOURCE,
      attemptId: id,
      bookingObserved: false,
    });
    if (handoff) writeOnboardingHandoff(getOnboardingHandoffStorage(), handoff);
    interactedRef.current = true;
    setOpen(false);
    trackCta('welcome_modal_details');
    router.push(ONBOARDING_BOOK_HREF);
  }

  /** "Tell us about your dog" from the confirmation panel. */
  function goDetailsAfterBooking() {
    if (attemptId) {
      const handoff = createOnboardingHandoff({
        email: email.trim(),
        source: MODAL_SOURCE,
        attemptId,
        bookingObserved: true,
      });
      if (handoff) writeOnboardingHandoff(getOnboardingHandoffStorage(), handoff);
    }
    interactedRef.current = true;
    setOpen(false);
    router.push(ONBOARDING_BOOK_HREF);
  }

  /** "Finish for now" — ends the flow: clears the draft and resets to a fresh gate. */
  function finishForNow() {
    clearOnboardingHandoff(getOnboardingHandoffStorage());
    interactedRef.current = true;
    setOpen(false);
    setView('gate');
    setAttemptId(null);
  }

  function handleDismiss() {
    interactedRef.current = true;
    setOpen(false);
  }

  if (!open || typeof document === 'undefined') return null;

  return (
    <>
      {welcomeDialogVisible &&
        createPortal(
          <div
            id="welcome-walk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-walk-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleDismiss();
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(28,28,26,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(12px, 3vw, 32px)',
              overflowY: 'auto',
              animation: 'welcomeModalFade 0.25s ease both',
            }}
          >
            <style>{`
              @keyframes welcomeModalFade { from { opacity: 0; } to { opacity: 1; } }
              @keyframes welcomeModalRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
              #welcome-walk-modal-shell { animation: welcomeModalRise 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
              /* Home hero headline treatment (.hero-h1), deliberately oversized.
                 Sized in container units against the heading panel — not vw — so the
                 line fits the COLUMN it lives in and never wraps to two lines. */
              #welcome-walk-modal-heading-panel { container-type: inline-size; }
              #welcome-walk-modal-title {
                font-size: min(7.9cqw, 56px);
                margin: 0;
                white-space: nowrap;
              }
              /* Left column: skyline collage behind, the carousel card's walker
                 illustration across the full panel width. Static — no hover. */
              #welcome-walk-modal-art-panel {
                position: relative;
                min-height: 300px;
                overflow: hidden;
                background:
                  linear-gradient(rgba(247,241,227,0.30), rgba(247,241,227,0.04)),
                  url('${SKYLINE_IMAGE}') center 45%/cover no-repeat,
                  var(--warm-white);
                border-right: 1px solid rgba(36,35,33,0.12);
              }
              /* Circular seal, top of the art column. */
              #welcome-walk-modal-art-badge {
                position: absolute;
                top: 8%;
                left: 50%;
                /* Square by construction: one dimension drives, the other follows,
                   and object-fit: contain overrides the global img{object-fit:cover}
                   so the seal is never cropped or stretched. */
                width: min(74%, 326px);
                height: auto;
                aspect-ratio: 1 / 1;
                object-fit: contain;
                border-radius: 50%;
                box-shadow: 0 4px 14px rgba(35, 31, 24, 0.3);
                transform: translateX(-50%) rotate(-4deg);
                z-index: 2;
                pointer-events: none;
              }
              #welcome-walk-modal-art-walker {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                height: auto;
                filter: drop-shadow(0 6px 14px rgba(35,31,24,0.22));
              }
              /* The modal is a condensed instance of the home intake sheet: same
                 styling, roughly 30% smaller type and spacing so it fits a popup. */
              #welcome-walk-modal-sheet .booking-form-body { padding: clamp(14px, 1.8vw, 20px); }
              /* Fields are deliberately NOT shrunk here: this sheet is the same
                 intake surface as the home page's, so its inputs keep the
                 global .form-control box (13px 16px / 14px) and the same
                 stamp-label size. A popup-only smaller field made the two
                 read as different components. */
              #welcome-walk-modal-sheet .form-group { gap: 6px; }
              #welcome-walk-modal-sheet .form-group label,
              #welcome-walk-modal-sheet .form-group .welcome-walk-modal-field-caption { font-size: 12px; letter-spacing: 0.12em; }
              /* Two id selectors (specificity 2,0,0) — deliberately, not !important —
                 to beat globals.css's #welcome-walk-modal-sheet .form-control
                 (1,1,0), which would otherwise win its background/border-style
                 for this element despite being declared earlier. */
              #welcome-walk-modal-sheet #welcome-walk-modal-neighborhood-display {
                cursor: default;
                color: var(--muted-ink);
                background: rgba(36, 35, 33, 0.05);
                border-style: dashed;
              }
              #welcome-walk-modal-sheet .form-note { font-size: 10px; margin-top: 6px; }
              #welcome-walk-modal-sheet .btn { padding: 8px 16px; font-size: 12px; }
              #welcome-walk-modal-sheet .btn-ghost { padding: 8px 0; }
              /* Dismiss, not a forward action: no .btn-ghost arrow, underlined. */
              #welcome-walk-modal-cta-secondary {
                text-decoration: underline;
                text-underline-offset: 5px;
              }
              #welcome-walk-modal-cta-secondary::after { content: none; }
              #welcome-walk-modal-package-line h3,
              #welcome-walk-modal-package-line .svc-price { font-size: 19px !important; }
              /* Promo row — the card's headline row at modal scale. */
              #welcome-walk-modal-promo-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
              }
              #welcome-walk-modal-promo-line {
                font-family: var(--font-stamp);
                font-size: 12px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: var(--olive);
                margin: 0;
              }
              #welcome-walk-modal-promo-row .phase-tag {
                font-size: 11px;
                padding: 2px 9px;
                margin-bottom: 0;
              }
              /* Struck full price sits over the discounted one, right-aligned,
                 matching #home-group-walk-feature-price-block. */
              #welcome-walk-modal-price-block {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 1px;
                text-align: right;
              }
              #welcome-walk-modal-was-row {
                display: flex;
                align-items: baseline;
                gap: 5px;
              }
              #welcome-walk-modal-was {
                font-family: var(--font-type);
                font-size: 12px;
                color: var(--mid-gray);
                text-decoration: line-through;
                line-height: 1;
              }
              #welcome-walk-modal-unit {
                font-family: var(--font-body);
                font-size: 12px;
                color: var(--mid-gray);
                line-height: 1;
              }
              #welcome-walk-modal-now { margin: 0; line-height: 1; }
              #welcome-walk-modal-tax-note {
                font-family: var(--font-type);
                font-size: 10px;
                color: var(--mid-gray);
                text-align: right;
                margin: 4px 0 0;
              }
              #welcome-walk-modal-fields { gap: 8px !important; }
              /* Padding lives here, not inline: the stacked layout needs to override
                 the bottom value, and an inline shorthand cannot be overridden. */
              #welcome-walk-modal-bar-panel {
                padding: clamp(14px, 2.2vw, 20px) clamp(16px, 2.4vw, 24px) 0;
              }
              @media (max-width: 767px) {
                #welcome-walk-modal-shell {
                  grid-template-columns: 1fr !important;
                  grid-template-areas: 'bar' 'art' 'head' 'form' !important;
                }
                #welcome-walk-modal-art-panel { border-right: none; border-block: 1px solid rgba(36,35,33,0.12); }
                #welcome-walk-modal-art-panel { min-height: 150px; }
                #welcome-walk-modal-art-badge {
                  top: 50%;
                  left: 50%;
                  /* Just under the strip's height; width follows from aspect-ratio 1/1. */
                  height: 78%;
                  width: auto;
                  transform: translate(-50%, -50%) rotate(-4deg);
                }
                #welcome-walk-modal-art-walker {
                  /* Centre point pulled 15% of the strip width to the left. */
                  left: 35%;
                  right: auto;
                  /* Double height, feet on the strip's floor — the slight negative
                     offset absorbs the transparent padding under the figure in the
                     source PNG, which otherwise reads as floating. */
                  bottom: -43%;
                  height: 200%;
                  width: auto;
                  transform: translateX(-50%);
                }
                #welcome-walk-modal-cta-row { justify-content: center !important; }
                /* Stacked only: the stamp bar sits above the art strip and needs the
                   same OPTICAL gap the headline has below it. The headline's 10px
                   padding renders larger because the Bebas line box adds leading
                   above the caps, so the bar carries a bigger number to match. */
                #welcome-walk-modal-bar-panel { padding-bottom: 15px; }
              }
              @media (prefers-reduced-motion: reduce) {
                #welcome-walk-modal, #welcome-walk-modal-shell { animation: none !important; }
                #welcome-walk-modal .welcome-walk-modal-cta { transition: none !important; }
              }
            `}</style>

            <div
              ref={dialogRef}
              id="welcome-walk-modal-shell"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)',
                gridTemplateRows: 'auto auto 1fr',
                gridTemplateAreas: '"art bar" "art head" "art form"',
                width: '100%',
                maxWidth: '820px',
                maxHeight: '92dvh',
                background: 'var(--warm-white)',
                border: '1px solid var(--ink)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
              }}
            >
              <div id="welcome-walk-modal-art-panel" style={{ gridArea: 'art' }}>
                <img id="welcome-walk-modal-art-badge" src={LOGO_BADGE} alt="Not The Rug" />
                <img
                  id="welcome-walk-modal-art-walker"
                  src={GROUP_WALK_CARD.topLayer.src}
                  alt="Illustration of a Not The Rug walker out with three dogs"
                />
              </div>

              <div id="welcome-walk-modal-bar-panel" style={{ gridArea: 'bar' }}>
                <div
                  id="welcome-walk-modal-header"
                  style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}
                >
                  <span className="stamp-label" id="welcome-walk-modal-area-stamp">
                    Serving Williamsburg
                  </span>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label="Close"
                    id="welcome-walk-modal-close"
                    onClick={handleDismiss}
                    style={{
                      flexShrink: 0,
                      border: '1px solid var(--light-gray)',
                      borderRadius: '4px',
                      background: 'transparent',
                      color: 'var(--mid-gray)',
                      fontSize: '16px',
                      lineHeight: 1,
                      padding: '6px 10px',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div id="welcome-walk-modal-heading-panel" style={{ gridArea: 'head', padding: '10px clamp(16px, 2.4vw, 24px) 0' }}>
                {view !== 'confirmation' && (
                  <h2 id="welcome-walk-modal-title" className="hero-h1">
                    Book your free <em>Meet &amp; Greet</em>
                  </h2>
                )}
              </div>

              <div
                id="welcome-walk-modal-form-panel"
                style={{
                  gridArea: 'form',
                  padding: '10px clamp(16px, 2.4vw, 24px) clamp(16px, 2.4vw, 24px)',
                  overflowY: 'auto',
                }}
              >
                {view === 'confirmation' ? (
                  <div id="welcome-walk-modal-confirmation-panel" className="booking-form">
                    <div className="booking-form-body">
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(19px, 2.4vw, 23px)', margin: '0 0 8px' }}>
                        Your free Meet &amp; Greet is booked
                      </h3>
                      <p className="form-note" style={{ margin: '0 0 16px' }}>
                        Check your inbox. Your Calendly confirmation email has the date and time.
                      </p>
                      <div
                        id="welcome-walk-modal-cta-row"
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'center',
                          gap: '20px',
                          flexWrap: 'wrap',
                          borderTop: '1px dashed var(--light-gray)',
                          paddingTop: '14px',
                          marginTop: '2px',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost"
                          id="welcome-walk-modal-cta-secondary"
                          onClick={finishForNow}
                        >
                          Finish for now
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          id="welcome-walk-modal-cta-details"
                          onClick={goDetailsAfterBooking}
                        >
                          Tell us about your dog
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form id="welcome-walk-modal-form" onSubmit={handleFormSubmit} noValidate>
                    <div id="welcome-walk-modal-sheet" className="booking-form">
                      <div className="booking-form-body">
                        {/* Same first-walk promo the featured rate card runs
                            (#home-group-walk-feature-headline-row): promo line,
                            -20% tag, struck full price over the discounted one.
                            Both read the figures from lib/content/services.ts. */}
                        <div id="welcome-walk-modal-promo-row">
                          <p id="welcome-walk-modal-promo-line">{FIRST_WALK_PROMO_LINE}</p>
                          <span className="phase-tag">{FIRST_WALK_PROMO_BADGE}</span>
                        </div>
                        <div
                          id="welcome-walk-modal-package-line"
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            gap: '16px',
                            flexWrap: 'wrap',
                            borderBottom: '1px solid rgba(36, 35, 33, 0.18)',
                            paddingBottom: '10px',
                            marginBottom: '4px',
                          }}
                        >
                          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(19px, 2.4vw, 23px)', margin: 0 }}>
                            {GROUP_WALK_SHORT_LABEL}
                          </h3>
                          <div id="welcome-walk-modal-price-block">
                            <div id="welcome-walk-modal-was-row">
                              <span id="welcome-walk-modal-was">{GROUP_WALK_PREVIEW.price}</span>
                              <span id="welcome-walk-modal-unit">{GROUP_WALK_PREVIEW.priceUnit}</span>
                            </div>
                            <div className="svc-price" id="welcome-walk-modal-now">
                              ${GROUP_WALK_FIRST_WALK_PRICE}
                            </div>
                          </div>
                        </div>
                        <p id="welcome-walk-modal-tax-note">{FIRST_WALK_TAX_NOTE}</p>
                        <p id="welcome-walk-modal-rate-fineprint" className="form-note" style={{ margin: '0 0 12px' }}>
                          This is your free Meet &amp; Greet. The rate above applies to walks booked after it.
                        </p>

                        <div id="welcome-walk-modal-fields" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          <div className="form-group">
                            <label htmlFor="welcome-walk-modal-email-input">Email Address</label>
                            <input
                              id="welcome-walk-modal-email-input"
                              className="form-control"
                              type="email"
                              autoComplete="email"
                              inputMode="email"
                              placeholder="you@email.com"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                if (fieldError) setFieldError('');
                              }}
                            />
                          </div>
                          <div className="form-group">
                            {/* Not a <label htmlFor>: this row is deliberately not an
                                <input> (see below), so there is no form control for a
                                "for" attribute to reference. Styled to match the email
                                field's label via .welcome-walk-modal-field-caption. */}
                            <span
                              className="welcome-walk-modal-field-caption"
                              style={{ fontWeight: 500 }}
                            >
                              Neighborhood
                            </span>
                            {/* Display only — never an <input>, never read for
                                submission, never sent anywhere. The one thing this row
                                does is tell the visitor which area is served; it never
                                becomes a new neighborhood option. */}
                            <div
                              id="welcome-walk-modal-neighborhood-display"
                              className="form-control"
                              aria-label={`Neighborhood: ${SERVICE_AREA_LABEL}`}
                              title="Williamsburg is the only neighborhood we serve"
                            >
                              {SERVICE_AREA_LABEL}
                            </div>
                          </div>
                        </div>

                        {!calendlyUrl && (
                          <p id="welcome-walk-modal-unavailable-note" className="form-note" style={{ marginTop: '10px' }}>
                            Online scheduling is temporarily unavailable. Answer a few quick questions instead and
                            we&apos;ll set up your free Meet &amp; Greet by hand.
                          </p>
                        )}

                        {fieldError && (
                          <p
                            id="welcome-walk-modal-field-error"
                            role="alert"
                            className="form-note"
                            style={{ color: '#c0392b', textAlign: 'left' }}
                          >
                            ⚠️ {fieldError}
                          </p>
                        )}

                        <div
                          id="welcome-walk-modal-cta-row"
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            gap: '20px',
                            flexWrap: 'wrap',
                            borderTop: '1px dashed var(--light-gray)',
                            paddingTop: '14px',
                            marginTop: '2px',
                          }}
                        >
                          {!calendlyUrl ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                id="welcome-walk-modal-cta-secondary"
                                onClick={handleDismiss}
                              >
                                No Thanks
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                id="welcome-walk-modal-cta-details"
                                onClick={goAnswerQuestions}
                              >
                                Answer questions first
                              </button>
                            </>
                          ) : attemptId ? (
                            <>
                              <button type="submit" className="btn btn-primary btn-accent" id="welcome-walk-modal-cta-primary">
                                Pick a time
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                id="welcome-walk-modal-cta-details"
                                onClick={goAnswerQuestions}
                              >
                                Answer questions first
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                id="welcome-walk-modal-cta-secondary"
                                onClick={handleDismiss}
                              >
                                No Thanks
                              </button>
                              <button type="submit" className="btn btn-primary btn-accent" id="welcome-walk-modal-cta-primary">
                                Contact Luis, to Get Started
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/*
        Always mounted (when a scheduler URL is configured) so its own effects
        can run for exactly the `view === 'scheduler'` phase; `open={false}`
        makes it render nothing the rest of the time, same pattern as
        BookingForm's own SchedulingDialog usage. Never rendered at all when
        NEXT_PUBLIC_CALENDLY_URL is missing/empty — there is deliberately no
        path from this component into a scheduler that would open nothing.
      */}
      {calendlyUrl && (
        <SchedulingDialog
          open={open && view === 'scheduler'}
          onClose={handleSchedulerDismiss}
          calendlyUrl={buildCalendlyEmailUrl(calendlyUrl, email.trim())}
          // Labels this dialog's analytics (scheduling_dialog_opened,
          // appointment_completed) as the welcome modal's scheduler — the same
          // label the lead handoff already carries.
          source={MODAL_SOURCE}
          // Not "step 2 of 2": in this flow the scheduler is followed by a
          // confirmation, and the questionnaire after it is optional.
          eyebrow="Pick your time"
          onBooked={handleBooked}
          attemptId={attemptId ?? undefined}
        />
      )}
    </>
  );
}
