import { describe, it, expect } from 'vitest';
import { buildBookingPrefillHref, parseBookingPrefill } from '@/lib/leads/prefill';

describe('parseBookingPrefill', () => {
  it('accepts values that match the shared option lists', () => {
    const result = parseBookingPrefill(
      {
        ownerName: 'Sam Rivera',
        phone: '(347) 555-0100',
        email: 'Owner@Example.com',
        neighborhood: 'Greenpoint',
        serviceInterest: 'Daily Group Walks',
        source: 'welcome-modal',
      },
      'book-page'
    );
    expect(result).toEqual({
      values: {
        ownerName: 'Sam Rivera',
        phone: '(347) 555-0100',
        email: 'owner@example.com',
        neighborhood: 'Greenpoint',
        serviceInterest: 'Daily Group Walks',
      },
      phoneConsult: false,
      source: 'welcome-modal',
    });
  });

  it('drops an email the API would reject', () => {
    expect(parseBookingPrefill({ email: 'not-an-email' }, 'book-page').values.email).toBeUndefined();
    expect(parseBookingPrefill({ email: `${'a'.repeat(250)}@example.com` }, 'book-page').values.email).toBeUndefined();
  });

  it('drops free text past the API length limits', () => {
    const values = parseBookingPrefill(
      { ownerName: 'n'.repeat(101), phone: '5'.repeat(31) },
      'book-page'
    ).values;
    expect(values.ownerName).toBeUndefined();
    expect(values.phone).toBeUndefined();
  });

  it('drops a neighborhood that is not an offered option', () => {
    expect(parseBookingPrefill({ neighborhood: 'Atlantis' }, 'book-page').values.neighborhood).toBeUndefined();
  });

  it('drops a service interest that is not an offered option', () => {
    expect(parseBookingPrefill({ serviceInterest: 'Dog yoga' }, 'book-page').values.serviceInterest).toBeUndefined();
  });

  it('ignores values the API would reject and keeps the default source', () => {
    const result = parseBookingPrefill(
      { email: 'not-an-email', serviceInterest: 'Dog yoga', source: 'spam-campaign' },
      'book-page'
    );
    expect(result).toEqual({ values: {}, phoneConsult: false, source: 'book-page' });
  });

  it('reads the first value when a param is repeated', () => {
    const result = parseBookingPrefill({ email: ['first@example.com', 'second@example.com'] }, 'book-page');
    expect(result.values.email).toBe('first@example.com');
  });

  it('round-trips a link built from modal answers', () => {
    const values = { email: 'owner@example.com', serviceInterest: 'Daily Group Walks' };
    const href = buildBookingPrefillHref(values, 'welcome-modal');
    const params = Object.fromEntries(new URLSearchParams(href.split('?')[1]));
    expect(parseBookingPrefill(params, 'book-page')).toEqual({
      values,
      phoneConsult: false,
      source: 'welcome-modal',
    });
  });

  it('carries the Book a call intent, and only for an explicit "1"', () => {
    const href = buildBookingPrefillHref({ email: 'owner@example.com' }, 'welcome-modal', true);
    const params = Object.fromEntries(new URLSearchParams(href.split('?')[1]));
    expect(parseBookingPrefill(params, 'book-page').phoneConsult).toBe(true);
    expect(parseBookingPrefill({ phoneConsult: 'true' }, 'book-page').phoneConsult).toBe(false);
    expect(buildBookingPrefillHref({}, 'welcome-modal')).not.toContain('phoneConsult');
  });

  it('omits values the visitor never supplied', () => {
    expect(buildBookingPrefillHref({}, 'welcome-modal')).toBe('/book?source=welcome-modal');
  });
});
