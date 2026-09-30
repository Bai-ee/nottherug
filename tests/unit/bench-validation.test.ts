/**
 * lib/bench/validation.ts: the shared checks the public on-call form runs per
 * step and the apply route enforces, plus admin settings validation.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_BENCH_SETTINGS } from '@/lib/bench/contract';
import {
  APPLICATION_STEP_FIELDS,
  areasForApplicant,
  parseApplication,
  parseSettings,
  readSource,
  readUtm,
  toE164,
} from '@/lib/bench/validation';
import { applicationPayload } from './bench-fixtures';

describe('parseApplication', () => {
  it('accepts a complete application and normalizes it', () => {
    const result = parseApplication(applicationPayload(), DEFAULT_BENCH_SETTINGS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.fullName).toBe('Sam Rivera');
    expect(result.data.email).toBe('sam@example.test');
    expect(result.data.phoneE164).toBe('+13475550101');
    expect(result.data.availability).toEqual([
      { weekday: 1, block: 'morning' },
      { weekday: 3, block: 'evening' },
    ]);
    expect(result.data.answers.scenarioLooseHarness).toContain('Refit');
    expect(result.data.answers.recurringCommitments).toBe('Classes Tue/Thu until 2pm');
    expect(result.data.source).toBe('indeed');
    expect(result.data.smsConsent).toBe(true);
  });

  it('drops UTM values that are not allowlisted instead of storing them', () => {
    const result = parseApplication(applicationPayload(), DEFAULT_BENCH_SETTINGS);
    expect(result.ok && result.data.utm).toEqual({ source: 'indeed', medium: 'job_post' });
  });

  it('only records SMS consent when Text is the chosen channel', () => {
    const result = parseApplication(applicationPayload({ notifyBy: 'email', smsConsent: true }), DEFAULT_BENCH_SETTINGS);
    expect(result.ok && result.data.smsConsent).toBe(false);
  });

  it('treats answers that end an application as valid answers, not errors', () => {
    const result = parseApplication(
      applicationPayload({ travelToWilliamsburg: 'no', willingTraining: 'no', availability: [] }),
      DEFAULT_BENCH_SETTINGS,
    );
    expect(result.ok).toBe(true);
  });

  it('requires at least one work type, and never rejects on the choice', () => {
    for (const workTypes of [[], undefined, ['nope']]) {
      const result = parseApplication(applicationPayload({ workTypes }), DEFAULT_BENCH_SETTINGS);
      expect(!result.ok && result.errors.map((e) => e.field)).toContain('workTypes');
    }
    const fullTimeOnly = parseApplication(
      applicationPayload({ workTypes: ['full_time'], weeklyHoursWanted: '40', scheduleType: 'weekdays', regularStartDate: '2026-11-01' }),
      DEFAULT_BENCH_SETTINGS,
    );
    expect(fullTimeOnly.ok).toBe(true);
  });

  it('asks the regular-schedule questions only for part-time or full-time, and drops them otherwise', () => {
    const missing = parseApplication(applicationPayload({ workTypes: ['on_call', 'part_time'] }), DEFAULT_BENCH_SETTINGS);
    expect(!missing.ok && missing.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['weeklyHoursWanted', 'scheduleType', 'regularStartDate']),
    );

    const onCallOnly = parseApplication(
      applicationPayload({ workTypes: ['on_call'], weeklyHoursWanted: '20', scheduleType: 'both', regularStartDate: '2026-11-01' }),
      DEFAULT_BENCH_SETTINGS,
    );
    expect(onCallOnly.ok && onCallOnly.data.answers).toMatchObject({ weeklyHoursWanted: '', scheduleType: '', regularStartDate: '' });
  });

  it('requires the explanation only when "Explain" or "Other" is picked, and drops it otherwise', () => {
    const missing = parseApplication(applicationPayload({ travelToWilliamsburg: 'explain' }), DEFAULT_BENCH_SETTINGS);
    expect(!missing.ok && missing.errors.map((e) => e.field)).toContain('travelExplain');

    const other = parseApplication(applicationPayload({ responseSpeed: 'other' }), DEFAULT_BENCH_SETTINGS);
    expect(!other.ok && other.errors.map((e) => e.field)).toContain('responseSpeedOther');

    const ignored = parseApplication(applicationPayload({ travelExplain: 'stale text' }), DEFAULT_BENCH_SETTINGS);
    expect(ignored.ok && ignored.data.answers.travelExplain).toBe('');
  });

  it('requires the on-call confirmation', () => {
    const result = parseApplication(applicationPayload({ confirmed: false }), DEFAULT_BENCH_SETTINGS);
    expect(!result.ok && result.errors.map((e) => e.field)).toContain('confirmed');
  });

  it('stores the applicant’s own questions for us, and leaves them optional', () => {
    const asked = parseApplication(applicationPayload(), DEFAULT_BENCH_SETTINGS);
    expect(asked.ok && asked.data.answers.questionsForUs).toBe('Do you walk dogs in the rain?');
    const none = parseApplication(applicationPayload({ questionsForUs: '' }), DEFAULT_BENCH_SETTINGS);
    expect(none.ok && none.data.answers.questionsForUs).toBe('');
    const tooLong = parseApplication(applicationPayload({ questionsForUs: 'x'.repeat(3001) }), DEFAULT_BENCH_SETTINGS);
    expect(!tooLong.ok && tooLong.errors.map((e) => e.field)).toContain('questionsForUs');
  });

  it('keeps the optional questions optional', () => {
    const result = parseApplication(
      applicationPayload({ recurringCommitments: '', experienceSummary: '', anythingElse: '' }),
      DEFAULT_BENCH_SETTINGS,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a filled honeypot', () => {
    expect(parseApplication(applicationPayload({ website: 'spam.example' }), DEFAULT_BENCH_SETTINGS).ok).toBe(false);
  });

  it.each([
    ['phone', { phone: '555-01' }],
    ['email', { email: 'not-an-email' }],
    ['fullName', { fullName: '' }],
    ['availability', { availability: [{ weekday: 9, block: 'morning' }] }],
    ['availability', { availability: [{ weekday: 1, block: 'midnight' }] }],
    ['noticeNeeded', { noticeNeeded: 'whenever' }],
    ['notifyBy', { notifyBy: 'pigeon' }],
    ['trainingStartDate', { trainingStartDate: '2026-02-30' }],
    ['trainingStartDate', { trainingStartDate: '2099-01-01' }],
    ['scenarioCantMakeShift', { scenarioCantMakeShift: '' }],
    ['experience', { experience: 'x'.repeat(3001) }],
    ['multiDogComfort', { multiDogComfort: undefined }],
  ])('rejects an invalid %s', (field, patch) => {
    const result = parseApplication(applicationPayload(patch), DEFAULT_BENCH_SETTINGS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.field)).toContain(field);
  });

  it('assigns every validated field to exactly one form step', () => {
    const all = APPLICATION_STEP_FIELDS.flat();
    expect(new Set(all).size).toBe(all.length);
    for (const field of ['fullName', 'availability', 'physicalDuties', 'scenarioLooseHarness', 'confirmed']) {
      expect(all).toContain(field);
    }
  });

  it('rejects a non-object body', () => {
    expect(parseApplication(null, DEFAULT_BENCH_SETTINGS).ok).toBe(false);
    expect(parseApplication([], DEFAULT_BENCH_SETTINGS).ok).toBe(false);
  });
});

describe('areasForApplicant', () => {
  it('maps "can reach Williamsburg" to the active Williamsburg staffing area', () => {
    expect(areasForApplicant({ travelToWilliamsburg: 'yes' }, DEFAULT_BENCH_SETTINGS.areas)).toEqual(['williamsburg']);
    expect(areasForApplicant({ travelToWilliamsburg: 'explain' }, DEFAULT_BENCH_SETTINGS.areas)).toEqual(['williamsburg']);
    expect(areasForApplicant({ travelToWilliamsburg: 'no' }, DEFAULT_BENCH_SETTINGS.areas)).toEqual([]);
  });
});

describe('source and phone helpers', () => {
  it('derives the source from an allowlisted UTM when src is absent', () => {
    expect(readSource(undefined, readUtm({ source: 'indeed' }))).toBe('indeed');
    expect(readSource('made-up', {})).toBe('website');
  });

  it('normalizes US numbers only', () => {
    expect(toE164('1 (347) 555-0101')).toBe('+13475550101');
    expect(toE164('+44 20 7946 0958')).toBeNull();
  });
});

describe('parseSettings', () => {
  it('round-trips the defaults', () => {
    const result = parseSettings(DEFAULT_BENCH_SETTINGS);
    expect(result.ok && result.data.areas).toEqual(DEFAULT_BENCH_SETTINGS.areas);
  });

  it('gives a new area an id from its name and keeps existing ids', () => {
    const result = parseSettings({
      ...DEFAULT_BENCH_SETTINGS,
      areas: [...DEFAULT_BENCH_SETTINGS.areas, { name: 'Bed-Stuy', active: true }],
    });
    expect(result.ok && result.data.areas.map((a) => a.id)).toEqual(['williamsburg', 'greenpoint', 'bed-stuy']);
  });

  it.each([
    ['a duplicate area', { areas: [{ name: 'Williamsburg' }, { name: 'Williamsburg' }] }],
    ['no areas', { areas: [] }],
    ['a block ending before it starts', { timeBlocks: [{ label: 'Late', start: '20:00', end: '08:00' }] }],
    ['a non-https booking link', { shadowBookingUrl: 'http://example.test' }],
    ['a bad alert phone', { alertPhone: '123' }],
    ['an out-of-range depth', { targetDepth: 0 }],
  ])('rejects %s', (_label, patch) => {
    expect(parseSettings({ ...DEFAULT_BENCH_SETTINGS, ...patch }).ok).toBe(false);
  });
});
