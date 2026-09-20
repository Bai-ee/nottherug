import { LEAD_DISPLAY_FIELDS, type LeadRecord } from './contract';

/**
 * How much of the questionnaire a lead actually answered, and whether they
 * booked — the "is this person serious" signal the founder reads in the leads
 * table.
 *
 * Deliberately a count of real answers rather than a weighted score: the
 * inputs are a handful of yes/no facts, and a 0-100 number would invent
 * precision they cannot support. The words the table prints say exactly what
 * was counted.
 *
 * Pure: it reads a lead record and nothing else, so it is the same on the
 * server that stores it and in the admin table that displays it.
 */

/** The questions that count toward completeness — what the visitor was asked,
 *  minus every field the system fills in for them. `id` belongs here too: it
 *  is the document key, present on every record including an email-only
 *  capture, so counting it reported one answered question for someone who had
 *  answered none. */
const SYSTEM_FIELDS = new Set(['submittedAt', 'source', 'email', 'id']);

export const COUNTED_LEAD_FIELDS = LEAD_DISPLAY_FIELDS.filter(
  (f) => !f.legacy && !SYSTEM_FIELDS.has(f.key as string),
);

export interface LeadCompleteness {
  /** Questions answered, out of `total`. */
  answered: number;
  total: number;
  /** The keys that were answered, for the per-question signal. */
  answeredKeys: string[];
  /** True once every counted question has an answer. */
  complete: boolean;
}

function hasAnswer(lead: Partial<LeadRecord>, key: string): boolean {
  const value = (lead as Record<string, unknown>)[key];
  if (value === undefined || value === null) return false;
  // A deliberate "no" is an answer; an empty string is not.
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim().length > 0;
}

export function measureLeadCompleteness(lead: Partial<LeadRecord>): LeadCompleteness {
  const answeredKeys = COUNTED_LEAD_FIELDS.filter((f) => hasAnswer(lead, f.key as string)).map(
    (f) => f.key as string,
  );
  return {
    answered: answeredKeys.length,
    total: COUNTED_LEAD_FIELDS.length,
    answeredKeys,
    complete: answeredKeys.length === COUNTED_LEAD_FIELDS.length,
  };
}

/**
 * The one line the leads table prints. `booked` is the visitor's own browser
 * reporting a Calendly completion, which is a hint and not proof (see
 * lib/booking/onboarding-handoff.ts), so the wording never states it as fact.
 */
export function describeLeadQuality(lead: Partial<LeadRecord>, booked: boolean): string {
  const { answered, total } = measureLeadCompleteness(lead);
  const answers = `${answered} of ${total} answered`;
  return booked ? `Booked · ${answers}` : answers;
}
