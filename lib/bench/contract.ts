/**
 * Single source of truth for the backup walker bench (plans/011).
 *
 * Pure: imported by the public application form, the apply route, the admin
 * routes and the admin page, so option lists and limits cannot drift between
 * what the form offers and what the server accepts.
 *
 * Staffing areas here are operational and live in Firestore settings. They are
 * deliberately separate from lib/content/coverage.ts, which is the marketing
 * SEO list and must not change for this feature.
 */

export const BENCH_SCHEMA_VERSION = 1;

export const BENCH_COLLECTIONS = {
  settings: 'benchSettings',
  people: 'benchPeople',
  rateLimits: 'benchRateLimits',
} as const;

export const BENCH_SETTINGS_DOC = `${BENCH_COLLECTIONS.settings}/config`;

/** Private Storage prefix for resumes; storage.rules denies all client access under private/. */
export const BENCH_RESUME_PREFIX = 'private/bench-resumes';

export const BENCH_STAGES = [
  'applied',
  'review',
  'shadow_invited',
  'shadow_scheduled',
  'shadow_done',
  'offer_conditional',
  'background_check',
  'bench',
  'fulltime',
  'inactive',
  'rejected',
] as const;

export type BenchStage = (typeof BENCH_STAGES)[number];

export const BENCH_STAGE_LABELS: Record<BenchStage, string> = {
  applied: 'Applied',
  review: 'In review',
  shadow_invited: 'Shadow invited',
  shadow_scheduled: 'Shadow scheduled',
  shadow_done: 'Shadow done',
  offer_conditional: 'Conditional offer',
  background_check: 'Background check',
  bench: 'On the bench',
  fulltime: 'Full-time',
  inactive: 'Inactive',
  rejected: 'Rejected',
};

/** Stages the Applicants tab works through, in pipeline order. */
export const PIPELINE_STAGES: BenchStage[] = [
  'review',
  'shadow_invited',
  'shadow_scheduled',
  'shadow_done',
  'offer_conditional',
  'background_check',
];

export const WEEKDAYS = [
  { value: 0, short: 'Sun', label: 'Sunday' },
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
] as const;

/**
 * The on-call questionnaire (owner-supplied, 2026-09-29). Each option list is
 * `{ value, label }`: the value is what is stored, the label is what the
 * applicant and Luis read.
 */
export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

export const YES_NO_EXPLAIN = [...YES_NO, { value: 'explain', label: 'Explain' }] as const;

export const YES_SOMETIMES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'no', label: 'No' },
] as const;

export const NOTICE_OPTIONS = [
  { value: 'under_4h', label: 'Under 4 hours' },
  { value: '4_12h', label: '4–12 hours' },
  { value: '12_24h', label: '12–24 hours' },
  { value: 'over_24h', label: 'More than 24 hours' },
] as const;

export const RESPONSE_SPEED_OPTIONS = [
  { value: '30min', label: 'Within 30 minutes' },
  { value: '1hr', label: 'Within 1 hour' },
  { value: '4hr', label: 'Within 4 hours' },
  { value: 'other', label: 'Other' },
] as const;

export const NOTIFY_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
] as const;

export const MULTI_DOG_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'need_training', label: 'Need training' },
  { value: 'prefer_solo', label: 'Prefer solo walks' },
] as const;

export const PHYSICAL_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'discuss', label: 'Would like to discuss' },
] as const;

/** On-call substitute work is what the bench needs most, so it leads; part-time and full-time roles apply too. */
export const WORK_TYPE_OPTIONS = [
  { value: 'on_call', label: 'On-call substitute walker' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'full_time', label: 'Full-time' },
] as const;

export const SCHEDULE_OPTIONS = [
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'both', label: 'Weekdays and weekends' },
  { value: 'flexible', label: 'Flexible' },
] as const;

type OptionValue<T extends readonly { value: string }[]> = T[number]['value'];
export type YesNo = OptionValue<typeof YES_NO>;
export type YesNoExplain = OptionValue<typeof YES_NO_EXPLAIN>;
export type YesSometimesNo = OptionValue<typeof YES_SOMETIMES_NO>;
export type NoticeNeeded = OptionValue<typeof NOTICE_OPTIONS>;
export type ResponseSpeed = OptionValue<typeof RESPONSE_SPEED_OPTIONS>;
export type NotifyBy = OptionValue<typeof NOTIFY_OPTIONS>;
export type MultiDogComfort = OptionValue<typeof MULTI_DOG_OPTIONS>;
export type PhysicalDuties = OptionValue<typeof PHYSICAL_OPTIONS>;
export type WorkType = OptionValue<typeof WORK_TYPE_OPTIONS>;
export type ScheduleType = OptionValue<typeof SCHEDULE_OPTIONS>;

