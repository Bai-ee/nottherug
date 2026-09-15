import { describe, it, expect } from 'vitest';
import { csvCell, leadsToCsv, neutralizeFormulaInjection } from '@/lib/leads/csv';
import { LEAD_DISPLAY_FIELDS, type LeadRecord } from '@/lib/leads/contract';

describe('neutralizeFormulaInjection', () => {
  it('prefixes leading formula-trigger characters', () => {
    expect(neutralizeFormulaInjection('=cmd|"/c calc"!A1')).toBe(`'=cmd|"/c calc"!A1`);
    expect(neutralizeFormulaInjection('+1+1')).toBe(`'+1+1`);
    expect(neutralizeFormulaInjection('-1+1')).toBe(`'-1+1`);
    expect(neutralizeFormulaInjection('@SUM(A1)')).toBe(`'@SUM(A1)`);
  });

  it('does not touch a value with no leading trigger character', () => {
    expect(neutralizeFormulaInjection('Biscuit')).toBe('Biscuit');
    expect(neutralizeFormulaInjection('')).toBe('');
  });

  it('keeps a phone number readable once the leading apostrophe is stripped (Excel hides it)', () => {
    const raw = '+1 347-555-0100';
    const neutralized = neutralizeFormulaInjection(raw);
    expect(neutralized).toBe(`'${raw}`);
    expect(neutralized.slice(1)).toBe(raw);
  });
});

describe('csvCell', () => {
  it('wraps and doubles quotes when the value contains a comma, quote, or newline', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });

  it('renders null/undefined as an empty cell', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('neutralizes a formula payload even when it also needs quoting', () => {
    expect(csvCell('=1+1,boom')).toBe(`"'=1+1,boom"`);
  });
});

describe('leadsToCsv', () => {
  const baseLead: LeadRecord = {
    id: 'abc123',
    type: 'meetgreet',
    submittedAt: '2026-01-05T12:00:00.000Z',
    email: 'owner@example.test',
    ownerName: 'Test Owner',
    phone: '+1 347-555-0100',
    neighborhood: 'North Williamsburg',
    dogName: 'Biscuit',
    breedAge: 'Golden, 3 years',
    serviceInterest: 'Daily Group Walks',
    vaccinations: 'Yes — fully vaccinated',
    walkFrequency: 'Daily (Mon–Fri)',
    notes: 'Pulls on the leash.',
    source: 'book-page',
    reactivity: 'Scooters, Motorcycles',
    allergies: 'Chicken',
    phoneConsult: true,
  };

  it('renders a header row from field labels and one row per lead', () => {
    const csv = leadsToCsv([baseLead]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(LEAD_DISPLAY_FIELDS.map((f) => f.label).join(','));
    expect(lines[1]).toContain('Test Owner');
    expect(lines[1]).toContain("'+1 347-555-0100");
  });

  it('renders legacy fields when present on a historical record', () => {
    const legacyLead: LeadRecord = {
      ...baseLead,
      reactivity: undefined,
      allergies: undefined,
      phoneConsult: undefined,
      spayNeuter: 'Yes',
      dogSocial: 'Good with other dogs',
      strangerSocial: 'Friendly',
    };
    const csv = leadsToCsv([legacyLead]);
    expect(csv).toContain('Yes');
    expect(csv).toContain('Good with other dogs');
    expect(csv).toContain('Friendly');
  });

  it('shows an em dash for missing fields rather than blowing up', () => {
    const sparse: LeadRecord = { id: 'x', type: 'meetgreet', submittedAt: '2026-01-01T00:00:00.000Z', email: 'a@b.com' };
    const csv = leadsToCsv([sparse]);
    expect(csv).toContain('—');
  });
});
