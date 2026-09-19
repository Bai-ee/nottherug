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
 * Waypoints the current route was built from, in page order:
 *   ( 860,  14)  below the nav, top right
 *   ( 150,  42)  left across the hero video
 *   ( 840,  74)  back right, just under the video
 *   ( 200,  96)  left across the trust bar
 *   ( 850, 128)  right, alongside the featured product card
 *   ( 170, 168)  left, just under the product card
 *   ( 840, 210)  right, under the other rate cards
 *   ( 180, 243)  left, across "always included"
 *   ( 830, 285)  right, across the intake form
 *   ( 170, 322)  left, over the ratings marquee
 *   ( 840, 372)  right, into reviews
 *   ( 180, 428)  left, across how it works
 *   ( 860, 490) ( 170, 555) ( 850, 620) ( 180, 690) ( 840, 755)  reviews run
 *   ( 190, 820)  left, into closing trust
 *   ( 830, 880)  right
 *   ( 200, 935)  left, contact sheet
 *   ( 700, 995)  exit, bottom of the page
 */
export const HOME_PAW_WALK_PATH =
  'M500,4.2 C500,9.7 500,26.3 500,37.4 500,48.5 341.767,59.596 340.669,70.698 339.568,81.796 321.807,90.445 339.402,97.35 347.669,100.594 314.044,122.872 327.468,128.467 355.652,140.214 515.278,154.72 520.249,174.705 522.9,185.369 568.378,200.095 604.68,202.897 641.079,205.696 724.371,204.708 751.671,207.509 778.971,210.308 783.012,196.214 794.012,203.115 805.012,210.015 777.656,215.938 773.857,227.038 770.056,238.138 958.9,255.1 937.3,262 915.7,268.9 879.1,267.5 837.5,270.3 795.9,273.1 729.3,275.8 687.7,278.6 646.1,281.4 608.7,284.1 587.9,286.9 567.1,289.7 562.8,289.6 563,295.2 563.2,300.8 567.4,314.6 589.2,320.2 611,325.8 650.3,325.7 694,328.5 737.7,331.3 807.5,334 851.2,336.8 894.9,339.6 934.4,342.4 956,345.2 977.6,348 978.8,346.6 980.9,353.5 983,360.4 971.4,375.6 968.5,386.7 965.6,397.8 963.5,408.9 963.5,420 963.5,431.1 888.526,435.5 883.828,445.202 879.126,454.899 738.925,481.242 701.661,483.31 663.165,485.444 514.652,490.726 476.371,498.134 457.599,501.762 212.777,530.728 178.092,542.393 151.717,551.262 131.437,563.206 266.404,568.171 277.129,568.565 330.709,577.331 342.027,577.722 381.316,579.077 450.533,579.115 439.634,581.917 428.73,584.716 453.679,585.558 437.28,589.658 420.879,593.857 448.382,593.688 408.882,597.788 369.382,601.987 493.182,599.352 446.583,602.152 399.982,604.951 485.581,603.248 461.281,606.049 436.98,608.848 496.4,603.929 500,608.129 503.6,612.328 532.1,607.1 550.7,611.3 569.3,615.4 594.6,616.8 611.5,619.6 628.4,622.4 643.6,621 652,627.9 660.4,634.8 657.4,654.3 662.1,661.2 666.9,668.1 665.1,666.7 680.5,669.5 695.9,672.3 723.5,675 754.2,677.8 784.9,680.6 834,683.3 864.8,686.1 895.6,688.9 923.4,691.7 938.9,694.5 954.4,697.3 954.2,695.9 957.7,702.8 961.2,709.7 957.4,724.9 960.1,736 962.9,747.1 982.4,761 974.2,769.3 966,777.6 960.6,781.7 910.7,785.9 860.8,790.1 772.1,791.5 674.8,794.3 577.5,797.1 423.6,799.8 327.1,802.6 230.7,805.4 144.2,808.1 96.1,810.9 48,813.7 48,812.3 38.4,819.2 28.8,826.1 36.2,841.4 38.4,852.5 40.6,863.6 40.5,878.8 51.4,885.7 62.3,892.6 82,891.3 103.8,894.1 125.6,896.9 159.2,899.6 182.2,902.4 205.2,905.2 224.9,907.9 241.9,910.7 258.9,913.5 270,916.2 284.4,919 298.8,921.8 316.6,924.5 328.4,927.3 340.2,930.1 354.1,931.4 355,935.6 355.9,939.8 339.6,944 333.7,952.3 327.8,960.6 321.7,978.6 319.3,985.5 316.9,992.4 319.3,992.5 319.3,993.9';

/** The normalised box HOME_PAW_WALK_PATH is drawn in. */
export const PAW_WALK_VIEWBOX = '0 0 1000 1000';
export const PAW_WALK_UNITS = 1000;

/**
 * Where the walk becomes visible. Prints sitting above this section's top are
 * laid out but never revealed, so the hero scrolls clean and the first paw
 * lands as the product section comes into view.
 */
export const PAW_WALK_GATE_SELECTOR = '#home-personalized-care-section';

/**
 * Where the first stretch of the walk stops — the prints pass under this card
 * and end there.
 */
export const PAW_WALK_END_SELECTOR = '#home-group-walk-feature-card';

export interface PawWalkWindow {
  /** Selector for the element the window opens at (its TOP edge). */
  from: string;
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
  // Rates band: gate down to the group walk card, at the tuner's opacity.
  { from: PAW_WALK_GATE_SELECTOR, to: PAW_WALK_END_SELECTOR },
  // Scrolling quote marquee → reviews → process steps, ending under the black
  // concepts marquee that closes that run. It opens at the marquee rather than
  // the reviews section so the trail picks up right under the quotes instead of
  // after a gap.
  { from: '#home-proof-marquee', to: '#home-walk-concepts-marquee' },
];

/**
 * Bands of the home page dark enough that an ink-coloured print disappears on
 * them. Prints landing inside one are inverted so they read as chalk instead.
 * Matched against #page-home's direct children, so add a section here the same
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
