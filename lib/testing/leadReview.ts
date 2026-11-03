import { normalizeEmail } from '@/lib/leads/linkage';
import { recordTestReason, type TestContext, type TestReason } from './classification';

export interface RecordReview {
  /** Confirmed test, and why. Null = not test (or not reviewed). */
  testReason: TestReason | null;
  /** An admin explicitly confirmed this record as real. */
  confirmedReal: boolean;
  /** Other records OF THE SAME KIND with the same email — a prompt to review,
   *  never a test classification (people do resubmit). */
  sameEmailCount: number;
  /** The same person's other records (by email), any kind — e.g. a time
   *  request and a questionnaire. Context, not a duplicate. */
  related: Array<{ id: string; type: string; submittedAt: string }>;
  /** Consent given on this record (lib/leads/consent.ts). */
  newsletter: boolean;
  contactOk: boolean;
}

/** Questionnaires (and legacy rows with no type) count together; every other kind on its own. */
function kindOf(r: Record<string, unknown>): string {
  return typeof r.type === 'string' && r.type !== 'meetgreet' ? r.type : 'meetgreet';
}

/**
 * Per-record review info for an admin list (leads or alternate-time
 * requests). Keyed by record id; records without an id are skipped.
 */
export function buildLeadReview(rows: Array<Record<string, unknown>>, ctx: TestContext): Record<string, RecordReview> {
  const byKindEmail = new Map<string, number>();
  const byEmail = new Map<string, Array<{ id: string; type: string; submittedAt: string }>>();
  for (const r of rows) {
    const email = typeof r.email === 'string' && r.email ? normalizeEmail(r.email) : '';
    if (!email) continue;
    if (typeof r.id === 'string') {
      const list = byEmail.get(email) ?? [];
      list.push({ id: r.id, type: kindOf(r), submittedAt: typeof r.submittedAt === 'string' ? r.submittedAt : '' });
      byEmail.set(email, list);
    }
    if (r.type === 'capture') continue; // a capture is the same person's email row, not a second submission
    const key = `${kindOf(r)}|${email}`;
    byKindEmail.set(key, (byKindEmail.get(key) ?? 0) + 1);
  }
  const out: Record<string, RecordReview> = {};
  for (const r of rows) {
    if (typeof r.id !== 'string') continue;
    const email = typeof r.email === 'string' && r.email ? normalizeEmail(r.email) : '';
    const sameEmail = r.type === 'capture' ? 0 : Math.max(0, (byKindEmail.get(`${kindOf(r)}|${email}`) ?? 1) - 1);
    out[r.id] = {
      testReason: recordTestReason(r, ctx),
      confirmedReal: r.testOverride === false,
      sameEmailCount: email ? sameEmail : 0,
      related: email ? (byEmail.get(email) ?? []).filter((x) => x.id !== r.id) : [],
      newsletter: r.newsletterOptIn === true,
      contactOk: r.contactOptIn === true,
    };
  }
  return out;
}
