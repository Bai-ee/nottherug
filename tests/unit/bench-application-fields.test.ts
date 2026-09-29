/**
 * lib/bench/applicationFields.ts: the field list behind the Team Applications
 * CSV export.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_BENCH_SETTINGS, type BenchPerson } from '@/lib/bench/contract';
import { parseApplication } from '@/lib/bench/validation';
import { APPLICATION_FIELDS, buildApplicationsCsv, formatAvailability } from '@/lib/bench/applicationFields';
import { applicationPayload } from './bench-fixtures';

function personFrom(overrides: Record<string, unknown> = {}): BenchPerson {
  const parsed = parseApplication(applicationPayload(overrides), DEFAULT_BENCH_SETTINGS);
  if (!parsed.ok) throw new Error(parsed.errors[0].message);
  const app = parsed.data;
  return {
    id: 'bench_abc',
    schemaVersion: 1,
    fullName: app.fullName,
    firstName: 'Sam',
    email: app.email,
    phoneE164: app.phoneE164,
    source: app.source,
    utm: app.utm,
    stage: 'review',
    stageHistory: [],
    onHold: false,
    areas: ['williamsburg'],
    availability: app.availability,
    unavailableDates: [],
    answers: app.answers,
    confirmedAt: '2026-09-29T12:00:00Z',
    knockoutReason: null,
    resumePath: null,
    aiSummary: null,
    smsConsentAt: null,
    smsOptedOut: false,
    employmentType: null,
    tier: null,
    tierPinned: false,
    notes: '',
    shadowRating: null,
    createdAt: '2026-09-29T12:00:00Z',
    updatedAt: '2026-09-29T12:00:00Z',
  };
}

describe('application fields', () => {
  it('formats availability Mon-first in block order', () => {
    const availability = [
      { weekday: 0, block: 'evening' },
      { weekday: 1, block: 'evening' },
      { weekday: 1, block: 'morning' },
    ];
    expect(formatAvailability({ availability }, DEFAULT_BENCH_SETTINGS.timeBlocks)).toBe('Mon Morning, Mon Evening, Sun Evening');
  });

  it('exports one labelled column per field, with readable labels instead of stored codes', () => {
    const csv = buildApplicationsCsv([personFrom()], DEFAULT_BENCH_SETTINGS.timeBlocks);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe(APPLICATION_FIELDS.map((f) => (f.label.includes(',') ? `"${f.label}"` : f.label)).join(','));
    expect(row).toContain('4–12 hours');
    expect(row).toContain('Need training');
    expect(row).not.toContain('4_12h');
  });

  it('neutralizes spreadsheet formulas typed into an answer', () => {
    const csv = buildApplicationsCsv([personFrom({ anythingElse: '=HYPERLINK("http://evil.test")' })], DEFAULT_BENCH_SETTINGS.timeBlocks);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.test"")"`);
  });
});
