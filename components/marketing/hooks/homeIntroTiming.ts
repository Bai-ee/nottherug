/**
 * Timing for the home loading screen. Pure and dependency-free so it can be
 * unit-tested without a DOM.
 *
 * The intro is decorative and fixed-length. Nothing in it waits on a video, a
 * font or GSAP, and nothing is added on top of anything else. The visuals are
 * CSS keyframes in globals.css (HOME LOADING SCREEN); keep the two in step.
 *
 * There are two clocks: navigation start (what the timers below use when no
 * keyframe is running) and the moment the keyframes began (first style). The
 * sequence ends when the last keyframe actually finishes — see
 * homeIntroClock — with INTRO_CEILING_MS from navigation start as the
 * fallback, so a slow phone never has the overlay unmounted mid-keyframe.
 */

/** When the paper starts lifting and the hero entrance begins. */
export const INTRO_REVEAL_AT_MS = 400;
/** Nominal end of the last CSS keyframe (logo drop). */
export const INTRO_DONE_AT_MS = 1300;
/** Fallback end if no keyframe can be observed (or one never finishes). */
export const INTRO_CEILING_MS = 2500;
/**
 * A hero entrance that would start later than this (on the intro clock) is
 * skipped: the paper is already mostly lifted, so hiding the headline again to
 * animate it back in would read as a blink.
 */
export const ENTRANCE_CUTOFF_MS = 800;

export interface IntroPlan {
  revealInMs: number;
  /** Fallback delay: the intro ends by then even if no keyframe reports in. */
  doneInMs: number;
}

/** Delays from "now", given how long the page has already been loading. */
export function planHomeIntro(elapsedMs: number): IntroPlan {
  return {
    revealInMs: Math.max(0, INTRO_REVEAL_AT_MS - elapsedMs),
    doneInMs: Math.max(0, INTRO_CEILING_MS - elapsedMs),
  };
}

export function shouldPlayEntrance(introRan: boolean, elapsedMs: number): boolean {
  return !introRan || elapsedMs <= ENTRANCE_CUTOFF_MS;
}

interface StartOptions {
  elapsedMs: number;
  onReveal: () => void;
  onDone: () => void;
  /** Resolves when the CSS keyframes have finished (or been cancelled). */
  keyframesDone?: Promise<unknown>;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/**
 * Schedules reveal and done independently; done fires once, on the first of
 * the keyframes finishing or the ceiling timer. A throwing reveal
 * never prevents done: the page must always end up usable.
 */
export function startHomeIntro({
  elapsedMs,
  onReveal,
  onDone,
  keyframesDone,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}: StartOptions): () => void {
  const { revealInMs, doneInMs } = planHomeIntro(elapsedMs);
  const reveal = setTimer(() => {
    try {
      onReveal();
    } catch (err) {
      console.warn('[homeIntro] reveal step failed; continuing.', err);
    }
  }, revealInMs);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimer(done);
    onDone();
  };
  const done = setTimer(finish, doneInMs);
  keyframesDone?.then(finish, finish);
  return () => {
    finished = true;
    clearTimer(reveal);
    clearTimer(done);
  };
}
