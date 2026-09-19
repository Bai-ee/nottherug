import { describe, expect, it } from 'vitest';
import { pawStepsForRouteLength } from '@/lib/marketing/paw-walk-path';

// Pure arithmetic half of the home paw-walk print-count estimate (plans/010
// P3.1: "compute required step count from the actual path and stride" rather
// than always rendering a fixed worst-case allocation). The DOM-measuring
// half (estimateRequiredPawSteps in useHomePawWalk.ts) needs real SVG
// geometry APIs jsdom doesn't implement, so it is covered by the Playwright
// home-page smoke instead; this is the part that is pure math.

describe('pawStepsForRouteLength', () => {
  it('divides route length by stride and rounds up', () => {
    // 1000px route, 33px paw, 3.7x stride => stride 122.1px => 8.19 steps.
    expect(pawStepsForRouteLength(1000, 33, 3.7)).toBe(9);
  });

  it('returns 0 for a zero-length route', () => {
    expect(pawStepsForRouteLength(0, 33, 3.7)).toBe(0);
  });

  it('returns 0 for a non-finite or negative route length', () => {
    expect(pawStepsForRouteLength(Number.NaN, 33, 3.7)).toBe(0);
    expect(pawStepsForRouteLength(-500, 33, 3.7)).toBe(0);
    expect(pawStepsForRouteLength(Number.POSITIVE_INFINITY, 33, 3.7)).toBe(0);
  });

  it('returns 0 when the stride collapses to zero or less', () => {
    expect(pawStepsForRouteLength(1000, 0, 3.7)).toBe(0);
    expect(pawStepsForRouteLength(1000, 33, 0)).toBe(0);
    expect(pawStepsForRouteLength(1000, -10, 3.7)).toBe(0);
  });

  it('needs more steps for a smaller paw (shorter stride)', () => {
    const bigPaw = pawStepsForRouteLength(20000, 60, 3.7);
    const smallPaw = pawStepsForRouteLength(20000, 20, 3.7);
    expect(smallPaw).toBeGreaterThan(bigPaw);
  });

  it('needs more steps for a longer route at a fixed stride', () => {
    const short = pawStepsForRouteLength(5000, 33, 3.7);
    const long = pawStepsForRouteLength(20000, 33, 3.7);
    expect(long).toBeGreaterThan(short);
  });
});
