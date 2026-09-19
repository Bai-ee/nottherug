/**
 * Single source of truth for the meet & greet lead shape.
 *
 * `LeadSubmissionInput` is what a NEW submission must satisfy (validation.ts
 * enforces it, the booking form renders from the same option lists so they
 * cannot drift). `LeadRecord` is the broader READ shape: most fields are
 * optional because historical documents were written under older, looser
 * contracts (see the legacy fields below). `email` and `submittedAt` stay
 * required because lib/email/digest-template.ts (not owned by this task)
 * reads them unconditionally.
 */

export const LEAD_SCHEMA_VERSION = 2;

export const HONEYPOT_FIELD_NAME = 'website';

/**
 * The one area served, as shown to visitors. Surfaces that lock the field
 * (the welcome modal, the home page's full intake) display this instead of
 * offering NEIGHBORHOOD_OPTIONS — it is copy, never a submitted value.
 */
export const SERVICE_AREA_LABEL = 'Williamsburg, Brooklyn only';

export const NEIGHBORHOOD_OPTIONS = [
  'North Williamsburg',
  'South Williamsburg',
  'West Williamsburg',
  'Greenpoint',
  'Bushwick',
  'Bed-Stuy',
  'Park Slope',
  'East Williamsburg',
  'Other',
] as const;

export const SERVICE_INTEREST_OPTIONS = [
  'Daily Group Walks',
  'Puppy Visits',
  'Senior Dog Care',
  'Solo Visits',
  'Boarding / Sitting',
  'Not sure yet',
  'Walk & Talk Sessions',
] as const;

export const VACCINATION_OPTIONS = [
  'Yes — fully vaccinated',
  'Mostly — a few pending',
  'No',
  'Not sure',
] as const;

export const WALK_FREQUENCY_OPTIONS = [
  'Once a week',
  '2–3 times a week',
  'Daily (Mon–Fri)',
  'Daily including weekends',
  'As-needed / occasional',
] as const;

export const REACTIVITY_OPTIONS = [
  'Other dogs',
  'People / strangers',
  'Scooters',
  'Motorcycles',
  'Strollers',
  'All of the above',
] as const;

export const ALLERGY_OPTIONS = ['Chicken', 'Grain', 'Other'] as const;

export const LEAD_FIELD_LIMITS = {
  ownerName: 100,
  phone: 30,
  email: 254,
  dogName: 80,
  breedAge: 120,
  notes: 4000,
  source: 100,
  reactivity: 300,
  allergies: 300,
} as const;

export type NotificationOutcome = 'sent' | 'failed' | 'skipped';

export type LeadNotifications = {
  founder: NotificationOutcome;
  customer: NotificationOutcome;
};

/** The exact shape a validated new submission produces (see lib/leads/validation.ts). */
export type LeadSubmissionInput = {
  ownerName: string;
  phone: string;
  email: string;
  neighborhood: string;
  dogName: string;
  breedAge: string;
  serviceInterest: string;
  vaccinations: string;
  walkFrequency: string;
  notes: string;
  source: string;
  reactivity: string;
  allergies: string;
  phoneConsult: boolean;
};

/**
 * The read/storage shape. Most fields are optional so historical documents —
 * written before reactivity/allergies/phoneConsult existed, or under the old
 * spayNeuter/dogSocial/strangerSocial survey — still satisfy the type.
 */
export type LeadRecord = {
  id: string;
  type: string;
  schemaVersion?: number;
  submittedAt: string;
  email: string;
  ownerName?: string;
  phone?: string;
  neighborhood?: string;
  dogName?: string;
  breedAge?: string;
  serviceInterest?: string;
  vaccinations?: string;
  walkFrequency?: string;
  notes?: string;
  source?: string;
  reactivity?: string;
  allergies?: string;
  phoneConsult?: boolean;
  notifications?: LeadNotifications;
  /** Legacy survey fields. Never required, never defaulted on write — only rendered when present. */
  spayNeuter?: string;
  dogSocial?: string;
  strangerSocial?: string;
};

export function buildLeadRecord(
  id: string,
  submittedAt: string,
  submission: LeadSubmissionInput
): LeadRecord {
  return {
    id,
    type: 'meetgreet',
    schemaVersion: LEAD_SCHEMA_VERSION,
    submittedAt,
    ...submission,
  };
}

export type LeadDisplayField = {
  key: keyof LeadRecord;
  label: string;
  legacy: boolean;
};

/** Ordered field list shared by the admin table and CSV export. */
export const LEAD_DISPLAY_FIELDS: LeadDisplayField[] = [
  { key: 'submittedAt', label: 'Submitted', legacy: false },
  { key: 'source', label: 'Source', legacy: false },
  { key: 'ownerName', label: 'Owner', legacy: false },
  { key: 'email', label: 'Email', legacy: false },
  { key: 'phone', label: 'Phone', legacy: false },
  { key: 'neighborhood', label: 'Neighborhood', legacy: false },
  { key: 'dogName', label: 'Dog', legacy: false },
  { key: 'breedAge', label: 'Breed & age', legacy: false },
  { key: 'serviceInterest', label: 'Service interest', legacy: false },
  { key: 'vaccinations', label: 'Vaccinations', legacy: false },
  { key: 'walkFrequency', label: 'Walk frequency', legacy: false },
  { key: 'reactivity', label: 'Reactive around', legacy: false },
  { key: 'allergies', label: 'Allergies', legacy: false },
  { key: 'phoneConsult', label: 'Phone consult requested', legacy: false },
  { key: 'notes', label: 'Notes', legacy: false },
  { key: 'spayNeuter', label: 'Spayed / neutered (legacy)', legacy: true },
  { key: 'dogSocial', label: 'Around other dogs (legacy)', legacy: true },
  { key: 'strangerSocial', label: 'Around strangers (legacy)', legacy: true },
  { key: 'id', label: 'Lead ID', legacy: false },
];

export function formatLeadFieldValue(lead: LeadRecord, field: LeadDisplayField): string {
  const raw = lead[field.key];
  if (field.key === 'phoneConsult') return raw ? 'Yes' : 'No';
  if (raw === undefined || raw === null || raw === '') return '—';
  return String(raw);
}
