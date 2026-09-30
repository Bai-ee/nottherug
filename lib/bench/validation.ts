/**
 * Request-shape validation for the bench. No server imports, so the public
 * form runs the same checks per step that the apply route enforces.
 */
import {
  APPLICANT_SOURCES,
  BENCH_FIELD_LIMITS,
  HONEYPOT_FIELD_NAME,
  MULTI_DOG_OPTIONS,
  NOTICE_OPTIONS,
  NOTIFY_OPTIONS,
  PHYSICAL_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  SCHEDULE_OPTIONS,
  UTM_ALLOWLIST,
  WORK_TYPE_OPTIONS,
  YES_NO,
  YES_NO_EXPLAIN,
  YES_SOMETIMES_NO,
  type ApplicantSource,
  type ApplicantUtm,
  type AvailabilitySlot,
  type BenchApplicationInput,
  type BenchArea,
  type BenchSettings,
  type OnCallAnswers,
  type TimeBlock,
  type WorkType,
} from './contract';

export type FieldError = { field: string; message: string };

export type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: FieldError[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** US numbers only: 10 digits, or 11 starting with 1. Returns E.164 or null. */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  body: Record<string, unknown>,
  field: string,
  max: number,
  errors: FieldError[],
  { required = true, label = field }: { required?: boolean; label?: string } = {},
): string {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') {
    if (required) errors.push({ field, message: `${label} is required` });
    return '';
  }
  if (typeof raw !== 'string') {
    errors.push({ field, message: `${label} must be text` });
    return '';
  }
  const trimmed = raw.trim();
  if (required && !trimmed) errors.push({ field, message: `${label} is required` });
  if (trimmed.length > max) errors.push({ field, message: `${label} is too long` });
  return trimmed;
}

function readOption<T extends string>(
  body: Record<string, unknown>,
  field: string,
  options: readonly { value: T }[],
  label: string,
  errors: FieldError[],
): T {
  const raw = body[field];
  const match = options.find((o) => o.value === raw);
  if (!match) {
    errors.push({ field, message: `Please answer: ${label}` });
    return options[0].value;
  }
  return match.value;
}

/** Allowlisted, de-duplicated work types; null when the value is not a list of known types. */
function readWorkTypes(raw: unknown): WorkType[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = WORK_TYPE_OPTIONS.map((o) => o.value) as readonly string[];
  const out: WorkType[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !allowed.includes(item)) return null;
    if (!out.includes(item as WorkType)) out.push(item as WorkType);
  }
  return out;
}

