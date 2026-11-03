import { normalizeEmail } from '@/lib/leads/linkage';
import { recordTestReason, type TestContext, type TestReason } from './classification';

export interface RecordReview {
  /** Confirmed test, and why. Null = not test (or not reviewed). */
  testReason: TestReason | null;
  /** An admin explicitly confirmed this record as real. */
  confirmedReal: boolean;
  /** Other records in this list with the same email — a prompt to review,
   *  never a test classification (people do resubmit). */
  sameEmailCount: number;
}

/**
 * Per-record review info for an admin list (leads or alternate-time
 * requests). Keyed by record id; records without an id are skipped.
 */
export function buildLeadReview(rows: Array<Record<string, unknown>>, ctx: TestContext): Record<string, RecordReview> {
  const byEmail = new Map<string, number>();
  for (const r of rows) {
    if (r.type === 'capture') continue; // a capture is the same person's email row, not a second submission
    const email = typeof r.email === 'string' && r.email ? normalizeEmail(r.email) : '';
    if (email) byEmail.set(email, (byEmail.get(email) ?? 0) + 1);
  }
  const out: Record<string, RecordReview> = {};
  for (const r of rows) {
    if (typeof r.id !== 'string') continue;
    const email = typeof r.email === 'string' && r.email ? normalizeEmail(r.email) : '';
    const sameEmail = r.type === 'capture' ? 0 : Math.max(0, (byEmail.get(email) ?? 1) - 1);
    out[r.id] = {
      testReason: recordTestReason(r, ctx),
      confirmedReal: r.testOverride === false,
      sameEmailCount: email ? sameEmail : 0,
    };
  }
  return out;
}
