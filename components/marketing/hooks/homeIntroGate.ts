'use client';

/**
 * One-shot handoff between the home loading screen (HomeIntroOverlay) and the
 * hero entrance (useHomeHeroMotion).
 *
 * The hero timeline must not play behind the loading screen — by the time the
 * overlay wipes away the headline would already be sitting still. The overlay
 * releases this gate at the moment it starts revealing the page, so the logo
 * drop, the nav band and the hero entrance run as one sequence.
 *
 * Module-level on purpose: the gate is per page load, not per component. A
 * client-side navigation back to home finds it already released and the hero
 * animates immediately (the overlay only runs on a real document load, see
 * HomeIntroOverlay).
 */

/** Hero must never hang waiting on an overlay that failed to release. */
const INTRO_SAFETY_MS = 4000;

let released = false;
let resolveGate: (() => void) | undefined;
let gate: Promise<void> | undefined;

export function waitForHomeIntro(): Promise<void> {
  if (released) return Promise.resolve();
  if (!gate) {
    gate = new Promise<void>((resolve) => {
      resolveGate = resolve;
      // Script error, stalled asset, overlay never mounted: open the gate
      // anyway rather than leave the hero hidden.
      setTimeout(releaseHomeIntro, INTRO_SAFETY_MS);
    });
  }
  return gate;
}

export function releaseHomeIntro(): void {
  if (released) return;
  released = true;
  resolveGate?.();
  resolveGate = undefined;
}