export function readAvailability(raw: unknown, blocks: TimeBlock[]): AvailabilitySlot[] | null {
  if (!Array.isArray(raw)) return null;
  const blockKeys = new Set(blocks.map((b) => b.key));
  const seen = new Set<string>();
  const out: AvailabilitySlot[] = [];
  for (const item of raw) {
    if (!isPlainObject(item)) return null;
    const { weekday, block } = item;
    if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
    if (typeof block !== 'string' || !blockKeys.has(block)) return null;
    const key = `${weekday}:${block}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ weekday, block });
  }
  return out;
}

/** Keeps only allowlisted UTM values; anything else is dropped, never stored. */
export function readUtm(raw: unknown): ApplicantUtm {
  if (!isPlainObject(raw)) return {};
  const out: ApplicantUtm = {};
  for (const key of ['source', 'medium', 'campaign'] as const) {
    const value = raw[key];
    const allowed = UTM_ALLOWLIST[key] as readonly string[];
    if (typeof value === 'string' && allowed.includes(value.toLowerCase())) out[key] = value.toLowerCase();
  }
  return out;
}

export function readSource(raw: unknown, utm: ApplicantUtm): ApplicantSource {
  if (typeof raw === 'string' && (APPLICANT_SOURCES as readonly string[]).includes(raw)) {
    return raw as ApplicantSource;
  }
  if (utm.source === 'indeed') return 'indeed';
  if (utm.source === 'referral') return 'referral';
  return 'website';
}

/** A real calendar date (YYYY-MM-DD) within the next two years; past dates are allowed as "any time". */
function isReasonableDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const time = Date.parse(`${value}T12:00:00Z`);
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return false;
  return time < Date.now() + 2 * 365 * 86_400_000;
}

/** The field groups the public form validates one step at a time, in form order. */
export const APPLICATION_STEP_FIELDS: string[][] = [
  ['fullName', 'email', 'phone', 'homeNeighborhood', 'travelToWilliamsburg', 'travelExplain'],
  [
    'workTypes', 'weeklyHoursWanted', 'scheduleType', 'regularStartDate',
    'cover24h', 'availability', 'noticeNeeded', 'sameDayEmergency', 'responseSpeed', 'responseSpeedOther',
    'notifyBy', 'travelTime', 'weeklyCapacity', 'recurringCommitments', 'trainingStartDate',
  ],
  ['experience', 'specialDogExperience', 'multiDogComfort', 'physicalDuties'],
  [
    'willingTraining', 'phoneProtocol', 'phoneProtocolExplain',
    'scenarioRefusesToLeave', 'scenarioLooseHarness', 'scenarioCantMakeShift',
  ],
  ['whyOnCall', 'experienceSummary', 'anythingElse', 'questionsForUs', 'confirmed'],
];

/**
 * Validates a public walker application against the live time blocks.
 * Answers that end an application (can't
 * travel, won't train, etc.) are valid answers, not errors: lib/bench/knockouts.ts decides
 * what they mean.
 */
export function parseApplication(
  input: unknown,
  settings: Pick<BenchSettings, 'timeBlocks'>,
): ParseResult<BenchApplicationInput> {
  if (!isPlainObject(input)) {
    return { ok: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
  }
  const honeypot = input[HONEYPOT_FIELD_NAME];
  if (typeof honeypot === 'string' && honeypot.trim()) {
    return { ok: false, errors: [{ field: HONEYPOT_FIELD_NAME, message: 'Invalid submission' }] };
  }

  const errors: FieldError[] = [];
  const L = BENCH_FIELD_LIMITS;
  const text = (field: string, label: string, max: number = L.shortText, required = true) =>
    readString(input, field, max, errors, { label, required });

  const fullName = text('fullName', 'Full name', L.fullName);
  const email = text('email', 'Email address', L.email).toLowerCase();
  if (email && !isValidEmail(email)) errors.push({ field: 'email', message: 'Please enter a valid email address' });
  const phoneRaw = text('phone', 'Phone number', L.phone);
  const phoneE164 = phoneRaw ? toE164(phoneRaw) : null;
  if (phoneRaw && !phoneE164) errors.push({ field: 'phone', message: 'Please enter a 10-digit US phone number' });

  const homeNeighborhood = text('homeNeighborhood', 'What neighborhood do you live in?');
  const travelToWilliamsburg = readOption(input, 'travelToWilliamsburg', YES_NO_EXPLAIN, 'can you reliably travel to Williamsburg?', errors);
  const travelExplain = text('travelExplain', 'Please explain your travel to Williamsburg', L.explain, travelToWilliamsburg === 'explain');

  const workTypes = readWorkTypes(input.workTypes);
  if (!workTypes?.length) errors.push({ field: 'workTypes', message: 'Please choose the kind of work you are interested in' });
  // Regular-schedule questions apply only to part-time and full-time roles.
  const wantsRegular = Boolean(workTypes?.some((t) => t === 'part_time' || t === 'full_time'));
  const weeklyHoursWanted = wantsRegular ? text('weeklyHoursWanted', 'How many hours per week would you like?') : '';
  const scheduleType = wantsRegular
    ? readOption(input, 'scheduleType', SCHEDULE_OPTIONS, 'which schedule do you prefer?', errors)
    : '';
  const regularStartDate = wantsRegular ? text('regularStartDate', 'When could you start a regular schedule?', 10) : '';
  if (regularStartDate && !isReasonableDate(regularStartDate)) {
    errors.push({ field: 'regularStartDate', message: 'Please choose a start date' });
  }

  const cover24h = readOption(input, 'cover24h', YES_SOMETIMES_NO, 'can you cover walks within 24 hours of notification?', errors);
  const availability = readAvailability(input.availability, settings.timeBlocks);
  if (!availability) errors.push({ field: 'availability', message: 'Availability is not valid' });
  const noticeNeeded = readOption(input, 'noticeNeeded', NOTICE_OPTIONS, 'how much notice do you usually need?', errors);
  const sameDayEmergency = readOption(input, 'sameDayEmergency', YES_SOMETIMES_NO, 'can you occasionally cover a same-day emergency?', errors);
  const responseSpeed = readOption(input, 'responseSpeed', RESPONSE_SPEED_OPTIONS, 'how quickly can you respond?', errors);
  const responseSpeedOther = text('responseSpeedOther', 'Please describe how quickly you can respond', L.explain, responseSpeed === 'other');
  const notifyBy = readOption(input, 'notifyBy', NOTIFY_OPTIONS, 'the best way to notify you', errors);
  const travelTime = text('travelTime', 'How long would it take you to reach Williamsburg?');
  const weeklyCapacity = text('weeklyCapacity', 'How many walks or hours per week would you accept?');
  const recurringCommitments = text('recurringCommitments', 'Recurring commitments', L.paragraph, false);
  const trainingStartDate = text('trainingStartDate', 'When could you begin training?', 10);
  if (trainingStartDate && !isReasonableDate(trainingStartDate)) {
    errors.push({ field: 'trainingStartDate', message: 'Please choose a training start date' });
  }

  const experience = text('experience', 'Describe your experience with dogs', L.paragraph);
  const specialDogExperience = text('specialDogExperience', 'Your experience with puppies, senior, large or reactive dogs', L.paragraph);
  const multiDogComfort = readOption(input, 'multiDogComfort', MULTI_DOG_OPTIONS, 'how comfortable are you handling up to three dogs?', errors);
  const physicalDuties = readOption(input, 'physicalDuties', PHYSICAL_OPTIONS, 'can you perform these duties?', errors);

  const willingTraining = readOption(input, 'willingTraining', YES_NO, 'are you willing to complete training?', errors);
  const phoneProtocol = readOption(input, 'phoneProtocol', YES_NO_EXPLAIN, 'can you follow our handling protocols?', errors);
  const phoneProtocolExplain = text('phoneProtocolExplain', 'Please explain', L.explain, phoneProtocol === 'explain');
  const scenarioRefusesToLeave = text('scenarioRefusesToLeave', 'What would you do if a dog refuses to leave home?', L.paragraph);
  const scenarioLooseHarness = text('scenarioLooseHarness', 'What would you do about a loose harness?', L.paragraph);
  const scenarioCantMakeShift = text('scenarioCantMakeShift', 'What would you do if you can’t make a shift?', L.paragraph);

  const whyOnCall = text('whyOnCall', 'Why does this schedule fit you?', L.paragraph);
  const experienceSummary = text('experienceSummary', 'Experience summary', L.paragraph, false);
  const anythingElse = text('anythingElse', 'Anything else', L.paragraph, false);
  const questionsForUs = text('questionsForUs', 'Your questions for us', L.paragraph, false);
  const confirmed = input.confirmed === true;
  if (!confirmed) errors.push({ field: 'confirmed', message: 'Please confirm the statement above to apply' });

  const smsConsent = input.smsConsent === true && notifyBy === 'text';
  const hasResume = input.hasResume === true;
  const utm = readUtm(input.utm);
  const source = readSource(input.source, utm);

  if (errors.length) return { ok: false, errors };

  const answers: OnCallAnswers = {
    homeNeighborhood,
    travelToWilliamsburg,
    travelExplain: travelToWilliamsburg === 'explain' ? travelExplain : '',
    workTypes: workTypes ?? [],
    cover24h,
    noticeNeeded,
    sameDayEmergency,
    responseSpeed,
    responseSpeedOther: responseSpeed === 'other' ? responseSpeedOther : '',
    notifyBy,
    travelTime,
    weeklyCapacity,
    weeklyHoursWanted,
    scheduleType,
    regularStartDate,
    recurringCommitments,
    trainingStartDate,
    experience,
    specialDogExperience,
    multiDogComfort,
    physicalDuties,
    willingTraining,
    phoneProtocol,
    phoneProtocolExplain: phoneProtocol === 'explain' ? phoneProtocolExplain : '',
    scenarioRefusesToLeave,
    scenarioLooseHarness,
    scenarioCantMakeShift,
    whyOnCall,
    experienceSummary,
    anythingElse,
    questionsForUs,
  };

  return {
    ok: true,
    data: { fullName, email, phoneE164: phoneE164!, availability: availability!, answers, smsConsent, confirmed, source, utm, hasResume },
  };
}

/**
 * The staffing areas an applicant can be sent to. The on-call form asks only
 * whether they can reach Williamsburg, so "yes" or "explain" maps to the
 * active Williamsburg area and "no" to none.
 */
export function areasForApplicant(answers: Pick<OnCallAnswers, 'travelToWilliamsburg'>, areas: BenchArea[]): string[] {
  if (answers.travelToWilliamsburg === 'no') return [];
  return areas.filter((a) => a.active && a.id === 'williamsburg').map((a) => a.id);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function readInt(body: Record<string, unknown>, field: string, min: number, max: number, errors: FieldError[]): number {
  const raw = body[field];
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min || raw > max) {
    errors.push({ field, message: `${field} must be a whole number from ${min} to ${max}` });
    return min;
  }
  return raw;
}

/**
 * Validates an admin settings save. Area ids are kept once issued (existing
 * people reference them); a new area without an id gets one from its name.
 */
export function parseSettings(input: unknown): ParseResult<BenchSettings> {
  if (!isPlainObject(input)) return { ok: false, errors: [{ field: 'body', message: 'Settings must be an object' }] };
  const errors: FieldError[] = [];
  const L = BENCH_FIELD_LIMITS;

  const areas: BenchArea[] = [];
  if (!Array.isArray(input.areas) || input.areas.length === 0 || input.areas.length > 30) {
    errors.push({ field: 'areas', message: 'Add at least one area (30 at most)' });
  } else {
    for (const raw of input.areas) {
      if (!isPlainObject(raw)) {
        errors.push({ field: 'areas', message: 'Area is not valid' });
        continue;
      }
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name || name.length > L.areaName) {
        errors.push({ field: 'areas', message: 'Every area needs a name (60 characters at most)' });
        continue;
      }
      const id = typeof raw.id === 'string' && KEY_PATTERN.test(raw.id) ? raw.id : slugify(name);
      if (!id || areas.some((a) => a.id === id)) {
        errors.push({ field: 'areas', message: `Area "${name}" is listed twice` });
        continue;
      }
      areas.push({ id, name, active: raw.active !== false, priorityRecruiting: raw.priorityRecruiting === true });
    }
  }

  const timeBlocks: TimeBlock[] = [];
  if (!Array.isArray(input.timeBlocks) || input.timeBlocks.length === 0 || input.timeBlocks.length > 8) {
    errors.push({ field: 'timeBlocks', message: 'Add at least one time block (8 at most)' });
  } else {
    for (const raw of input.timeBlocks) {
      if (!isPlainObject(raw)) {
        errors.push({ field: 'timeBlocks', message: 'Time block is not valid' });
        continue;
      }
      const label = typeof raw.label === 'string' ? raw.label.trim() : '';
      const start = typeof raw.start === 'string' ? raw.start : '';
      const end = typeof raw.end === 'string' ? raw.end : '';
      const key = typeof raw.key === 'string' && KEY_PATTERN.test(raw.key) ? raw.key : slugify(label);
      if (!label || label.length > L.blockLabel || !key) {
        errors.push({ field: 'timeBlocks', message: 'Every time block needs a name' });
        continue;
      }
      if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end) || start >= end) {
        errors.push({ field: 'timeBlocks', message: `"${label}" needs a start before its end (HH:MM)` });
        continue;
      }
      if (timeBlocks.some((b) => b.key === key)) {
        errors.push({ field: 'timeBlocks', message: `Time block "${label}" is listed twice` });
        continue;
      }
      timeBlocks.push({ key, label, start, end });
    }
  }

  const targetDepth = readInt(input, 'targetDepth', 1, 20, errors);
  const waveTimeoutMinutes = readInt(input, 'waveTimeoutMinutes', 2, 120, errors);
  const pingCadenceDays = readInt(input, 'pingCadenceDays', 7, 180, errors);

  const shadowBookingUrl = typeof input.shadowBookingUrl === 'string' ? input.shadowBookingUrl.trim() : '';
  if (shadowBookingUrl) {
    let okUrl = shadowBookingUrl.length <= L.url;
    try {
      okUrl = okUrl && new URL(shadowBookingUrl).protocol === 'https:';
    } catch {
      okUrl = false;
    }
    if (!okUrl) errors.push({ field: 'shadowBookingUrl', message: 'Shadow booking link must be an https:// URL' });
  }

  const alertPhoneRaw = typeof input.alertPhone === 'string' ? input.alertPhone.trim() : '';
  const alertPhone = alertPhoneRaw ? toE164(alertPhoneRaw) : '';
  if (alertPhone === null) errors.push({ field: 'alertPhone', message: 'Alert phone must be a 10-digit US number' });

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      areas,
      timeBlocks,
      targetDepth,
      waveTimeoutMinutes,
      pingCadenceDays,
      shadowBookingUrl,
      alertPhone: alertPhone ?? '',
      autoInviteOnGap: input.autoInviteOnGap === true,
    },
  };
}
