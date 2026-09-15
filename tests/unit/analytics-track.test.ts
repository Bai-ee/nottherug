import { describe, it, expect } from 'vitest';
import { sanitize, track } from '@/lib/analytics/track';

// Regression coverage for the review finding on lib/analytics/track.ts: the
// sanitizer used to check only key names, so an email/phone value sitting
// under an *allowed* key (or a nested/array structure) shipped unfiltered.
// Every vector the reviewer used to defeat the old version is reproduced
// here as its own case.

describe('sanitize', () => {
  it('drops a value that is itself an email, even under an allowed key', () => {
    const result = sanitize({ cta: 'visitor@example.com' });
    expect(result).not.toHaveProperty('cta');
  });

  it('drops a value that is itself a phone number, even under an allowed key', () => {
    const result = sanitize({ source: '(347) 610-9676' });
    expect(result).not.toHaveProperty('source');
  });

  it('drops a key whose name only aliases a blocked term', () => {
    const result = sanitize({ emailAddress: 'visitor@example.com', customerEmail: 'x@y.com', dogName: 'Biscuit' });
    expect(result).toEqual({});
  });

  it('sanitizes each array element instead of comma-joining unfiltered', () => {
    const singleSensitive = sanitize({ page: ['visitor@example.com'] });
    expect(singleSensitive).not.toHaveProperty('page');

    const mixed = sanitize({ page: ['home', 'visitor@example.com'] });
    expect(mixed.page).toBe('home');
    expect(mixed.page).not.toContain('@');
  });

  it('drops a nested object outright rather than serializing it', () => {
    const result = sanitize({ cta: { secret: 'visitor@example.com', nested: { deeper: 'x@y.com' } } });
    expect(result).not.toHaveProperty('cta');
  });

  it('drops null/undefined values without error', () => {
    const result = sanitize({ page: undefined, source: null as unknown as undefined });
    expect(result).toEqual({});
  });

  it('still allows ordinary, non-sensitive values through unchanged', () => {
    const result = sanitize({ page: 'home', cta: 'hero_book', source: 'services', step: '2' });
    expect(result).toEqual({ page: 'home', cta: 'hero_book', source: 'services', step: '2' });
  });
});

describe('track', () => {
  it('is a no-op (does not throw, does not require a DOM) with no endpoint configured', () => {
    expect(() => track('cta_click', { cta: 'hero_book', page: 'home' })).not.toThrow();
  });

  it('is a no-op even when called with an email-shaped value', () => {
    expect(() => track('lead_saved', { source: 'visitor@example.com' })).not.toThrow();
  });
});
