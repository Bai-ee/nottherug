/**
 * The dashboard's weather line reads from the neighbourhood summary, which is
 * the only part of the NWS report that carries numbers — a regression here
 * printed the word "Williamsburg" and nothing else.
 */
import { describe, it, expect } from 'vitest';
import { buildWeatherLine, leadCondition } from '@/lib/analytics/weatherLine';

describe('buildWeatherLine', () => {
  it('reads a real neighbourhood summary', () => {
    expect(
      buildWeatherLine({
        summary: 'Light Rain, Periods Of Light Rain, Periods Of Rain | 66–69F | up to 92% precip chance',
        maxTempF: 69,
        minTempF: 66,
        maxPrecipChancePct: 92,
        maxWindMph: 13,
      }),
    ).toBe('Williamsburg · Light Rain · 66–69°F · 92% chance of rain · wind 13 mph');
  });

  it('gives one temperature when the range is flat', () => {
    expect(buildWeatherLine({ summary: 'Sunny', maxTempF: 70, minTempF: 70 })).toBe('Williamsburg · Sunny · 70°F');
  });

  it('skips the figures the forecast did not provide', () => {
    expect(buildWeatherLine({ summary: 'Cloudy', maxTempF: null, maxPrecipChancePct: null })).toBe(
      'Williamsburg · Cloudy',
    );
  });

  it('returns nothing when there is no weather to state', () => {
    expect(buildWeatherLine({})).toBeNull();
    expect(buildWeatherLine(null)).toBeNull();
  });

  it('takes the leading condition out of a list', () => {
    expect(leadCondition('Light Rain, Periods Of Rain | 66F')).toBe('Light Rain');
    expect(leadCondition(null)).toBeNull();
  });
});
