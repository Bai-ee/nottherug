/**
 * Query-string prefill for the meet & greet form.
 *
 * The welcome modal captures the booking form's first step — name, phone,
 * email, neighborhood — plus the package, then hands the visitor to /book with
 * those in the URL so the step is not asked twice. Values are only accepted when they match the
 * shared option lists in contract.ts (or, for the email, the same shape check
 * the API applies), so a hand-edited URL can never seed the form — or a lead —
 * with a value the API would reject.
 */
import { LEAD_FIELD_LIMITS, NEIGHBORHOOD_OPTIONS, SERVICE_INTEREST_OPTIONS } from './contract';
import { isValidEmail } from './validation';

export const BOOKING_PREFILL_PARAMS = {
  ownerName: 'ownerName',
  phone: 'phone',
  email: 'email',
  neighborhood: 'neighborhood',
  serviceInterest: 'serviceInterest',
  phoneConsult: 'phoneConsult',
  source: 'source',
} as const;

/** Sources allowed to override the page's own source label. */
export const BOOKING_PREFILL_SOURCES = ['welcome-modal', 'services-preview'] as const;

export type BookingPrefillValues = {
  ownerName?: string;
  phone?: string;
  email?: string;
  neighborhood?: string;
  serviceInterest?: string;
};

export type BookingPrefill = {
  values: BookingPrefillValues;
  /** True when the visitor chose "Book a call" over "Book now". */
  phoneConsult: boolean;
  source: string;
};

export type SearchParamsInput = Record<string, string | string[] | undefined>;

function readOption(
  params: SearchParamsInput,
  key: string,
  options: readonly string[]
): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  return options.includes(value) ? value : undefined;
}

/** Free-text values get length-capped before they are echoed into the form. */
function readText(params: SearchParamsInput, key: string, maxLength: number): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

/**
 * The email also gets the same shape check the API applies.
 */
function readEmail(params: SearchParamsInput): string | undefined {
  const raw = params[BOOKING_PREFILL_PARAMS.email];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LEAD_FIELD_LIMITS.email || !isValidEmail(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

export function parseBookingPrefill(params: SearchParamsInput, defaultSource: string): BookingPrefill {
  const values: BookingPrefillValues = {};

  const ownerName = readText(params, BOOKING_PREFILL_PARAMS.ownerName, LEAD_FIELD_LIMITS.ownerName);
  if (ownerName) values.ownerName = ownerName;

  const phone = readText(params, BOOKING_PREFILL_PARAMS.phone, LEAD_FIELD_LIMITS.phone);
  if (phone) values.phone = phone;

  const email = readEmail(params);
  if (email) values.email = email;

  const neighborhood = readOption(params, BOOKING_PREFILL_PARAMS.neighborhood, NEIGHBORHOOD_OPTIONS);
  if (neighborhood) values.neighborhood = neighborhood;

  const serviceInterest = readOption(params, BOOKING_PREFILL_PARAMS.serviceInterest, SERVICE_INTEREST_OPTIONS);
  if (serviceInterest) values.serviceInterest = serviceInterest;

  const rawPhoneConsult = params[BOOKING_PREFILL_PARAMS.phoneConsult];
  const phoneConsult = (Array.isArray(rawPhoneConsult) ? rawPhoneConsult[0] : rawPhoneConsult) === '1';

  const source = readOption(params, BOOKING_PREFILL_PARAMS.source, BOOKING_PREFILL_SOURCES);

  return { values, phoneConsult, source: source ?? defaultSource };
}

/** Builds the /book link the welcome modal sends the visitor to. */
export function buildBookingPrefillHref(
  values: BookingPrefillValues,
  source: string,
  phoneConsult = false
): string {
  const query = new URLSearchParams();
  if (values.ownerName) query.set(BOOKING_PREFILL_PARAMS.ownerName, values.ownerName);
  if (values.phone) query.set(BOOKING_PREFILL_PARAMS.phone, values.phone);
  if (values.email) query.set(BOOKING_PREFILL_PARAMS.email, values.email);
  if (values.neighborhood) query.set(BOOKING_PREFILL_PARAMS.neighborhood, values.neighborhood);
  if (values.serviceInterest) query.set(BOOKING_PREFILL_PARAMS.serviceInterest, values.serviceInterest);
  if (phoneConsult) query.set(BOOKING_PREFILL_PARAMS.phoneConsult, '1');
  query.set(BOOKING_PREFILL_PARAMS.source, source);
  return `/book?${query.toString()}`;
}