/** The label for a stored option value, or the value itself if it is unknown. */
export function optionLabel(options: readonly { value: string; label: string }[], value: string | undefined): string {
  return options.find((o) => o.value === value)?.label ?? value ?? '—';
}

/** Owner-supplied copy for the confirmation checkbox. */
export const CONFIRMATION_TEXT =
  'I understand that this application is primarily for part-time, on-call coverage, that hours are not guaranteed, and that premium pay applies to qualifying coverage shifts. I confirm that my information is accurate and that Not The Rug may contact me about my application.';

export const SUCCESS_MESSAGE =
  'Thanks for applying. We’ll review your experience and availability and contact you if there’s a potential fit for our on-call team.';

export const APPLICANT_SOURCES = ['indeed', 'website', 'referral', 'other'] as const;
export type ApplicantSource = (typeof APPLICANT_SOURCES)[number];

/**
 * UTM values are allowlisted, never stored as typed: free text from a URL is
 * exactly how personal data leaks into reporting. Add a value here before
 * using it in a job post link.
 */
export const UTM_ALLOWLIST = {
  source: ['indeed', 'instagram', 'facebook', 'google', 'craigslist', 'referral'],
  medium: ['job_post', 'social', 'cpc', 'organic', 'referral', 'email'],
  campaign: ['backup-bench'],
} as const;

export type ApplicantUtm = { source?: string; medium?: string; campaign?: string };

export const BENCH_FIELD_LIMITS = {
  fullName: 120,
  email: 254,
  phone: 30,
  shortText: 200,
  explain: 1000,
  paragraph: 3000,
  notes: 4000,
  areaName: 60,
  blockLabel: 40,
  url: 500,
} as const;

/** Vercel caps a function request body at 4.5MB, so the plan's 5MB is not reachable through a route. */
export const RESUME_MAX_BYTES = 4 * 1024 * 1024;

export const RESUME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

export type ResumeKind = keyof typeof RESUME_TYPES;

export const HONEYPOT_FIELD_NAME = 'website';

/** NYC Local Law 144: the application must say AI may summarize it. */
export const AI_NOTICE_TEXT =
  'We may use AI to summarize your application for our team. A person reads every application and makes every decision.';

export const SMS_CONSENT_TEXT =
  'Text me about on-call walks from Not The Rug. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';

export type BenchArea = {
  id: string;
  name: string;
  active: boolean;
  priorityRecruiting: boolean;
};

export type TimeBlock = {
  key: string;
  label: string;
  /** 24h "HH:MM", America/New_York. */
  start: string;
  end: string;
};

