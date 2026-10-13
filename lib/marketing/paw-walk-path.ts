/**
 * The route the home-page paw trail walks.
 *
 * Coordinate space is deliberately NOT pixels: the path is authored in a
 * normalised 1000 x 1000 box that is stretched over #page-home (x: 0 = left
 * edge, 1000 = right edge; y: 0 = top of the page, 1000 = bottom). That keeps
 * the route stable when the page gets taller or shorter — a waypoint at
 * y = 322 stays on the ratings marquee whether the page is 9,000px or
 * 12,000px tall.
 *
 * To re-draw it: load the home page with `?pawpath` in dev. The path turns
 * visible and GSAP's MotionPathHelper makes its points and handles draggable;
 * the paws re-walk the route live as you drag. When it looks right, run
 * `copy(__pawWalkPath())` in the console and paste the result over
 * HOME_PAW_WALK_PATH below.
 *
 * The current route is a straight line down the centre of the page (x = 500),
 * from just under the nav to the bottom. The prints alternate left and right of
 * it, so the walk reads as one dog's trail down the middle of every section.
 */
export const HOME_PAW_WALK_PATH = 'M500,4 C500,330 500,670 500,995';

/** The normalised box HOME_PAW_WALK_PATH is drawn in. */
export const PAW_WALK_VIEWBOX = '0 0 1000 1000';
export const PAW_WALK_UNITS = 1000;

export interface PawWalkWindow {
  /** Selector for the element the window opens at. */
  from: string;
  /** Which edge of `from` opens the window. Defaults to its top. */
  fromEdge?: 'top' | 'bottom';
  /** Pixels added to the opening edge. Negative opens the window higher up. */
  fromOffset?: number;
  /** Selector for the element it closes at (its BOTTOM edge). */
  to: string;
  /**
   * Opacity override for prints inside this window. Left unset on purpose for
   * the shipped windows — the tuner's opacity is the single control, so the
   * trail reads the same everywhere it is visible.
   */
  opacity?: number;
}

/**
 * The stretches of the page the trail is visible on. Everything outside them is
 * still walked — the stride keeps advancing, so prints inside a window land
 * exactly where they would if the whole route were shown — but stays hidden,
 * which is what keeps the paws off the green bands.
 *
 * Windows are matched against #page-home's descendants, so name an element the
 * same way you would in CSS.
 */
export const PAW_WALK_WINDOWS: ReadonlyArray<PawWalkWindow> = [
  // One unbroken stretch: from 220px above the bottom edge of the hero video all the way down
  // to the contact sheet ("A little about you"), where the route finishes under
  // the form. Prints sit above every section background and below all content
  // (see the cityscape / paw-walk layering notes in app/globals.css), so
  // the trail always passes under text, images and fields.
  { from: '#hero-polaroid-frame', fromEdge: 'bottom', fromOffset: -220, to: '#home-contact-sheet-section' },
];

/**
 * Bands of the home page dark enough that an ink-coloured print disappears on
 * them. Prints landing inside one are inverted so they read as chalk instead.
 * Matched against #page-home's descendants, so add a section here the same
 * way you would name it in CSS. The hero is deliberately absent — its photo
 * treatment is light sepia, not dark.
 */
export const DARK_SECTION_SELECTOR =
  '.trust-bar, #home-team-section, #home-closing-trust-section, #home-contact-sheet-section';

/**
 * Pure arithmetic half of the paw-print DOM-count estimate: given the route's
 * on-screen pixel length and the current stride, how many `.home-paw-step`
 * prints are needed to walk the whole thing. Kept separate from the
 * DOM-measuring half (components/marketing/hooks/useHomePawWalk.ts,
 * `estimateRequiredPawSteps`) so this part — the part a unit test can exercise
 * without a real SVG layout engine — is covered directly.
 */
export function pawStepsForRouteLength(routeLength: number, pawSize: number, strideRatio: number): number {
  const stride = pawSize * strideRatio;
  if (!Number.isFinite(routeLength) || routeLength <= 0 || !Number.isFinite(stride) || stride <= 0) {
    return 0;
  }
  return Math.ceil(routeLength / stride);
}
