import type { LeadRecord } from '@/lib/leads/contract';
import { measureLeadCompleteness, describeLeadQuality } from '@/lib/leads/completeness';

/**
 * The leads list now reads two kinds of Firestore document: complete
 * questionnaire submissions (`type: 'meetgreet'`, described by `LeadRecord`
 * in lib/leads/contract.ts) and partial email captures (`type: 'capture'`,
 * written by app/api/leads/capture/route.ts) recorded when someone gives an
 * email and goes to book on Calendly without answering the questionnaire.
 *
 * This is a read-only, admin-side extension of `LeadRecord` with the
 * capture-only fields. It does not change what either write route produces —
 * only what the admin list is allowed to read and how it is judged for
 * completeness.
 */
export type AdminLeadRecord = LeadRecord & {
  status?: 'partial' | 'converted';
  lastSeenAt?: string;
  /** The visitor's own browser reporting a Calendly completion — a hint,
   *  never proof. Anywhere this is shown it must read that way. */
  bookedSelfReported?: boolean;
  convertedLeadId?: string;
};

/** A capture whose person has since completed the questionnaire — their full
 *  lead is already in the list under its own id, so showing this row too
 *  would double-count them. */
export function isConvertedCapture(lead: Pick<AdminLeadRecord, 'type' | 'status'>): boolean {
  return lead.type === 'capture' && lead.status === 'converted';
}

/** A capture still waiting on the questionnaire — no name, dog, or phone was
 *  ever given, so the table reads it as "waiting on answers" rather than a
 *  lead with every column blank. */
export function isOutstandingCapture(lead: Pick<AdminLeadRecord, 'type' | 'status'>): boolean {
  return lead.type === 'capture' && !isConvertedCapture(lead);
}

/** The one line the table and CSV print for a lead's seriousness — words,
 *  never a score. `bookedSelfReported` only ever means "the visitor's browser
 *  said so," which is why it is folded into words via describeLeadQuality
 *  rather than shown as a fact on its own. */
export function leadQualityLabel(lead: Partial<AdminLeadRecord>): string {
  return describeLeadQuality(lead, lead.bookedSelfReported === true);
}

export function isLeadComplete(lead: Partial<AdminLeadRecord>): boolean {
  return measureLeadCompleteness(lead).complete;
}

function answeredCount(lead: Partial<AdminLeadRecord>): number {
  return measureLeadCompleteness(lead).answered;
}

/** Most-answered first, ties broken by newest — the sort the founder uses to
 *  see the serious leads before the barely-started ones. */
export function byCompletenessDesc(a: AdminLeadRecord, b: AdminLeadRecord): number {
  const diff = answeredCount(b) - answeredCount(a);
  if (diff !== 0) return diff;
  return (b.submittedAt || '').localeCompare(a.submittedAt || '');
}
