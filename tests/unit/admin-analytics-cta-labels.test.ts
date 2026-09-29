import { describe, it, expect } from 'vitest';
import { CTA_IDS } from '@/lib/analytics/events';
import { CTA_LABELS, groupLiveCtaIds } from '@/components/admin/analytics/ctaLabels';

describe('CTA_LABELS', () => {
  it('labels every CTA id with a non-empty, non-raw label', () => {
    for (const id of CTA_IDS) {
      expect(CTA_LABELS[id], id).toBeTruthy();
      expect(CTA_LABELS[id]).not.toBe(id);
    }
  });

  it('labels the split ids', () => {
    expect(CTA_LABELS.nav_get_started).toBe("Top nav: Let's get started");
    expect(CTA_LABELS.nav_contact_us).toBe('Top nav: Contact us');
    expect(CTA_LABELS.hero_contact_desktop).toBe('Homepage hero: Contact (desktop)');
    expect(CTA_LABELS.hero_book_mobile).toBe('Homepage hero: Book (mobile)');
  });

  it('marks the pre-split ids as legacy', () => {
    expect(CTA_LABELS.nav_contact).toContain('before split');
    expect(CTA_LABELS.hero_contact).toContain('before split');
  });

  it('keeps phone and email labels location-neutral', () => {
    expect(CTA_LABELS.contact_phone).not.toMatch(/contact page/i);
    expect(CTA_LABELS.contact_email).not.toMatch(/contact page/i);
  });

  it('files every id in exactly one category, with hero_book_mobile under Booking', () => {
    const groups = groupLiveCtaIds();
    const all = Object.values(groups).flat();
    expect(all.length).toBe(CTA_IDS.length);
    expect(new Set(all).size).toBe(CTA_IDS.length);
    expect(groups.Booking).toContain('hero_book_mobile');
    expect(groups.Contact).toEqual(expect.arrayContaining(['nav_get_started', 'nav_contact_us', 'hero_contact_desktop', 'nav_contact', 'hero_contact']));
  });
});
