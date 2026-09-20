'use client';

import { useRef } from 'react';
import {
  GROUP_WALK_PREVIEW,
  HOME_SERVICE_PREVIEW_ROW_1,
  HOME_SERVICE_PREVIEW_ROW_2,
  type ServicePreviewItem,
} from '@/lib/content/services';
// import MeetGreetForm from '@/components/MeetGreetForm'; // restore with #home-rates-intake below
import GroupWalkFeatureCard from './GroupWalkFeatureCard';
import { useRateStickerParallax } from './hooks/useRateStickerParallax';

/** Rates other than Group Walk, which gets its own featured treatment above them. */
const OTHER_CARDS = [...HOME_SERVICE_PREVIEW_ROW_1, ...HOME_SERVICE_PREVIEW_ROW_2].filter(
  (item) => item !== GROUP_WALK_PREVIEW
);

/**
 * One stamped sticker per secondary rate, in the same olive/stamp treatment as
 * the featured card's "20% Off" corner ribbon. Presentation only: the labels
 * reuse the /services catalog badges where one already exists (Premium,
 * 7+ day discounts) so the two pages agree.
 *
 * Every sticker sits directly under its rate's description. They used to
 * alternate above the name / below the description so the row would not read
 * as five identical tags, but stacked into one column that alternation read
 * as a mistake — one placement at every breakpoint instead.
 */
const RATE_STICKERS: Record<string, string> = {
  'Solo Walk': 'Premium',
  'Senior Dog Visits': 'Gentle Pace',
  'Puppy Walk': 'Puppy Pace',
  'Boarding & Overnight Sitting': '7+ Day Discounts',
  'Cat Visits': 'Cats Too',
};

/** kebab-case id fragment so each sticker is addressable for later tuning. */
function stickerSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}



/**
 * Secondary rate: no card chrome, no motion. Same centred, price-first
 * treatment as the featured Group Walk card — name, oversized price, and the
 * service copy reduced to fine print underneath.
 */
export function PreviewCard({ item }: { item: ServicePreviewItem }) {
  const stickerLabel = RATE_STICKERS[item.title];
  return (
    // id per rate so the footer's Services column can link straight at the
    // rate it names instead of dropping the reader at the top of the section.
    <div className="home-rate-item" id={`home-rate-${stickerSlug(item.title)}`}>
      {stickerLabel && (
        <span
          id={`home-rate-sticker-${stickerSlug(item.title)}`}
          className="home-rate-sticker"
          aria-hidden="true"
        >
          {stickerLabel}
        </span>
      )}
      <h3 className="home-rate-name">
        {item.nameLines ? (
          <>
            {item.nameLines[0]}
            <br />
            {item.nameLines[1]}
          </>
        ) : (
          item.title
        )}
      </h3>
      <div className="home-rate-unit">{item.priceUnit}</div>
      <div className="home-rate-price">{item.price}</div>
      <p className="home-rate-fineprint">{item.fineprint ?? item.copy}</p>
    </div>
  );
}

