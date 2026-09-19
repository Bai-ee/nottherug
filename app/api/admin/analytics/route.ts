import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { getAnalyticsReport, isReportRange, type ReportRange } from '@/lib/analytics/report';

export const runtime = 'nodejs';

const DEFAULT_RANGE: ReportRange = '7d';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    // 401 (no/invalid credential) vs 403 (verified but not whitelisted) vs
    // 500 (whitelist lookup itself failed) are distinguished by verifyAdmin
    // and preserved here — see lib/server/verifyAdmin.ts.
    return errorResponse(err);
  }

  const rangeParam = req.nextUrl.searchParams.get('range');
  const range = isReportRange(rangeParam) ? rangeParam : DEFAULT_RANGE;
  const includeTest = req.nextUrl.searchParams.get('testMode') === '1';

  try {
    const report = await getAnalyticsReport(range, { includeTest });
    return NextResponse.json(report);
  } catch (err) {
    // errorResponse never echoes the raw error to the client; a Firestore
    // failure here is logged server-side and returned as a generic 500.
    return errorResponse(err);
  }
}
