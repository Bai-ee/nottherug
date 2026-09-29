import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { BENCH_PEOPLE_CAP, getBenchSettings, listBenchPeople, toAdminPerson } from '@/lib/server/bench';
import { computeCoverage, gapSlotsFilled } from '@/lib/bench/coverage';

export const runtime = 'nodejs';

/**
 * Everyone on the bench pipeline, with the live settings and each person's
 * coverage fit computed here, so the admin page renders from one read.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }

  try {
    const [people, settings] = await Promise.all([listBenchPeople(), getBenchSettings()]);
    const coverage = computeCoverage(people, settings);
    return NextResponse.json({
      people: people.map((p) => ({ ...toAdminPerson(p), gapSlots: gapSlotsFilled(p, coverage) })),
      settings,
      underTargetSlots: coverage.filter((c) => c.status === 'under').length,
      cap: BENCH_PEOPLE_CAP,
    });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Bench load failed'));
  }
}
