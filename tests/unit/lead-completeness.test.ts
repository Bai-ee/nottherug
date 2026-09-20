/**
 * The completeness signal is what the founder reads to judge whether a lead
 * is serious, so it must count real answers only — and it must never state a
 * self-reported booking as proven fact.
 */
import { describe, it, expect } from 'vitest';
import { measureLeadCompleteness, describeLeadQuality, COUNTED_LEAD_FIELDS } from '@/lib/leads/completeness';

describe('measureLeadCompleteness', () => {
  it('counts nothing for an email-only capture', () => {
    const m = measureLeadCompleteness({ email: 'a@b.com', submittedAt: 'x', source: 'welcome-modal' });
    expect(m.answered).toBe(0);
    expect(m.complete).toBe(false);
    expect(m.total).toBe(COUNTED_LEAD_FIELDS.length);
  });

  it('counts no system field as an answer', () => {
    const counted = COUNTED_LEAD_FIELDS.map((f) => f.key);
    for (const systemField of ['email', 'source', 'submittedAt', 'id']) {
      expect(counted).not.toContain(systemField);
    }
  });

  it('reports nothing answered for a bare capture that only has its own id', () => {
    // Regression: `id` is present on every document, so counting it made an
    // email-only capture read as having answered a question.
    const m = measureLeadCompleteness({ id: 'capture_bare', email: 'a@b.com', submittedAt: 'x' });
    expect(m.answered).toBe(0);
  });

  it('ignores blank strings but counts a deliberate no', () => {
    const m = measureLeadCompleteness({ ownerName: '   ', dogName: 'Biscuit', phoneConsult: false });
    expect(m.answeredKeys).toContain('dogName');
    expect(m.answeredKeys).toContain('phoneConsult');
    expect(m.answeredKeys).not.toContain('ownerName');
    expect(m.answered).toBe(2);
  });

  it('is complete only when every counted question has an answer', () => {
    const full: Record<string, unknown> = { email: 'a@b.com' };
    for (const f of COUNTED_LEAD_FIELDS) full[f.key as string] = 'answered';
    expect(measureLeadCompleteness(full).complete).toBe(true);
  });
});

describe('describeLeadQuality', () => {
  it('reads as words, not a score', () => {
    expect(describeLeadQuality({ dogName: 'Biscuit' }, false)).toBe(`1 of ${COUNTED_LEAD_FIELDS.length} answered`);
  });

  it('notes a booking alongside the count', () => {
    expect(describeLeadQuality({ dogName: 'Biscuit' }, true)).toBe(
      `Booked · 1 of ${COUNTED_LEAD_FIELDS.length} answered`,
    );
  });
});
