import { fsQueryCollection } from '@/lib/server/firestoreRest';
import { ALT_TIME_COLLECTION } from '@/lib/booking/alternateTime';
import {
  isConvertedCapture,
  isOutstandingCapture,
  timeRequestToLead,
  type AdminLeadRecord,
} from '@/components/admin/leads/adminLeadRecord';
import { emptyTestContext, isTestRecord, loadTestContext, type TestContext } from '@/lib/testing/classification';

/**
 * Data for the evening lead report (app/api/cron/leads-evening): every lead of
 * the last 24 hours (questionnaire, time request, or email only), plus the
 * running list of every email-only signup still waiting on the questionnaire.
 *
 * A rolling 24 hours rather than the calendar day, so a lead that lands after
 * one evening's send is in the next one. Marked tests are left out; if the test
 * markers cannot be read, nothing is hidden and the report says so.
 */

export type ReportLeadKind = 'Questionnaire' | 'Time request' | 'Email only';

export type ReportLead = {
  kind: ReportLeadKind;
  submittedAt: string;
  email: string;
  name: string;
  phone: string;
  dog: string;
  neighborhood: string;
  source: string;
  bookedSelfReported: boolean;
  newsletterOptIn: boolean;
};

export type EveningReport = {
  windowStart: string;
  windowEnd: string;
  recent: ReportLead[];
  emailOnly: ReportLead[];
  testsHidden: boolean;
  truncated: boolean;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;
const READ_LIMIT = 1000;

function kindOf(lead: AdminLeadRecord): ReportLeadKind {
  if (lead.type === 'capture') return 'Email only';
  if (lead.type === 'time-request') return 'Time request';
  return 'Questionnaire';
}

function toReportLead(lead: AdminLeadRecord): ReportLead {
  return {
    kind: kindOf(lead),
    submittedAt: lead.submittedAt || '',
    email: lead.email || '',
    name: lead.ownerName || '',
    phone: lead.phone || '',
    dog: [lead.dogName, lead.breedAge].filter(Boolean).join(', '),
    neighborhood: lead.neighborhood || '',
    source: lead.source || '',
    bookedSelfReported: lead.bookedSelfReported === true,
    newsletterOptIn: lead.newsletterOptIn === true,
  };
}

/** Pure part, tested directly: filter and sort already-read rows. */
export function buildEveningReport(
  leads: AdminLeadRecord[],
  timeRequests: AdminLeadRecord[],
  ctx: TestContext,
  now: Date,
  opts: { testsHidden: boolean; truncated: boolean },
): EveningReport {
  const end = now.getTime();
  const start = end - WINDOW_MS;
  const isReal = (l: AdminLeadRecord) => !opts.testsHidden || !isTestRecord(l, ctx);
  const at = (l: AdminLeadRecord) => new Date(l.submittedAt || '').getTime();
  const newestFirst = (a: ReportLead, b: ReportLead) => b.submittedAt.localeCompare(a.submittedAt);

  // A converted capture's person already has their questionnaire row: never list them twice.
  const rows = [...leads.filter((l) => !isConvertedCapture(l)), ...timeRequests].filter(isReal);

  const recent = rows
    .filter((l) => {
      const t = at(l);
      return Number.isFinite(t) && t > start && t <= end;
    })
    .map(toReportLead)
    .sort(newestFirst);

  const emailOnly = rows.filter((l) => isOutstandingCapture(l)).map(toReportLead).sort(newestFirst);

  return {
    windowStart: new Date(start).toISOString(),
    windowEnd: now.toISOString(),
    recent,
    emailOnly,
    testsHidden: opts.testsHidden,
    truncated: opts.truncated,
  };
}

export async function loadEveningReport(now: Date = new Date()): Promise<EveningReport> {
  const leads = (await fsQueryCollection('leads', 'submittedAt', 'DESCENDING', READ_LIMIT)) as unknown as AdminLeadRecord[];
  const rawRequests = await fsQueryCollection(ALT_TIME_COLLECTION, 'createdAt', 'DESCENDING', READ_LIMIT);
  const timeRequests = rawRequests.map(timeRequestToLead).filter((r) => r.id);

  let ctx = emptyTestContext();
  let testsHidden = true;
  try {
    ctx = await loadTestContext();
  } catch {
    testsHidden = false;
  }
  return buildEveningReport(leads, timeRequests, ctx, now, {
    testsHidden,
    truncated: leads.length >= READ_LIMIT || rawRequests.length >= READ_LIMIT,
  });
}
