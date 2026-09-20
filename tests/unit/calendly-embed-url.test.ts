/**
 * The theme parameters are the only way to influence what the cross-origin
 * Calendly iframe looks like, so a malformed URL here means the scheduler
 * either opens unstyled or does not open at all.
 */
import { describe, it, expect } from 'vitest';
import { buildCalendlyEmbedUrl } from '@/lib/booking/calendlyEmbedUrl';

describe('buildCalendlyEmbedUrl', () => {
  it('dresses a plain booking link in the site palette', () => {
    const url = new URL(buildCalendlyEmbedUrl('https://calendly.com/nottherugadmin/30min'));
    expect(url.searchParams.get('background_color')).toBe('f3ecd9');
    expect(url.searchParams.get('text_color')).toBe('242321');
    expect(url.searchParams.get('primary_color')).toBe('c4674b');
    expect(url.searchParams.get('hide_gdpr_banner')).toBe('1');
  });

  it('passes bare hex — a leading # makes Calendly drop the theme', () => {
    const url = buildCalendlyEmbedUrl('https://calendly.com/x/y');
    expect(url).not.toContain('%23');
    expect(url).not.toContain('#');
  });

  it('keeps parameters the configured link already sets', () => {
    const url = new URL(buildCalendlyEmbedUrl('https://calendly.com/x/y?primary_color=000000&name=Ada'));
    expect(url.searchParams.get('primary_color')).toBe('000000');
    expect(url.searchParams.get('name')).toBe('Ada');
    expect(url.searchParams.get('background_color')).toBe('f3ecd9');
  });

  it('hands back anything it cannot parse rather than breaking the scheduler', () => {
    expect(buildCalendlyEmbedUrl('')).toBe('');
    expect(buildCalendlyEmbedUrl('not a url')).toBe('not a url');
  });
});
