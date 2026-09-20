'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  GROUP_WALK_PREVIEW,
  GROUP_WALK_FIRST_WALK_PRICE,
  FIRST_WALK_PROMO_LINE,
  FIRST_WALK_PROMO_BADGE,
  FIRST_WALK_TAX_NOTE,
} from '@/lib/content/services';
import { buildBookingPrefillHref } from '@/lib/leads/prefill';
import { isValidEmail } from '@/lib/leads/validation';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';
import { captureLeadEmail } from '@/lib/leads/captureClient';
import { PAW_TRAIL, useGroupWalkCardHover } from './hooks/useGroupWalkCardHover';

const FEATURE_SOURCE = 'services-preview';

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


/** Brooklyn Bridge / Manhattan skyline collage — same backdrop WelcomeWalkModal.tsx uses. */
const SKYLINE_IMAGE = '/img/bg-section-graphic-1.webp';


/**
 * Featured Group Walk card — a wide promo rectangle above the smaller rate
 * cards, with the first-walk discount called out and an inline email + phone
 * capture that hands off to /book prefilled, exactly as the welcome modal
 * does. Field styling is shared with that modal and the home intake sheet
 * (see #home-group-walk-feature-card in globals.css), so the three cannot
 * drift apart.
 *
 * Reuses the walker illustration from the disabled carousel
 * (components/AnimatedServiceCards.tsx CARDS[2]) as plain CSS rather than
 * importing that carousel, which stays off per
 * plans/002-production-readiness.md P2A.
 */
