/**
 * Dial-in values for the home paw walk. These are the shipped defaults; the
 * dev tuner (see components/marketing/PawWalkTuner.tsx, opened with `?pawtune`)
 * edits a copy of them in the browser and can copy the result back here.
 */
export interface PawWalkTuning {
  /** Rendered print width in px. 0 = fall back to the CSS clamp. */
  size: number;
  /** Stride as a multiple of the print size. Bigger = fewer, wider steps. */
  strideRatio: number;
  /** Resting opacity of a print once it has landed. */
  opacity: number;
  /** Footfall length as a fraction of the whole-page scroll. */
  stepDuration: number;
  /** ScrollTrigger scrub lag in seconds. Higher = looser, floatier. */
  scrub: number;
  /** Fraction down the viewport at which a print lands. */
  lead: number;
  /** How far each print sits off the route, perpendicular to the heading. */
  trackHalfWidth: number;
}

export const PAW_WALK_DEFAULTS: PawWalkTuning = {
  size: 33,
  strideRatio: 3.7,
  stepDuration: 0.008,
  scrub: 1.55,
  lead: 0.39,
  opacity: 0.28,
  trackHalfWidth: 24,
};

export const PAW_WALK_TUNING_KEY = 'nottherug:paw-walk-tuning';

/**
 * Dev only. The bezier path editor is ON by default while developing, so the
 * route is always draggable; the slider panel is OFF until asked for with
 * `?pawtune`. Flip either for a run with `?pawpath=0` / `?pawtune=1` (`0`,
 * `false` and `off` all read as off).
 *
 * Note the editor makes the paw layer take pointer events across the whole
 * page, so it swallows clicks meant for the site — use `?pawpath=0` when you
 * need to actually use the page.
 *
 * Production returns false for both regardless of the query string.
 */
export function pawWalkDevFlags(): { tune: boolean; path: boolean } {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
    return { tune: false, path: false };
  }
  const q = new URLSearchParams(window.location.search);
  const on = (name: string) => {
    const value = q.get(name);
    if (value === null) return true;
    return !['0', 'false', 'off'].includes(value.toLowerCase());
  };
  // Panel is opt-in (`?pawtune`); the path editor stays up unless a run turns
  // it off with `?pawpath=0`.
  return { tune: q.has('pawtune') && on('pawtune'), path: on('pawpath') };
}

export const PAW_WALK_PATH_KEY = 'nottherug:paw-walk-path';

/**
 * A route dragged in the path editor, kept so it survives a reload — a dev
 * server restart, a hot reload or an accidental refresh used to throw the
 * drag away. Dev only; nothing reads this in production.
 */
export function readStoredPath(): string | null {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return null;
  try {
    return window.localStorage.getItem(PAW_WALK_PATH_KEY);
  } catch {
    return null;
  }
}

export function writeStoredPath(d: string): void {
  try {
    window.localStorage.setItem(PAW_WALK_PATH_KEY, d);
  } catch {
    /* private mode / storage disabled — the drag just won't survive a reload */
  }
}

export function clearStoredPath(): void {
  try {
    window.localStorage.removeItem(PAW_WALK_PATH_KEY);
  } catch {
    /* nothing to do */
  }
}

/** Last values left in the tuner, so a dial-in survives a reload. */
export function readStoredTuning(): PawWalkTuning {
  if (typeof window === 'undefined') return PAW_WALK_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(PAW_WALK_TUNING_KEY);
    if (!raw) return PAW_WALK_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PawWalkTuning>;
    return { ...PAW_WALK_DEFAULTS, ...parsed };
  } catch {
    return PAW_WALK_DEFAULTS;
  }
}

export function writeStoredTuning(tuning: PawWalkTuning): void {
  try {
    window.localStorage.setItem(PAW_WALK_TUNING_KEY, JSON.stringify(tuning));
  } catch {
    /* private mode / storage disabled — the tuner still works for this session */
  }
}
