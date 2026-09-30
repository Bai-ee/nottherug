import { csvCell } from '@/lib/leads/csv';
import {
  BENCH_STAGE_LABELS,
  KNOCKOUT_LABELS,
  MULTI_DOG_OPTIONS,
  NOTICE_OPTIONS,
  NOTIFY_OPTIONS,
  PHYSICAL_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  SCHEDULE_OPTIONS,
  WEEKDAYS,
  WORK_TYPE_OPTIONS,
  YES_NO,
  YES_NO_EXPLAIN,
  YES_SOMETIMES_NO,
  optionLabel,
  type BenchPerson,
  type TimeBlock,
} from './contract';

/**
 * Every Join Our Team answer as a labelled, human-readable value, in form
 * order. One list drives both the admin Team Applications CSV export and any
 * table that needs a column set, so neither can drift from the form (the same
 * role lib/leads/contract.ts's LEAD_DISPLAY_FIELDS plays for leads).
 */

export type ApplicationRecord = Omit<BenchPerson, 'resumeUploadTokenHash' | 'resumeUploadExpiresAt'>;

export type ApplicationField = {
  key: string;
  label: string;
  value: (person: ApplicationRecord, blocks: TimeBlock[]) => string;
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "Mon Morning, Mon Evening, Sat Midday", Mon-first, in block order. */
export function formatAvailability(person: Pick<ApplicationRecord, 'availability'>, blocks: TimeBlock[]): string {
  const has = new Set((person.availability ?? []).map((s) => `${s.weekday}:${s.block}`));
  const parts: string[] = [];
  for (const day of WEEK_ORDER) {
    for (const block of blocks) {
      if (has.has(`${day}:${block.key}`)) parts.push(`${WEEKDAYS.find((d) => d.value === day)!.short} ${block.label}`);
    }
  }
  return parts.join(', ');
}

function withNote(label: string, note: string | undefined): string {
  return note ? `${label}: ${note}` : label;
}

const a = (p: ApplicationRecord) => p.answers;

export const APPLICATION_FIELDS: ApplicationField[] = [
  { key: 'createdAt', label: 'Submitted', value: (p) => p.createdAt },
  { key: 'stage', label: 'Stage', value: (p) => BENCH_STAGE_LABELS[p.stage] ?? p.stage },
  { key: 'knockoutReason', label: 'Auto-closed because', value: (p) => (p.knockoutReason ? KNOCKOUT_LABELS[p.knockoutReason] : '') },
  { key: 'source', label: 'Source', value: (p) => p.source },
  { key: 'utm', label: 'Campaign', value: (p) => Object.entries(p.utm ?? {}).map(([k, v]) => `${k}: ${v}`).join('; ') },
  { key: 'fullName', label: 'Full name', value: (p) => p.fullName },
  { key: 'email', label: 'Email', value: (p) => p.email },
  { key: 'phone', label: 'Phone', value: (p) => p.phoneE164 },
  { key: 'homeNeighborhood', label: 'Lives in', value: (p) => a(p).homeNeighborhood },
  { key: 'travelToWilliamsburg', label: 'Can reach Williamsburg', value: (p) => withNote(optionLabel(YES_NO_EXPLAIN, a(p).travelToWilliamsburg), a(p).travelExplain) },
  { key: 'workTypes', label: 'Work interested in', value: (p) => (a(p).workTypes ?? []).map((t) => optionLabel(WORK_TYPE_OPTIONS, t)).join(', ') },
  { key: 'cover24h', label: 'Covers within 24 hrs', value: (p) => optionLabel(YES_SOMETIMES_NO, a(p).cover24h) },
  { key: 'availability', label: 'Availability', value: (p, blocks) => formatAvailability(p, blocks) },
  { key: 'noticeNeeded', label: 'Notice needed', value: (p) => optionLabel(NOTICE_OPTIONS, a(p).noticeNeeded) },
  { key: 'sameDayEmergency', label: 'Same-day emergency', value: (p) => optionLabel(YES_SOMETIMES_NO, a(p).sameDayEmergency) },
  {
    key: 'responseSpeed',
    label: 'Response time',
    value: (p) => (a(p).responseSpeed === 'other' ? a(p).responseSpeedOther : optionLabel(RESPONSE_SPEED_OPTIONS, a(p).responseSpeed)),
  },
  { key: 'notifyBy', label: 'Notify by', value: (p) => optionLabel(NOTIFY_OPTIONS, a(p).notifyBy) },
  { key: 'smsConsentAt', label: 'Texts OK since', value: (p) => (p.smsOptedOut ? 'Opted out' : p.smsConsentAt ?? '') },
  { key: 'travelTime', label: 'Travel time', value: (p) => a(p).travelTime },
  { key: 'weeklyCapacity', label: 'On-call walks/hours per week', value: (p) => a(p).weeklyCapacity },
  { key: 'weeklyHoursWanted', label: 'Regular hours wanted', value: (p) => a(p).weeklyHoursWanted ?? '' },
  { key: 'scheduleType', label: 'Regular schedule', value: (p) => (a(p).scheduleType ? optionLabel(SCHEDULE_OPTIONS, a(p).scheduleType) : '') },
  { key: 'regularStartDate', label: 'Can start regular work', value: (p) => a(p).regularStartDate ?? '' },
  { key: 'recurringCommitments', label: 'Recurring commitments', value: (p) => a(p).recurringCommitments },
  { key: 'trainingStartDate', label: 'Can start training', value: (p) => a(p).trainingStartDate },
  { key: 'experience', label: 'Experience with dogs', value: (p) => a(p).experience },
  { key: 'specialDogExperience', label: 'Puppies, senior, large or reactive dogs', value: (p) => a(p).specialDogExperience },
  { key: 'multiDogComfort', label: 'Up to three dogs', value: (p) => optionLabel(MULTI_DOG_OPTIONS, a(p).multiDogComfort) },
  { key: 'physicalDuties', label: 'Physical duties', value: (p) => optionLabel(PHYSICAL_OPTIONS, a(p).physicalDuties) },
  { key: 'willingTraining', label: 'Will complete training', value: (p) => optionLabel(YES_NO, a(p).willingTraining) },
  { key: 'phoneProtocol', label: 'Phone & protocols', value: (p) => withNote(optionLabel(YES_NO_EXPLAIN, a(p).phoneProtocol), a(p).phoneProtocolExplain) },
  { key: 'scenarioRefusesToLeave', label: 'A dog refuses to leave home', value: (p) => a(p).scenarioRefusesToLeave },
  { key: 'scenarioLooseHarness', label: 'A harness is loose before leaving', value: (p) => a(p).scenarioLooseHarness },
  { key: 'scenarioCantMakeShift', label: "Accepted a shift but can't make it", value: (p) => a(p).scenarioCantMakeShift },
  { key: 'whyOnCall', label: 'Why on-call fits their schedule', value: (p) => a(p).whyOnCall },
  { key: 'experienceSummary', label: 'Experience summary', value: (p) => a(p).experienceSummary },
  { key: 'resume', label: 'Resume on file', value: (p) => (p.resumePath ? 'Yes' : 'No') },
  { key: 'anythingElse', label: 'Anything else', value: (p) => a(p).anythingElse },
  // Older applications predate this question.
  { key: 'questionsForUs', label: 'Their questions for us', value: (p) => a(p).questionsForUs ?? '' },
  { key: 'notes', label: "Luis's notes", value: (p) => p.notes ?? '' },
  { key: 'id', label: 'Application ID', value: (p) => p.id },
];

/** Spreadsheet-safe CSV of every application field (formula injection neutralized by csvCell). */
export function buildApplicationsCsv(people: ApplicationRecord[], blocks: TimeBlock[]): string {
  const header = APPLICATION_FIELDS.map((f) => csvCell(f.label)).join(',');
  const rows = people.map((p) => APPLICATION_FIELDS.map((f) => csvCell(f.value(p, blocks))).join(','));
  return [header, ...rows].join('\r\n');
}