export type BenchSettings = {
  areas: BenchArea[];
  timeBlocks: TimeBlock[];
  targetDepth: number;
  waveTimeoutMinutes: number;
  pingCadenceDays: number;
  shadowBookingUrl: string;
  /** Luis's phone for unfilled-callout alerts (Phase 3). E.164 or empty. */
  alertPhone: string;
  /** Off until counsel confirms (plan §4, §12 #7). */
  autoInviteOnGap: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_BENCH_SETTINGS: BenchSettings = {
  areas: [
    { id: 'williamsburg', name: 'Williamsburg', active: true, priorityRecruiting: false },
    { id: 'greenpoint', name: 'Greenpoint', active: true, priorityRecruiting: false },
  ],
  timeBlocks: [
    { key: 'morning', label: 'Morning', start: '07:00', end: '11:00' },
    { key: 'midday', label: 'Midday', start: '11:00', end: '15:00' },
    { key: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  ],
  targetDepth: 3,
  waveTimeoutMinutes: 10,
  pingCadenceDays: 30,
  shadowBookingUrl: '',
  alertPhone: '',
  autoInviteOnGap: false,
};

export type AvailabilitySlot = { weekday: number; block: string };

/**
 * NYC Local Law 144: automatic rejection only on objective answers the
 * applicant gave about the role itself. The physical-duties question never
 * rejects: "No" there is a reasonable-accommodation conversation for Luis.
 */
export type KnockoutReason = 'no_travel' | 'no_training' | 'no_availability';

export const KNOCKOUT_LABELS: Record<KnockoutReason, string> = {
  no_travel: 'Can’t travel to Williamsburg',
  no_training: 'Won’t complete training',
  no_availability: 'No availability given',
};

/** The questionnaire answers, stored as given under `answers`. */
export type OnCallAnswers = {
  homeNeighborhood: string;
  travelToWilliamsburg: YesNoExplain;
  travelExplain: string;
  /** What the applicant is looking for; at least one, on-call first in the form. */
  workTypes: WorkType[];
  cover24h: YesSometimesNo;
  noticeNeeded: NoticeNeeded;
  sameDayEmergency: YesSometimesNo;
  responseSpeed: ResponseSpeed;
  responseSpeedOther: string;
  notifyBy: NotifyBy;
  travelTime: string;
  weeklyCapacity: string;
  /** Part-time / full-time only; empty when the applicant chose on-call alone. */
  weeklyHoursWanted: string;
  scheduleType: ScheduleType | '';
  regularStartDate: string;
  recurringCommitments: string;
  trainingStartDate: string;
  experience: string;
  specialDogExperience: string;
  multiDogComfort: MultiDogComfort;
  physicalDuties: PhysicalDuties;
  willingTraining: YesNo;
  phoneProtocol: YesNoExplain;
  phoneProtocolExplain: string;
  scenarioRefusesToLeave: string;
  scenarioLooseHarness: string;
  scenarioCantMakeShift: string;
  whyOnCall: string;
  experienceSummary: string;
  anythingElse: string;
};

/** What a validated public application produces. */
export type BenchApplicationInput = {
  fullName: string;
  email: string;
  phoneE164: string;
  availability: AvailabilitySlot[];
  answers: OnCallAnswers;
  /** Separate, optional TCPA opt-in; only offered when Text is the chosen channel. */
  smsConsent: boolean;
  confirmed: boolean;
  source: ApplicantSource;
  utm: ApplicantUtm;
  /** Whether a resume will follow through the upload route. */
  hasResume: boolean;
};

export type StageHistoryEntry = { stage: BenchStage; at: string; by: string };

export type NotificationOutcome = 'sent' | 'failed' | 'skipped';

/** Stored shape of benchPeople/{id}. Fields for later phases stay optional. */
export type BenchPerson = {
  id: string;
  schemaVersion: number;
  fullName: string;
  /** First word of fullName, for greetings in email. */
  firstName: string;
  email: string;
  phoneE164: string;
  source: ApplicantSource;
  utm: ApplicantUtm;
  stage: BenchStage;
  stageHistory: StageHistoryEntry[];
  onHold: boolean;
  areas: string[];
  availability: AvailabilitySlot[];
  unavailableDates: Array<{ date: string; block: string | null }>;
  answers: OnCallAnswers;
  /** When the applicant ticked the on-call confirmation. */
  confirmedAt: string;
  knockoutReason: KnockoutReason | null;
  resumePath: string | null;
  resumeKind?: ResumeKind | null;
  /** Server-only: hash of the single-use token the applicant's browser uploads a resume with. Never sent to the admin UI. */
  resumeUploadTokenHash?: string | null;
  resumeUploadExpiresAt?: string | null;
  aiSummary: string | null;
  smsConsentAt: string | null;
  smsOptedOut: boolean;
  employmentType: 'w2' | '1099' | null;
  tier: 'A' | 'B' | 'C' | null;
  tierPinned: boolean;
  notes: string;
  shadowRating: number | null;
  notifications?: Record<string, NotificationOutcome>;
  createdAt: string;
  updatedAt: string;
};

/** Stage actions the admin can take in Phase 2. SMS and Checkr arrive in Phases 3 and 5. */
export const BENCH_ACTIONS = [
  'invite_shadow',
  'mark_scheduled',
  'mark_shadow_done',
  'conditional_offer',
  'mark_background_clear',
  'reject',
  'hold',
  'unhold',
  'mark_inactive',
  'reactivate',
  'save_notes',
] as const;

export type BenchAction = (typeof BENCH_ACTIONS)[number];

/** The first word of a full name, for "Hi Sam," greetings. */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}
