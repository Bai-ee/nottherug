'use client';

import { useEffect, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';

type MatchMedia = ReturnType<GsapBundle['gsap']['matchMedia']>;

/**
 * Scroll travel, in px, across the section's whole scroll range — stickers one
 * way, rate columns the other, so what reads on screen is the sum of the two.
 *
 * Both are small on purpose: the stickers sit in the column's own flow, right
 * against the name or description they label, so travel past a few px reads as
 * the label coming loose from its rate rather than as depth.
 */
const SCROLL_SHIFT = {
  wide: { sticker: 10, item: 5 },
  compact: { sticker: 7, item: 4 },
};

/** Odd-indexed stickers travel a little further so the row is not one flat plane. */
const ALTERNATE_DEPTH = 0.35;

/**
 * Sticker tilt, alternating down the row. It has to be set through gsap rather
 * than CSS: gsap writes the whole transform inline while it tweens y, and an
 * inline transform beats the stylesheet's `rotate()`.
 */
const STICKER_ROTATION = [-2, 1.5, -1.5, 2, -2.5];

/**
 * Hover travel. Scroll owns `y` (px); hover owns `x` and `yPercent`, so the two
 * effects compose in one transform instead of overwriting each other.
 */
const STICKER_HOVER_X = 8;
const STICKER_HOVER_Y_PERCENT = 10;
const ITEM_HOVER_X = 3;
const ITEM_HOVER_Y_PERCENT = 2;

/**
 * Hover follow. Long, heavily out-eased durations so the layers glide to the
 * cursor instead of tracking it 1:1 — the column is slower than its sticker,
 * which is what sells the depth between them. quickTo keeps re-targeting the
 * same tween on every pointermove, so a fast cursor never stacks tweens.
 */
const STICKER_HOVER_EASE = { duration: 0.9, ease: 'power3.out' } as const;
const ITEM_HOVER_EASE = { duration: 1.2, ease: 'power3.out' } as const;

/**
 * Scrub lag, in seconds, for the playhead to catch up to the scroll position.
 * This is where the smoothness lives: a bare `scrub: true` maps 1:1 to the
 * scroll wheel and reads as steppy, especially on a trackpad's coarse deltas.
 */
const SCRUB = { wide: 1.1, compact: 0.9 };

/**
 * Deliberately not `ease: 'none'`. The usual rule for a scrubbed tween is a
 * linear ease so scroll position maps 1:1 to progress, but this is ambient
 * drift rather than a scroll-controlled sequence: a sine curve eases the
 * travel in and out at the ends of the section, so nothing starts or stops
 * abruptly as the row enters and leaves the viewport.
 */
const SCROLL_EASE = 'sine.inOut';

/**
 * Parallax for the home rates row, in two layers that move against each other:
 * the stamped stickers (.home-rate-sticker) are the foreground, the rate
 * columns (.home-rate-item) the background.
 *
 * - On scroll, stickers drift up while the columns drift down a smaller amount.
 * - On hover (fine pointers only), the sticker on the hovered column leans
 *   toward the cursor and the column leans away from it.
 *
 * Scoped to the row element passed in and reverted with its own
 * `gsap.matchMedia()` — it never touches ScrollTriggers it does not own (see
 * the note in gsapLoader.ts). Motion is skipped entirely under
 * prefers-reduced-motion; the static layout is the reduced-motion state.
 */
export function useRateStickerParallax(rowRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    if (prefersReducedMotion()) return;

    let cancelled = false;
    let mm: MatchMedia | undefined;
    const teardown: Array<() => void> = [];

    loadGsap()
      .then(({ gsap }) => {
        if (cancelled) return;
        mm = gsap.matchMedia(row);

        mm.add(
          {
            isWide: '(min-width: 1024px)',
            canHover: '(hover: hover) and (pointer: fine)',
          },
          (context) => {
            const { isWide, canHover } = context.conditions as { isWide: boolean; canHover: boolean };
            const shift = isWide ? SCROLL_SHIFT.wide : SCROLL_SHIFT.compact;

            // Same range for both layers — start as the row enters the
            // viewport, end as it leaves — but a fresh config object per
            // tween, since ScrollTrigger writes its own animation onto the
            // vars it is given.
            const range = () => ({
              trigger: row,
              start: 'top bottom',
              end: 'bottom top',
              scrub: isWide ? SCRUB.wide : SCRUB.compact,
            });

            // Promote both layers for the duration of the effect; matchMedia
            // reverts the inline style when the breakpoint stops matching.
            gsap.set('.home-rate-item, .home-rate-sticker', { willChange: 'transform' });

            gsap.fromTo(
              '.home-rate-item',
              { y: -shift.item },
              { y: shift.item, ease: SCROLL_EASE, scrollTrigger: range() }
            );

            gsap.set('.home-rate-sticker', {
              rotation: (i: number) => STICKER_ROTATION[i % STICKER_ROTATION.length],
            });

            const depth = (i: number) => 1 + (i % 2) * ALTERNATE_DEPTH;
            gsap.fromTo(
              '.home-rate-sticker',
              { y: (i: number) => shift.sticker * depth(i) },
              { y: (i: number) => -shift.sticker * depth(i), ease: SCROLL_EASE, scrollTrigger: range() }
            );

            // Hover lean. Skipped on touch, where there is no hover state to
            // read and the sticker would stick wherever the last tap landed.
            if (!canHover) return;

            gsap.utils.toArray<HTMLElement>('.home-rate-item').forEach((item) => {
              const sticker = item.querySelector<HTMLElement>('.home-rate-sticker');
              if (!sticker) return;

              const stickerX = gsap.quickTo(sticker, 'x', STICKER_HOVER_EASE);
              const stickerY = gsap.quickTo(sticker, 'yPercent', STICKER_HOVER_EASE);
              const itemX = gsap.quickTo(item, 'x', ITEM_HOVER_EASE);
              const itemY = gsap.quickTo(item, 'yPercent', ITEM_HOVER_EASE);

              const onMove = (event: PointerEvent) => {
                const rect = item.getBoundingClientRect();
                // -1 .. 1 from the column's centre.
                const nx = gsap.utils.clamp(-1, 1, ((event.clientX - rect.left) / rect.width - 0.5) * 2);
                const ny = gsap.utils.clamp(-1, 1, ((event.clientY - rect.top) / rect.height - 0.5) * 2);
                stickerX(nx * STICKER_HOVER_X);
                stickerY(ny * STICKER_HOVER_Y_PERCENT);
                // Opposite sign: the column slides under the sticker.
                itemX(-nx * ITEM_HOVER_X);
                itemY(-ny * ITEM_HOVER_Y_PERCENT);
              };

              const onLeave = () => {
                stickerX(0);
                stickerY(0);
                itemX(0);
                itemY(0);
              };

              item.addEventListener('pointermove', onMove);
              item.addEventListener('pointerleave', onLeave);
              teardown.push(() => {
                item.removeEventListener('pointermove', onMove);
                item.removeEventListener('pointerleave', onLeave);
              });
            });
          }
        );
      })
      .catch((err) => {
        console.warn('[useRateStickerParallax] gsap unavailable; rates row renders static.', err);
      });

    return () => {
      cancelled = true;
      teardown.forEach((off) => off());
      mm?.revert();
    };
  }, [rowRef]);
}
