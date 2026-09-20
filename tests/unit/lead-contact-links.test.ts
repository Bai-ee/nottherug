/**
 * The lead action buttons are only as good as the links behind them: a
 * mis-escaped address or a phone number the dialer rejects fails silently at
 * the exact moment the owner is trying to reach a customer.
 */
import { describe, it, expect } from 'vitest';
import { telHref, mailtoHref, googleCalendarHref } from '@/lib/leads/contactLinks';

describe('telHref', () => {
  it('strips the formatting a dialer cannot read', () => {
    expect(telHref('(347) 555-0100')).toBe('tel:3475550100');
  });

  it('keeps an international prefix', () => {
    expect(telHref('+44 20 7946 0958')).toBe('tel:+442079460958');
  });

  it('refuses anything too short to dial', () => {
    expect(telHref('555')).toBeNull();
    expect(telHref('')).toBeNull();
    expect(telHref(undefined)).toBeNull();
  });
});

describe('mailtoHref', () => {
  it('names the dog in the subject', () => {
    expect(mailtoHref({ email: 'a@b.com', dogName: 'Biscuit' })).toBe(
      'mailto:a%40b.com?subject=Not%20The%20Rug%20%E2%80%94%20walks%20for%20Biscuit',
    );
  });

  it('falls back when there is no dog on record', () => {
    expect(mailtoHref({ email: 'a@b.com' })).toContain('your%20walk%20request');
  });

  it('is nothing without an address', () => {
    expect(mailtoHref({ email: '' })).toBeNull();
  });
});

describe('googleCalendarHref', () => {
  it('prefills the composer and invites the client', () => {
    const href = googleCalendarHref({
      email: 'a@b.com',
      ownerName: 'Bryan',
      dogName: 'Biscuit',
      neighborhood: 'North Williamsburg',
      phone: '(347) 555-0100',
    });
    expect(href).toContain('action=TEMPLATE');
    expect(href).toContain('text=Meet+%26+Greet+%E2%80%94+Bryan+and+Biscuit');
    expect(href).toContain('add=a%40b.com');
    expect(href).toContain('location=North+Williamsburg%2C+Brooklyn');
    expect(href).toContain('Dog%3A+Biscuit');
  });

  it('sets no times — the founder picks the slot', () => {
    const href = googleCalendarHref({ email: 'a@b.com' });
    expect(href).not.toContain('dates=');
  });
});
