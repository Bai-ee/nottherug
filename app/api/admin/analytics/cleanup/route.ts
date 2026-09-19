import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse } from '@/lib/server/errors';
import { runAnalyticsRetentionCleanup } from '@/lib/analytics/retention';

export const runtime = 'nodejs';

// Deletes data (plan 003, "Owner decisions settled after A6": 13-month/48-hour
// retention). Not wired into vercel.json — that file's `crons: []` is
// deliberately empty (see plan 003) and stays that way here; running this is
// a manual operator step (curl/Postman with an admin bearer token) until a
// scheduling decision is made separately. Protected by the exact same admin
// boundary as GET /api/admin/analytics — see that route and
// lib/server/verifyAdmin.ts.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    // Same 401/403/500 distinction as the reporting route — see
    // lib/server/verifyAdmin.ts and app/api/admin/analytics/route.ts.
    return errorResponse(err);
  }

  // Dry run is opt-in (?dryRun=1), never the default: a plain POST is the
  // real, destructive call, and `dryRun` is echoed in the response body so
  // that is never ambiguous after the fact.
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  try {
    const result = await runAnalyticsRetentionCleanup(new Date(), dryRun);
    return NextResponse.json(result);
  } catch (err) {
    // errorResponse never echoes the raw error to the client; a Firestore
    // failure here is logged server-side and returned as a generic 500.
    return errorResponse(err);
  }
}
