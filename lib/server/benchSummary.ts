import {
  MULTI_DOG_OPTIONS,
  NOTICE_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  SCHEDULE_OPTIONS,
  WORK_TYPE_OPTIONS,
  YES_SOMETIMES_NO,
  optionLabel,
  type BenchPerson,
} from '@/lib/bench/contract';
import { getBenchPerson, mergeBenchPerson } from '@/lib/server/bench';

/**
 * Optional AI summary of an application (plan §4.1, NYC Local Law 144).
 *
 * It writes a neutral summary and interview prompts for Luis to read. It
 * never scores, ranks, recommends or rejects, and nothing reads its output to
 * order or filter applicants. Off unless BENCH_AI_SUMMARIES_ENABLED is exactly
 * "true", which waits on counsel.
 *
 * Plain fetch, matching not-the-rug-brief/anthropic-client.js, so the repo
 * takes on no new dependency.
 */

const DEFAULT_MODEL = 'claude-opus-5-5';
const REQUEST_TIMEOUT_MS = 45_000;

export function isAiSummaryEnabled(): boolean {
  return process.env.BENCH_AI_SUMMARIES_ENABLED === 'true' && Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You help the owner of a small Brooklyn dog-walking business read applications from people who want to be part-time, on-call backup dog walkers.

Write two short sections in plain text:
Summary: three to five sentences restating what the applicant told us about their dog experience, their on-call availability and how quickly they can respond, and how they answered the three scenario questions. Report only what they wrote.
Interview prompts: three or four open questions the owner could ask on a shadow walk to learn more about what they wrote.

Do not score, rate, rank or recommend the applicant, and do not say whether they are a good or bad fit. Do not guess at age, gender, ethnicity, disability, health, religion, family status or any other personal characteristic, and do not ask about them. Do not ask about criminal history.`;

/**
 * Only the applicant's own answers about the work go to the model: no name,
 * email, phone or home neighborhood. The physical-duties answer is left out
 * too, since it can touch on disability.
 */
export function buildApplicationPrompt(person: Pick<BenchPerson, 'answers' | 'availability'>, blockLabels: Record<string, string>): string {
  const a = person.answers;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const availability = person.availability.map((s) => `${days[s.weekday]} ${blockLabels[s.block] ?? s.block}`).join(', ');
  const speed = a.responseSpeed === 'other' ? a.responseSpeedOther : optionLabel(RESPONSE_SPEED_OPTIONS, a.responseSpeed);
  return [
    `Work interested in: ${a.workTypes.map((t) => optionLabel(WORK_TYPE_OPTIONS, t)).join(', ')}`,
    ...(a.weeklyHoursWanted
      ? [`Regular hours wanted: ${a.weeklyHoursWanted} (${optionLabel(SCHEDULE_OPTIONS, a.scheduleType)}), can start ${a.regularStartDate}`]
      : []),
    `Available for backup shifts: ${availability}`,
    `Can cover within 24 hours of notice: ${optionLabel(YES_SOMETIMES_NO, a.cover24h)}`,
    `Notice usually needed: ${optionLabel(NOTICE_OPTIONS, a.noticeNeeded)}`,
    `Same-day emergencies: ${optionLabel(YES_SOMETIMES_NO, a.sameDayEmergency)}`,
    `Response time to a coverage request: ${speed}`,
    `Travel time to Williamsburg: ${a.travelTime}`,
    `Walks or hours per week when needed: ${a.weeklyCapacity}`,
    `Handling up to three dogs: ${optionLabel(MULTI_DOG_OPTIONS, a.multiDogComfort)}`,
    '',
    'Experience with dogs:',
    a.experience,
    '',
    'Experience with puppies, senior, large or reactive dogs:',
    a.specialDogExperience,
    '',
    'If a dog refuses to leave home while covering:',
    a.scenarioRefusesToLeave,
    '',
    'If a harness is loose before leaving:',
    a.scenarioLooseHarness,
    '',
    'If they accepted a shift but can no longer make it:',
    a.scenarioCantMakeShift,
    '',
    'Why this schedule fits them:',
    a.whyOnCall,
  ].join('\n');
}

type MessagesResponse = {
  stop_reason?: string;
  content?: Array<{ type: string; text?: string }>;
};

export async function requestSummary(prompt: string): Promise<string | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: process.env.BENCH_AI_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'low' },
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as MessagesResponse;
  if (data.stop_reason === 'refusal') return null;
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text || null;
}

/**
 * Runs after the apply response has been sent. Never throws: a summary is a
 * convenience for Luis and must not surface as an applicant-facing failure.
 */
export async function summarizeApplication(personId: string, blockLabels: Record<string, string>): Promise<void> {
  try {
    const person = await getBenchPerson(personId);
    if (!person) return;
    const summary = await requestSummary(buildApplicationPrompt(person, blockLabels));
    if (!summary) return;
    // Only aiSummary (plus the modified stamp) is written, and only while the
    // person still exists: the model call can take a while, and an admin may
    // have changed the stage or notes since the read above.
    await mergeBenchPerson(personId, { aiSummary: summary, updatedAt: new Date().toISOString() }, { precondition: { exists: true } });
  } catch (err) {
    console.error('[bench:ai-summary] failed', err instanceof Error ? err.message : 'unknown');
  }
}
