import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { fsQueryCollection } from '@/lib/server/firestoreRest';
import { isConvertedCapture, type AdminLeadRecord } from '@/components/admin/leads/adminLeadRecord';

export const runtime = 'nodejs';

// fsQueryCollection has no cursor support (see lib/leads/stats.ts), so this is a
// single bounded read, not a page. The cap is echoed in the response body so the
// client can say "most recent N" instead of silently truncating — kept as a
// plain local const (not exported) since Next's route.ts only recognizes HTTP
// method and route-config exports.
const LEADS_LIST_CAP = 500;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }

  try {
    const leads = (await fsQueryCollection(
      'leads',
      'submittedAt',
      'DESCENDING',
      LEADS_LIST_CAP,
    )) as unknown as AdminLeadRecord[];

    // A capture whose person has since completed the questionnaire has its
    // full lead already in this same read, under its own id — showing the
    // capture row too would double-count that person, so it is dropped here,
    // once, rather than in every consumer of this route.
    const visible = leads.filter((lead) => !isConvertedCapture(lead));

    return NextResponse.json({ leads: visible, cap: LEADS_LIST_CAP });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Lead load failed'));
  }
}
