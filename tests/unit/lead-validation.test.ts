import { describe, it, expect } from 'vitest';
import { parseLeadSubmission, isValidEmail } from '@/lib/leads/validation';
import { HONEYPOT_FIELD_NAME, LEAD_FIELD_LIMITS } from '@/lib/leads/contract';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    ownerName: 'Test Owner',
    phone: '(347) 555-0100',
    email: 'owner@example.test',
    neighborhood: 'North Williamsburg',
    dogName: 'Biscuit',
    breedAge: 'Golden, 3 years',
    serviceInterest: 'Daily Group Walks',
    vaccinations: 'Yes — fully vaccinated',
    walkFrequency: 'Daily (Mon–Fri)',
    notes: 'Pulls on the leash.',
    source: 'book-page',
    reactivity: 'Scooters',
    allergies: 'Chicken',
    phoneConsult: true,
    ...overrides,
  };
}

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
  });
  it('rejects missing @ or domain', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});

describe('parseLeadSubmission — shape rejection', () => {
  it('rejects a JSON null body', () => {
    const result = parseLeadSubmission(null);
    expect(result.ok).toBe(false);
  });

  it('rejects an array body', () => {
    const result = parseLeadSubmission([1, 2, 3]);
    expect(result.ok).toBe(false);
  });

  it('rejects a primitive body', () => {
    expect(parseLeadSubmission('hello').ok).toBe(false);
    expect(parseLeadSubmission(42).ok).toBe(false);
  });
});

describe('parseLeadSubmission — the current form payload', () => {
  it('accepts today\'s real form payload', () => {
    const result = parseLeadSubmission(validPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.ownerName).toBe('Test Owner');
      expect(result.data.email).toBe('owner@example.test');
      expect(result.data.phoneConsult).toBe(true);
    }
  });

  it('does not require the retired spayNeuter/dogSocial/strangerSocial fields', () => {
    const result = parseLeadSubmission(validPayload());
    expect(result.ok).toBe(true);
  });

  it('does not invent defaults for spayNeuter/dogSocial/strangerSocial even if sent', () => {
    const result = parseLeadSubmission(validPayload({ spayNeuter: 'Yes', dogSocial: 'Yes', strangerSocial: 'Yes' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.data as Record<string, unknown>).spayNeuter).toBeUndefined();
    }
  });
});

describe('parseLeadSubmission — field type checks', () => {
  it('rejects a numeric notes field instead of coercing it', () => {
    const result = parseLeadSubmission(validPayload({ notes: 42 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.field === 'notes')).toBe(true);
  });

  it('rejects a non-boolean phoneConsult', () => {
    const result = parseLeadSubmission(validPayload({ phoneConsult: 'yes' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.field === 'phoneConsult')).toBe(true);
  });

  it('rejects an empty required field', () => {
    const result = parseLeadSubmission(validPayload({ ownerName: '   ' }));
    expect(result.ok).toBe(false);
  });
});

describe('parseLeadSubmission — lengths and enums', () => {
  it('rejects oversized notes', () => {
    const result = parseLeadSubmission(validPayload({ notes: 'x'.repeat(LEAD_FIELD_LIMITS.notes + 1) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.field === 'notes')).toBe(true);
  });

  it('accepts notes at exactly the limit', () => {
    const result = parseLeadSubmission(validPayload({ notes: 'x'.repeat(LEAD_FIELD_LIMITS.notes) }));
    expect(result.ok).toBe(true);
  });

  it('rejects an invalid email format', () => {
    const result = parseLeadSubmission(validPayload({ email: 'not-an-email' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('rejects a service interest not in the allowed list', () => {
    const result = parseLeadSubmission(validPayload({ serviceInterest: 'Full grooming package' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.field === 'serviceInterest')).toBe(true);
  });

  it('rejects a neighborhood not in the allowed list', () => {
    const result = parseLeadSubmission(validPayload({ neighborhood: 'Manhattan' }));
    expect(result.ok).toBe(false);
  });
});

describe('parseLeadSubmission — honeypot', () => {
  it('rejects a submission where the honeypot field is filled', () => {
    const result = parseLeadSubmission(validPayload({ [HONEYPOT_FIELD_NAME]: 'http://spam.example' }));
    expect(result.ok).toBe(false);
  });

  it('accepts a submission where the honeypot field is empty or absent', () => {
    expect(parseLeadSubmission(validPayload({ [HONEYPOT_FIELD_NAME]: '' })).ok).toBe(true);
    expect(parseLeadSubmission(validPayload()).ok).toBe(true);
  });
});