// Home page "rates preview" row. The animated product carousel that used to
// sit above it is disabled per current direction (see
// components/marketing/DisabledHomeSections.tsx notes) — the static cards
// below are the shipped replacement, not a fallback.
export default function ServicesPreview() {
  // Scope for the sticker/rate parallax — the hook only ever touches elements
  // inside this row (see hooks/useRateStickerParallax.ts).
  const ratesRowRef = useRef<HTMLDivElement | null>(null);
  useRateStickerParallax(ratesRowRef);

  return (
    <section className="section" id="home-personalized-care-section">
      <div className="container" id="home-rates-preview-row">
        {/* Secondary rates: roughly half the scale of the featured card and
            with no CTA of their own — the featured card carries the action. */}
        <style>{`
          /* Plain centred columns, not cards: no border, fill, shadow or
             hover motion. The price stays the first read, as on the featured
             card above.

             One wrapping flex row rather than a grid: three across from 768px up,
             two on small tablets, one on phones — and because the row is
             centred, a partial final row (the 5th rate) centres itself with
             no second container. */
          #home-rates-preview-other-cards {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 28px;
            margin-top: clamp(40px, 6vw, 84px);
          }
          /* Stamped stickers, one per rate (see RATE_STICKERS above). Same
             olive/stamp language as the featured card's corner ribbon, at
             label scale. They sit in the column's own flow, directly under
             its description, so a label can never drift into the gap between
             two rates. The order property puts the span last while it stays
             the column's first child in the JSX. The tilt is set in
             hooks/useRateStickerParallax.ts, not here: gsap writes the whole
             transform inline while it tweens y, which beats a stylesheet
             rotate(). */
          #home-rates-preview-other-cards .home-rate-sticker {
            align-self: center;
            padding: 4px 9px;
            background: var(--olive);
            color: var(--paper);
            font-family: var(--font-stamp);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            white-space: nowrap;
            border-radius: 3px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.22);
            pointer-events: none;
            order: 99;
            margin-top: 4px;
          }
          #home-rates-preview-other-cards .home-rate-item {
            flex: 0 1 calc((100% - 56px) / 3);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 2px;
            padding: 8px 10px 14px;
            /* Each rate is a footer link target; clear the fixed nav. */
            scroll-margin-top: calc(var(--nav-h) + 24px);
          }
          #home-rates-preview-other-cards .home-rate-name {
            font-family: var(--font-display);
            font-size: clamp(21px, 2.6vw, 30px);
            line-height: 1.05;
            margin: 0;
            /* The two lines come from nameLines in lib/content/services.ts,
               not from wrapping, so every name is exactly two lines and the
               prices below them share a baseline. */
          }
          #home-rates-preview-other-cards .home-rate-unit {
            font-family: var(--font-body);
            font-size: 13px;
            color: var(--mid-gray);
            line-height: 1;
          }
          #home-rates-preview-other-cards .home-rate-price {
            font-family: var(--font-display);
            font-size: clamp(52px, 6.6vw, 88px);
            line-height: 0.88;
            color: var(--ink);
            letter-spacing: -0.015em;
          }
          #home-rates-preview-other-cards .home-rate-fineprint {
            font-family: var(--font-type);
            font-size: 11px;
            line-height: 1.4;
            color: var(--mid-gray);
            margin: 6px 0 0;
            white-space: nowrap;
          }
          @media (max-width: 1023px) {
            /* Narrower columns: smaller stamp so the label never outruns the
               description line it sits against. */
            #home-rates-preview-other-cards .home-rate-sticker {
              font-size: 10px;
              padding: 3px 8px;
            }
          }
          @media (max-width: 767px) {
            #home-rates-preview-other-cards .home-rate-item {
              flex-basis: calc((100% - 28px) / 2);
            }
          }
          @media (max-width: 600px) {
            #home-rates-preview-other-cards { gap: 22px; }
            #home-rates-preview-other-cards .home-rate-item { flex-basis: 100%; }
            /* Vertical orientation only: the premium rate opens the stack.
               Above this width it keeps its middle spot in the row. */
            #home-rates-preview-other-cards #home-rate-solo-walk { order: -1; }
          }

        `}</style>
        <div id="home-rates-preview-other-cards" ref={ratesRowRef}>
          {OTHER_CARDS.map((item) => (
            <PreviewCard key={item.title} item={item} />
          ))}
        </div>

        {/* Featured Group Walk card moved BELOW the other rates as a layout
            trial — it sat above them before. Revert by moving this block back
            above #home-rates-preview-other-cards. */}
        <div id="home-rates-preview-featured-row" style={{ marginTop: 'clamp(40px, 6vw, 84px)' }}>
          <GroupWalkFeatureCard />
        </div>

        {/* COMMENTED OUT — the in-section intake sheet ("First" + the 5-step
            meet & greet form) is on hold while we decide whether the rates
            section should ask for anything at all. The welcome modal and
            #home-contact-sheet-section still capture leads. Restore this block
            (and the MeetGreetForm import above) to bring it back; its styling
            lives at #home-rates-intake in globals.css.

        <div id="home-rates-intake">
          <div id="home-rates-intake-sheet" className="booking-form">
            <div className="booking-form-body">
              <h2 id="home-rates-intake-headline">First</h2>
              <MeetGreetForm paneId="home-rates-meetgreet" source="home-rates" />
            </div>
          </div>
        </div>

        */}
      </div>
    </section>
  );
}
