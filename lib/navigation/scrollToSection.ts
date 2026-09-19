/**
 * The one scroll-to-section landing behavior, shared by the desktop rail and
 * the mobile jump button so every entry point lands a section in the same
 * place: flush under the fixed site nav.
 *
 * The glide is hand-rolled rather than `window.scrollTo({ behavior: 'smooth' })`
 * because native smooth scrolling is inert on this site — the page has
 * `overflow-x: hidden` on both html and body (globals.css RESET & BASE), and a
 * smooth programmatic scroll against that scroller silently does nothing in
 * Chrome while `behavior: 'auto'` still works. Easing it ourselves also lets us
 * re-read the target's LIVE position every frame, so lazily-loaded media
 * shifting layout mid-glide can't leave the landing short or long.
 */

/** Live height of the fixed site nav (it condenses on scroll). */
export function navHeight(): number {
  return document.getElementById('main-nav')?.getBoundingClientRect().height ?? 0;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** How much of the remaining distance to close per frame, and a hard frame cap. */
const GLIDE_EASE = 0.18;
const MAX_FRAMES = 600;

let frame = 0;
let detachCancel: (() => void) | null = null;

function stopGlide(): void {
  if (frame !== 0) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  detachCancel?.();
  detachCancel = null;
}

function destinationFor(target: HTMLElement): number {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.max(0, Math.min(max, window.scrollY + target.getBoundingClientRect().top - navHeight()));
}

export function scrollToSectionId(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  stopGlide();

  if (prefersReducedMotion()) {
    window.scrollTo(0, destinationFor(target));
    return;
  }

  let frames = 0;
  const step = () => {
    frames += 1;
    const current = window.scrollY;
    const distance = destinationFor(target) - current;
    // Settle exactly on the last pixel instead of easing into it forever; the
    // frame cap is a safety net for a page whose height never stops changing.
    if (Math.abs(distance) < 1 || frames > MAX_FRAMES) {
      window.scrollTo(0, current + distance);
      stopGlide();
      return;
    }
    window.scrollTo(0, current + distance * GLIDE_EASE);
    frame = requestAnimationFrame(step);
  };

  // Any scroll gesture cancels the glide immediately — the user always wins,
  // the loop must never drag the page back out from under them.
  const cancel = () => stopGlide();
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  detachCancel = () => {
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
  };

  frame = requestAnimationFrame(step);
}