export default function GroupWalkFeatureCard() {
  const router = useRouter();
  // Layered hover choreography ported from the disabled carousel, driven by
  // the CTA below rather than the card as a whole.
  const { cardRef, backdropRef, walkerRef, priceRef, ctaRef, setPawRef, onEnter, onLeave } = useGroupWalkCardHover();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const mail = email.trim();
    const tel = phone.trim();
    if (!mail) {
      setError('Please enter your email.');
      return;
    }
    if (!isValidEmail(mail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!tel) {
      setError('Please enter a phone number.');
      return;
    }
    setError('');
    // Only after BOTH fields validate, so an abandoned or rejected attempt is
    // never counted. The entered email/phone stay in the prefill href and
    // never enter the event payload.
    trackCta('group_walk_card_submit');
    // Fire-and-forget, same rule as above: never blocks the redirect to /book.
    captureLeadEmail(mail, FEATURE_SOURCE);
    router.push(
      buildBookingPrefillHref(
        { email: mail, phone: tel, serviceInterest: GROUP_WALK_PREVIEW.serviceInterest ?? 'Daily Group Walks' },
        FEATURE_SOURCE
      )
    );
  }

  return (
    <div id="home-group-walk-feature-card" ref={cardRef}>
      <style>{`
        /* Border matches the smaller rate cards (.service-card) — hairline ink
           at 12% on paper, no coloured rule. */
        #home-group-walk-feature-card {
          /* #home-rates-preview-row is what clears the paw trail for this whole
             subtree; position:relative stays for the art panel inside. */
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
          align-items: stretch;
          border: 1px solid rgba(36,35,33,0.12);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--warm-white) url('/textures/paper-grain.png');
          background-size: 300px 300px;
          box-shadow: 0 2px 10px rgba(35,31,24,0.06);
          /* The CTA hover lifts and barely scales the whole card (see
             hooks/useGroupWalkCardHover.ts) — it grows about its own centre.
             No rotation: a tilt reads as a wobble at this size. */
          transform-origin: 50% 50%;
          will-change: transform;
        }
        #home-group-walk-feature-art-panel {
          position: relative;
          overflow: hidden;
          min-height: 300px;
          /* No fill: the skyline is its own layer below, so it can drift on
             hover. The card's paper grain shows through as before. */
        }
        /* Skyline, as an element rather than a background, so the hover can
           move it independently of the walker. Overscaled and offset left so
           its own drift never exposes the panel's right edge. */
        #home-group-walk-feature-art-backdrop {
          position: absolute;
          top: 0;
          left: -12.5%;
          width: 125%;
          height: 100%;
          object-fit: cover;
          object-position: center 75%;
          z-index: 0;
          will-change: transform;
        }
        /* The paper wash that used to be a gradient in the panel background —
           now an overlay, because the skyline moved above it in the stack. */
        #home-group-walk-feature-art-wash {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(247,241,227,0.55), rgba(247,241,227,0.28));
          z-index: 1;
          pointer-events: none;
        }
        /* Placement lives on the figure wrapper and motion on the image
           inside it. Two elements, because GSAP owns the image's transform
           entirely: if the -58% centring sat on the same element, GSAP would
           parse it into its own x and the hover would compose on top of it —
           the art ends up shifted twice as far as the layout intends. */
        #home-group-walk-feature-art-figure {
          position: absolute;
          left: 61%;
          bottom: -4%;
          transform: translateX(-58%);
          height: 94%;
          width: auto;
          z-index: 3;
          pointer-events: none;
        }
        /* Sits just clear of the panel floor so it reads as placed, not
           cropped. */
        #home-group-walk-feature-art-image {
          display: block;
          height: 100%;
          width: auto;
          max-width: none;
          object-fit: contain;
          will-change: transform;
          filter: drop-shadow(0 6px 14px rgba(35,31,24,0.22));
        }
        #home-group-walk-feature-promo-ribbon {
          position: absolute;
          top: 28px;
          left: -46px;
          width: 196px;
          padding: 9px 0;
          background: var(--olive);
          color: var(--paper);
          font-family: var(--font-stamp);
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center;
          transform: rotate(-45deg);
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          /* Behind the walker layer (z-index 3) so the figure passes in front
             of the banner, above the skyline and its wash. */
          z-index: 2;
        }
        /* Denser than the old card: bigger type, tighter gaps. Plain paper —
           the skyline watermark that used to fill the right side is gone. */
        #home-group-walk-feature-content {
          position: relative;
          padding: clamp(18px, 2.2vw, 28px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
        }
        /* Keeps the copy above the card's diagonal promo banner (z-index 0). */
        #home-group-walk-feature-content > * { position: relative; z-index: 1; }
        /* Promo line and pill share one line; the pill pins right. */
        #home-group-walk-feature-headline-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          flex-wrap: nowrap;
        }
        #home-group-walk-feature-promo-line { min-width: 0; }
        #home-group-walk-feature-headline-row .phase-tag { flex-shrink: 0; }
        /* Name left, price block right — the price is the first read. */
        #home-group-walk-feature-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: clamp(12px, 2vw, 28px);
          width: 100%;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(36,35,33,0.16);
          padding-bottom: 12px;
        }
        /* Nudged down so the price block sits just under the cap line of the
           title beside it, rather than starting above it. */
        #home-group-walk-feature-price-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          text-align: right;
          margin-top: 20px;
        }
        /* Old price and the unit sit together on one line above the new price. */
        #home-group-walk-feature-was-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        #home-group-walk-feature-was {
          font-family: var(--font-type);
          font-size: 14px;
          color: var(--mid-gray);
          text-decoration: line-through;
          line-height: 1;
        }
        #home-group-walk-feature-unit {
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--mid-gray);
          line-height: 1;
        }
        #home-group-walk-feature-now {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-family: var(--font-display);
          color: var(--ink);
          font-size: clamp(64px, 8.4vw, 116px);
          line-height: 0.85;
          letter-spacing: -0.015em;
        }
        /* Scales on CTA hover, anchored at its right edge so the price grows
           into the card instead of off it. */
        #home-group-walk-feature-now {
          transform-origin: 100% 50%;
          will-change: transform;
        }
        /* Paw trail resting behind the copy — static art, not hover motion
           (see useGroupWalkCardHover). Explicit z-index 0
           beats the #home-group-walk-feature-content > * rule above, which
           would otherwise put the prints in front of the text. */
        #home-group-walk-feature-paw-trail {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        #home-group-walk-feature-paw-trail svg { display: block; }
        #home-group-walk-feature-tax-note {
          font-family: var(--font-type);
          font-size: 11px;
          color: var(--mid-gray);
          line-height: 1.3;
        }
        #home-group-walk-feature-promo-line {
          color: var(--olive);
          font-family: var(--font-headline);
          font-size: clamp(22px, 2.4vw, 30px);
          font-weight: 400;
          line-height: 1;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          margin: 0;
        }
        /* Breaks to two lines and reads at product weight, near the scale of the
           secondary rate prices below the card. The size is capped by the
           title row: this box is 6ch wide, the price block beside it is a
           fixed ~191px, so anything above ~5vw wraps the price under the
           name in the 768-840px band, just above the stacked breakpoint. The top margin is
           the struck-through price line above it (14px + the 2px block gap). */
        #home-group-walk-feature-title {
          font-family: var(--font-display);
          font-size: clamp(34px, 5vw, 72px);
          line-height: 0.9;
          max-width: 6ch;
          /* Drops the second line's baseline onto the price's. Both sizes are
             viewport-relative but at different rates (5vw here, 8.4vw for the
             price), so the offset has to shrink as the type grows — hence the
             em term rather than a fixed nudge. Fitted against measured
             baselines from 768px to 1440px; within ~1px across that range. */
          margin: calc(47px - 0.57em) 0 0;
        }
        #home-group-walk-feature-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        /* The card's CTA drops the .btn-primary paper-ticket tilt — at full
           width an angled block reads as a mistake.
           No transform transition and no :hover/:active transform rules here:
           hooks/useGroupWalkCardHover.ts drives this button's transform on
           every frame, and a CSS transition on the same property fights those
           writes (the browser eases toward a target GSAP has already moved). */
        #home-group-walk-feature-card .btn {
          width: 100%;
          justify-content: center;
          transform: none;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        @media (max-width: 767px) {
          #home-group-walk-feature-card { grid-template-columns: 1fr; }
          /* The strip takes the illustration's own 499:238 ratio instead of a
             fixed 200px, so a full-width image is never taller than its frame
             and the walker's head stops getting clipped. */
          #home-group-walk-feature-art-panel {
            min-height: 0;
            aspect-ratio: 499 / 238;
          }
          /* Stacked: full-width illustration, offset right, hanging exactly
             10% of ITS OWN height below the strip. translateY percentages
             resolve against the element, unlike bottom, which resolves
             against the panel's fixed 200px height — that mismatch is what
             dropped the art out of frame on narrow screens, where the image
             is shorter but the offset stayed 130px. */
          #home-group-walk-feature-art-figure {
            /* Centred: full width from the panel's left edge, no offset. */
            left: 0;
            bottom: 0;
            transform: translateY(6%);
            width: 100%;
            height: auto;
          }
          #home-group-walk-feature-art-image { width: 100%; height: auto; }
          #home-group-walk-feature-fields { grid-template-columns: 1fr; }
          /* Stacked: the whole text column centres. */
          #home-group-walk-feature-headline-row { justify-content: center; }
          #home-group-walk-feature-title-row {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          /* Keeps the 6ch wrap so the name reads on two lines here too; the
             block centres because the row centres its items. */
          #home-group-walk-feature-title { margin-top: 0; }
          /* Stacked: no cap-line nudge to make, so the row gap alone spaces them. */
          #home-group-walk-feature-price-block { align-items: center; text-align: center; margin-top: 0; }
          #home-group-walk-feature-now { font-size: clamp(52px, 16vw, 88px); }
        }
      `}</style>

      <div id="home-group-walk-feature-art-panel">
        {/* GSAP-driven: useGroupWalkCardHover imperatively transforms this
            element via backdropRef (xPercent drift on hover/leave). next/image
            would still forward the ref, but the hook needs the same raw DOM
            node identity across the effect and the hover callbacks, so this
            stays a plain <img>; behavior/ref wiring is unchanged either way. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- GSAP ref-animated (see useGroupWalkCardHover); box is CSS-driven, not a next/image candidate */}
        <img
          id="home-group-walk-feature-art-backdrop"
          ref={backdropRef}
          src={SKYLINE_IMAGE}
          alt=""
          aria-hidden="true"
          width={1620}
          height={971}
          decoding="async"
          loading="lazy"
        />
        <div id="home-group-walk-feature-art-wash" aria-hidden="true" />
        <div id="home-group-walk-feature-promo-ribbon" aria-hidden="true">20% Off</div>
        <div id="home-group-walk-feature-art-figure">
          {/* Same GSAP ref-animation as the backdrop above (walkerRef: rest/hover
              xPercent + scale in useGroupWalkCardHover). */}
          {/* eslint-disable-next-line @next/next/no-img-element -- GSAP ref-animated (see useGroupWalkCardHover); box is CSS-driven, not a next/image candidate */}
          <img
            id="home-group-walk-feature-art-image"
            ref={walkerRef}
            src="/img/3Top.png"
            alt="Illustration of a Not The Rug walker out with three dogs"
            width={499}
            height={238}
            decoding="async"
            loading="lazy"
          />
        </div>
      </div>

      <div id="home-group-walk-feature-content">
        <div
          id="home-group-walk-feature-paw-trail"
          aria-hidden="true"
          style={{
            transform: `rotate(${PAW_TRAIL.containerRotation}deg)`,
            transformOrigin: PAW_TRAIL.transformOrigin,
          }}
        >
          {PAW_TRAIL.spots.map((spot, p) => (
            <div
              key={p}
              ref={setPawRef(p)}
              style={{
                position: 'absolute',
                left: `${spot.left}%`,
                top: `${spot.top}%`,
                width: PAW_TRAIL.glyphPx,
                height: PAW_TRAIL.glyphPx,
                marginLeft: -PAW_TRAIL.glyphPx / 2,
                marginTop: -PAW_TRAIL.glyphPx / 2,
              }}
            >
              <svg viewBox="0 0 40 40" width="100%" height="100%" fill="var(--sage-dark)">
                <ellipse cx="20" cy="27" rx="10" ry="8" />
                <ellipse cx="10" cy="14" rx="4" ry="5" transform="rotate(-15 10 14)" />
                <ellipse cx="18" cy="8" rx="4.5" ry="5.5" />
                <ellipse cx="27" cy="9" rx="4.5" ry="5.5" transform="rotate(10 27 9)" />
                <ellipse cx="33" cy="17" rx="4" ry="5" transform="rotate(25 33 17)" />
              </svg>
            </div>
          ))}
        </div>

        <div id="home-group-walk-feature-headline-row">
          <p id="home-group-walk-feature-promo-line">{FIRST_WALK_PROMO_LINE}</p>
          <span className="phase-tag">{FIRST_WALK_PROMO_BADGE}</span>
        </div>

        <div id="home-group-walk-feature-title-row">
          <h3 id="home-group-walk-feature-title">{GROUP_WALK_PREVIEW.title}</h3>
          <div id="home-group-walk-feature-price-block">
            <div id="home-group-walk-feature-was-row">
              <span id="home-group-walk-feature-was">{GROUP_WALK_PREVIEW.price}</span>
              <span id="home-group-walk-feature-unit">{GROUP_WALK_PREVIEW.priceUnit}</span>
            </div>
            <div id="home-group-walk-feature-now" ref={priceRef}>${GROUP_WALK_FIRST_WALK_PRICE}</div>
            <span id="home-group-walk-feature-tax-note">{FIRST_WALK_TAX_NOTE}</span>
          </div>
        </div>

        <form id="home-group-walk-feature-form" onSubmit={handleSubmit} noValidate>
          <div id="home-group-walk-feature-fields">
            <div className="form-group">
              <label htmlFor="home-group-walk-feature-email">Email Address</label>
              <input
                id="home-group-walk-feature-email"
                className="form-control"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@email.com"
                value={email}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'home-group-walk-feature-error' : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="home-group-walk-feature-phone">Phone Number</label>
              <input
                id="home-group-walk-feature-phone"
                className="form-control"
                type="tel"
                autoComplete="tel"
                placeholder="(347) 000-0000"
                value={phone}
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          {error && (
            <p
              id="home-group-walk-feature-error"
              role="alert"
              className="form-note"
              style={{ color: '#c0392b', textAlign: 'left', marginTop: '6px' }}
            >
              ⚠️ {error}
            </p>
          )}

          {/* The whole card's hover choreography hangs off this one button —
              pointer and keyboard both, so a tabbing visitor sees it too. */}
          <button
            type="submit"
            className="btn btn-primary btn-accent service-card-cta"
            style={{ marginTop: '12px' }}
            ref={ctaRef}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onFocus={onEnter}
            onBlur={onLeave}
          >
            Contact Luis, to Get Started
          </button>
        </form>
      </div>
    </div>
  );
}
