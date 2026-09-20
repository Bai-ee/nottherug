import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import path from 'node:path';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { buildWeatherLine, type NeighborhoodWeatherSummary } from '@/lib/analytics/weatherLine';

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

interface WeatherLine {
  line: string;
  tempF: number | null;
  precipPct: number | null;
  windMph: number | null;
  fetchedAt: string;
}

// One forecast is plenty for every admin who loads the page in the next half
// hour; NWS rate-limits by User-Agent and the outlook does not move that fast.
let cached: { at: number; value: WeatherLine } | null = null;

function loadBriefWeather() {
  const requireFromBrief = createRequire(path.join(process.cwd(), 'not-the-rug-brief/'));
  const { requireClientConfig } = requireFromBrief('./clients.js');
  const { fetchOperationalWeather } = requireFromBrief('./services/weather.js');
  return { requireClientConfig, fetchOperationalWeather };
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

    // The figures live on the neighbourhood's own summary; report.overall
    // carries only prose and flags, so reading them from there returns a line
    // with no weather in it.
    const summary: NeighborhoodWeatherSummary | null = report?.neighborhoods?.[0]?.summary ?? null;
    const line = buildWeatherLine(summary);
    if (!summary || !line) {
      return NextResponse.json({ error: 'No forecast available' }, { status: 503 });
    }

    const value: WeatherLine = {
      line,
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
