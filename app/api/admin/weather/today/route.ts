import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import path from 'node:path';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';

/**
 * Today's Williamsburg weather for the analytics dashboard, read from the
 * same National Weather Service call the daily brief already makes
 * (not-the-rug-brief/services/weather.js — free, unauthenticated, and its
 * configured coordinates are Williamsburg even though the config labels them
 * "Brooklyn").
 *
 * It is deliberately its own route rather than a field on
 * /api/admin/analytics: that route is hot and imports nothing but the report,
 * so folding the CommonJS brief pipeline into it would drag the whole
 * not-the-rug-brief tree into a function that reloads on every range change.
 * Here a slow or failing forecast also cannot take the numbers down with it.
 *
 * Never runs the brief itself — that is the paid model pipeline.
 */
export const runtime = 'nodejs';

const CACHE_MS = 30 * 60 * 1000;

type WeatherLine = {
  line: string;
  tempF: number | null;
  precipPct: number | null;
  windMph: number | null;
  fetchedAt: string;
};

// One forecast is plenty for every admin who loads the page in the next half
// hour; NWS rate-limits by User-Agent and the outlook does not move that fast.
let cached: { at: number; value: WeatherLine } | null = null;

type WeatherSummary = {
  maxTempF?: number | null;
  minTempF?: number | null;
  maxPrecipChancePct?: number | null;
  maxWindMph?: number | null;
  operationalTakeaway?: string | null;
};

function loadBriefWeather() {
  const require = createRequire(path.join(process.cwd(), 'not-the-rug-brief/'));
  const { requireClientConfig } = require('./clients.js');
  const { fetchOperationalWeather } = require('./services/weather.js');
  return { requireClientConfig, fetchOperationalWeather };
}

/** "Williamsburg · 72°F · 20% chance of rain · wind 8 mph", skipping whatever
 *  the forecast did not give us rather than printing a blank figure. */
function buildLine(summary: WeatherSummary): string {
  const parts = ['Williamsburg'];
  if (typeof summary.maxTempF === 'number') parts.push(`${Math.round(summary.maxTempF)}°F`);
  if (typeof summary.maxPrecipChancePct === 'number') {
    parts.push(`${Math.round(summary.maxPrecipChancePct)}% chance of rain`);
  }
  if (typeof summary.maxWindMph === 'number') parts.push(`wind ${Math.round(summary.maxWindMph)} mph`);
  return parts.join(' · ');
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (error) {
    return errorResponse(error);
  }

  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.value);
  }

  try {
    const { requireClientConfig, fetchOperationalWeather } = loadBriefWeather();
    const report = await fetchOperationalWeather(requireClientConfig('not-the-rug'));
    const summary: WeatherSummary | null = report?.overall ?? report?.neighborhoods?.[0]?.summary ?? null;
    if (!summary) return NextResponse.json({ error: 'No forecast available' }, { status: 503 });

    const value: WeatherLine = {
      line: buildLine(summary),
      tempF: summary.maxTempF ?? null,
      precipPct: summary.maxPrecipChancePct ?? null,
      windMph: summary.maxWindMph ?? null,
      fetchedAt: new Date().toISOString(),
    };
    cached = { at: Date.now(), value };
    return NextResponse.json(value);
  } catch (error) {
    // A missing forecast is not an admin error worth a red banner; the
    // dashboard simply shows nothing in its place.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Weather lookup failed' },
      { status: 502 },
    );
  }
}
