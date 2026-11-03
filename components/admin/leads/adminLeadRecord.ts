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
  /** Time-request rows only (type 'time-request', see timeRequestToLead). */
  requestStatus?: string;
  days?: string[];
  windows?: string[];
  timeZone?: string;
  contactPreference?: string;
  sourcePage?: string | null;
  attribution?: { src?: string; ref?: string; camp?: string };
  notification?: string;
  statusUpdatedAt?: string;
  /** Requester's confirmation email (time requests). */
  customerNotification?: string;
  /** "We have your email" message (captures). */
  acknowledgement?: string;
};

export const TIME_REQUEST_TYPE = 'time-request';

/** A "No suitable time? Request another time" submission shown in the leads list. */
export function isTimeRequest(lead: Pick<AdminLeadRecord, 'type'>): boolean {
  return lead.type === TIME_REQUEST_TYPE;
}

/**
 * Maps an alternateTimeRequests document onto the list's shape so both kinds
 * share one list, search, sort and export. Only shared meanings are mapped
 * (name → ownerName, note → notes, createdAt → submittedAt); everything
 * request-specific keeps its own field. The stored document is unchanged.
 */
export function timeRequestToLead(r: Record<string, unknown>): AdminLeadRecord {
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    id: str(r.id) ?? '',
    type: TIME_REQUEST_TYPE,
    submittedAt: str(r.createdAt) ?? '',
    email: str(r.email) ?? '',
    ownerName: str(r.name),
    phone: str(r.phone),
    notes: str(r.note),
    source: str(r.source),
    requestStatus: str(r.status) ?? 'new',
    statusUpdatedAt: str(r.statusUpdatedAt),
    days: list(r.days),
    windows: list(r.windows),
    timeZone: str(r.timeZone),
    contactPreference: str(r.contactPreference),
    sourcePage: str(r.sourcePage) ?? null,
    attribution: r.attribution && typeof r.attribution === 'object' ? (r.attribution as AdminLeadRecord['attribution']) : undefined,
    notification: str(r.notification),
    customerNotification: str(r.customerNotification),
    newsletterOptIn: r.newsletterOptIn === true ? true : undefined,
    newsletterOptInAt: str(r.newsletterOptInAt),
    testOverride: typeof r.testOverride === 'boolean' ? r.testOverride : undefined,
    testDeviceId: str(r.testDeviceId),
    sid: str(r.sid),
    vid: str(r.vid),
  } as AdminLeadRecord;
}

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

/** The booked hint always comes from the row's OWN `bookedSelfReported`: a
 *  converted lead carries it itself (the capture route copies it onto the lead,
 *  app/api/leads/capture/route.ts), and an unconverted capture row is its own
 *  source. The converted capture is never joined in — it is hidden from the list.
 *
 *  The one line the table and CSV print for a lead's seriousness — words,
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
