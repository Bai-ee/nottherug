/**
 * Pure request-shape validation for the meet & greet intake. No server
 * imports — this must be safely importable from the client form too, so the
 * option lists and length limits used for step validation can never drift
 * from what the API enforces.
 */
import {
  HONEYPOT_FIELD_NAME,
  LEAD_FIELD_LIMITS,
  NEIGHBORHOOD_OPTIONS,
  SERVICE_INTEREST_OPTIONS,
  VACCINATION_OPTIONS,
  WALK_FREQUENCY_OPTIONS,
  type LeadSubmissionInput,
} from './contract';

export type LeadFieldError = { field: string; message: string };

export type LeadParseResult =
  | { ok: true; data: LeadSubmissionInput }
  | { ok: false; errors: LeadFieldError[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  errors: LeadFieldError[]
): string {
  const raw = body[field];
  if (typeof raw !== 'string') {
    errors.push({ field, message: `${field} must be text` });
    return '';
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    errors.push({ field, message: `${field} is required` });
    return '';
  }
  if (trimmed.length > maxLength) {
    errors.push({ field, message: `${field} is too long` });
    return trimmed;
  }
  return trimmed;
}

function readEnumField(
  body: Record<string, unknown>,
  field: string,
  options: readonly string[],
  errors: LeadFieldError[]
): string {
  const raw = body[field];
  if (typeof raw !== 'string') {
    errors.push({ field, message: `${field} must be text` });
    return '';
  }
  const trimmed = raw.trim();
  if (!options.includes(trimmed)) {
    errors.push({ field, message: `${field} must be one of the offered options` });
    return '';
  }
  return trimmed;
}

function readOptionalString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  errors: LeadFieldError[],
  fallback: string
): string {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw !== 'string') {
    errors.push({ field, message: `${field} must be text` });
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed.length > maxLength) {
    errors.push({ field, message: `${field} is too long` });
    return trimmed;
  }
  return trimmed;
}

function readBoolean(body: Record<string, unknown>, field: string, errors: LeadFieldError[]): boolean {
  const raw = body[field];
  if (typeof raw !== 'boolean') {
    errors.push({ field, message: `${field} must be true or false` });
    return false;
  }
  return raw;
}

export function parseLeadSubmission(input: unknown): LeadParseResult {
  if (!isPlainObject(input)) {
    return { ok: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
  }

  const honeypot = input[HONEYPOT_FIELD_NAME];
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { ok: false, errors: [{ field: HONEYPOT_FIELD_NAME, message: 'Invalid submission' }] };
  }

  const errors: LeadFieldError[] = [];

  const ownerName = readRequiredString(input, 'ownerName', LEAD_FIELD_LIMITS.ownerName, errors);
  const phone = readRequiredString(input, 'phone', LEAD_FIELD_LIMITS.phone, errors);
  const rawEmail = readRequiredString(input, 'email', LEAD_FIELD_LIMITS.email, errors);
  if (rawEmail && !isValidEmail(rawEmail)) {
    errors.push({ field: 'email', message: 'email must be a valid email address' });
  }
  const email = rawEmail.toLowerCase();
  const neighborhood = readEnumField(input, 'neighborhood', NEIGHBORHOOD_OPTIONS, errors);
  const dogName = readRequiredString(input, 'dogName', LEAD_FIELD_LIMITS.dogName, errors);
  const breedAge = readRequiredString(input, 'breedAge', LEAD_FIELD_LIMITS.breedAge, errors);
  const serviceInterest = readEnumField(input, 'serviceInterest', SERVICE_INTEREST_OPTIONS, errors);
  const vaccinations = readEnumField(input, 'vaccinations', VACCINATION_OPTIONS, errors);
  const walkFrequency = readEnumField(input, 'walkFrequency', WALK_FREQUENCY_OPTIONS, errors);
  const notes = readOptionalString(input, 'notes', LEAD_FIELD_LIMITS.notes, errors, '');
  const source = readOptionalString(input, 'source', LEAD_FIELD_LIMITS.source, errors, 'unknown');
  const reactivity = readOptionalString(input, 'reactivity', LEAD_FIELD_LIMITS.reactivity, errors, 'None noted');
  const allergies = readOptionalString(input, 'allergies', LEAD_FIELD_LIMITS.allergies, errors, 'None');
  const phoneConsult = readBoolean(input, 'phoneConsult', errors);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      ownerName,
      phone,
      email,
      neighborhood,
      dogName,
      breedAge,
      serviceInterest,
      vaccinations,
      walkFrequency,
      notes,
      source,
      reactivity,
      allergies,
      phoneConsult,
    },
  };
}
