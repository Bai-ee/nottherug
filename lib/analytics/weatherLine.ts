/**
 * Formats the one line of Williamsburg weather the analytics dashboard shows,
 * from the National Weather Service report the daily brief already fetches
 * (not-the-rug-brief/services/weather.js).
 *
 * The numbers live on the neighbourhood's own summary; the report's `overall`
 * block carries only prose and flags, so reading them from there silently
 * produced a line with no weather in it.
 */

export interface NeighborhoodWeatherSummary {
  /** e.g. "Light Rain, Periods Of Light Rain | 66–69F | up to 92% precip chance | winds up to 13 mph" */
  summary?: string | null;
  maxTempF?: number | null;
  minTempF?: number | null;
  maxPrecipChancePct?: number | null;
  maxWindMph?: number | null;
}

/** The forecast's leading condition, e.g. "Light Rain" out of a longer list. */
export function leadCondition(summary?: string | null): string | null {
  if (!summary) return null;
  const head = summary.split('|')[0]?.split(',')[0]?.trim();
  return head ? head : null;
}

/** Skips whatever the forecast did not give us rather than printing a blank. */
export function buildWeatherLine(summary: NeighborhoodWeatherSummary | null): string | null {
  if (!summary) return null;

  const parts: string[] = ['Williamsburg'];

  const condition = leadCondition(summary.summary);
  if (condition) parts.push(condition);

  const { minTempF, maxTempF } = summary;
  if (typeof maxTempF === 'number' && typeof minTempF === 'number' && minTempF !== maxTempF) {
    parts.push(`${Math.round(minTempF)}–${Math.round(maxTempF)}°F`);
  } else if (typeof maxTempF === 'number') {
    parts.push(`${Math.round(maxTempF)}°F`);
  }

  if (typeof summary.maxPrecipChancePct === 'number') {
    parts.push(`${Math.round(summary.maxPrecipChancePct)}% chance of rain`);
  }
  if (typeof summary.maxWindMph === 'number') parts.push(`wind ${Math.round(summary.maxWindMph)} mph`);

  // "Williamsburg" on its own is not weather.
  return parts.length > 1 ? parts.join(' · ') : null;
}
