'use client';

import { useEffect, useState } from 'react';
import { ALWAYS_INCLUDED, type IncludedIcon } from '@/lib/content/services';

/** Line icons for the callouts — same 24px stroke set as the trust bar. */
const INCLUDED_ICONS: Record<IncludedIcon, React.ReactNode> = {
  gps: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  photo: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  leash: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </>
  ),
};

/**
 * The four "included with every walk" callouts closing the How It Works
 * strip, under the four process steps.
 *
 * Hovering (mouse) or tapping (touch) a callout's icon shows that item's
 * preview image centred over the page. The artwork does not exist yet, so an item
 * without `image` renders a labelled placeholder in the same frame — drop a
 * path into ALWAYS_INCLUDED[].image and it swaps in with no other change.
 */
export default function AlwaysIncluded() {
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const active = ALWAYS_INCLUDED.find((item) => item.title === activeTitle) ?? null;

  // Escape closes a preview opened by tap, which has no pointer-leave.
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveTitle(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  return (
    <div id="home-always-included">
      <style>{`
        /* Inked for the dark olive band it now closes (#home-how-it-works-
           section, inside the team/reviews band) — cream copy on green, the
           same rule token and text alphas the rest of that band uses. */
        #home-always-included {
          margin-top: clamp(26px, 3.5vw, 48px);
          padding-top: clamp(28px, 4vw, 44px);
          border-top: 1px solid var(--zine-rule-dark);
          color: var(--cream);
          text-align: center;
        }
        #home-always-included-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(20px, 3vw, 36px);
        }
        .home-included-item {
          text-align: center;
        }
        /* Only the icon opens the preview, so only the icon is the button. The
           title and copy below it stay plain text with no hover target. */
        .home-included-trigger {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          color: inherit;
          cursor: pointer;
          display: block;
          margin: 0 auto 14px;
        }
        /* Cream, matching the step titles above — the callouts read as part of
           the same band instead of a separate gold accent tier. */
        .home-included-icon {
          display: block;
          color: var(--cream);
          transition: opacity 0.2s ease;
          opacity: 0.85;
        }
        .home-included-trigger[data-active='true'] .home-included-icon { opacity: 1; }
        /* Same treatment as .hiw-step h4 (the "First Walk" titles above), so the
           two rows of this band read as one set instead of two type systems. */
        .home-included-item h4 {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 400;
          letter-spacing: normal;
          text-transform: none;
          color: var(--cream);
          margin: 0 0 10px;
        }
        .home-included-item p {
          font-family: var(--font-type);
          font-size: 12px;
          line-height: 1.6;
          color: rgba(243, 236, 217, 0.7);
          margin: 0;
        }
        /* Lead line sits under the four callouts. */
        #home-always-included-lead {
          max-width: 46ch;
          margin: clamp(26px, 3.5vw, 44px) auto 0;
          font-size: clamp(15px, 1.5vw, 18px);
          line-height: 1.55;
          color: rgba(243, 236, 217, 0.78);
          text-wrap: balance;
        }
        /* Centred preview, shown while a callout is hovered or tapped. */
        #home-included-preview {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          pointer-events: none;
          background: rgba(28, 28, 26, 0.55);
          animation: includedPreviewIn 0.18s cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        @keyframes includedPreviewIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        #home-included-preview-frame {
          max-width: min(560px, 90vw);
          width: 100%;
          background: var(--warm-white) url('/textures/paper-grain.png');
          background-size: 300px 300px;
          border: 1px solid var(--ink);
          box-shadow: 0 30px 80px rgba(0,0,0,0.45);
          padding: 14px;
        }
        #home-included-preview-frame img { width: 100%; height: auto; display: block; }
        #home-included-preview-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 240px;
          border: 1px dashed rgba(36, 35, 33, 0.4);
          font-family: var(--font-type);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--mid-gray);
        }
        #home-included-preview-caption {
          font-family: var(--font-stamp);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted-ink);
          margin: 10px 0 0;
        }
        @media (max-width: 1023px) {
          #home-always-included-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          #home-always-included-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          #home-included-preview { animation: none; }
          .home-included-icon { transition: none; }
        }
      `}</style>

      <div id="home-always-included-grid">
        {ALWAYS_INCLUDED.map((item) => (
          <div className="home-included-item" key={item.title}>
            <button
              type="button"
              className="home-included-trigger"
              data-active={active?.title === item.title}
              aria-expanded={active?.title === item.title}
              aria-label={`Preview ${item.title}`}
              onMouseEnter={() => setActiveTitle(item.title)}
              onMouseLeave={() => setActiveTitle((current) => (current === item.title ? null : current))}
              onFocus={() => setActiveTitle(item.title)}
              onBlur={() => setActiveTitle((current) => (current === item.title ? null : current))}
              onClick={() => setActiveTitle((current) => (current === item.title ? null : item.title))}
            >
              <svg
                className="home-included-icon"
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {INCLUDED_ICONS[item.icon]}
              </svg>
            </button>
            <h4>{item.title}</h4>
            <p>{item.copy}</p>
          </div>
        ))}
      </div>

      <p id="home-always-included-lead">
        No contracts. No hidden fees. Just dependable neighborhood care from a team your dog knows and trusts.
      </p>

      {active && (
        <div id="home-included-preview" role="presentation">
          <div id="home-included-preview-frame">
            {active.image ? (
              <>
                {/* No ALWAYS_INCLUDED item (lib/content/services.ts) currently
                    sets `image`, so this path is unreachable with today's
                    content — there is no real asset yet to measure
                    width/height/sizes from. next/image conversion belongs in
                    P3 (plans/010-production-final-mile-optimization.md) once
                    real artwork with known intrinsic dimensions ships;
                    fabricating dimensions now would risk the wrong aspect
                    ratio for whatever image actually lands here. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- unreachable with current content (no ALWAYS_INCLUDED item sets `image` yet); next/image conversion deferred to P3 once real artwork/dimensions exist */}
                <img src={active.image} alt={active.title} decoding="async" loading="lazy" />
              </>
            ) : (
              <div id="home-included-preview-placeholder">Image coming soon</div>
            )}
            <p id="home-included-preview-caption">{active.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
