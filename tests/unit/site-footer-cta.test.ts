/**
 * Coverage for components/marketing/SiteFooter.tsx's CTA wiring. SiteFooter
 * has no hooks, so it can be called directly as a plain function and its
 * returned element tree walked for TrackedCtaLink nodes — this proves each
 * id is attached to the right rendered element with the right href, without
 * needing a DOM renderer. TrackedCtaLink's own click-fires-once behavior is
 * proven separately in tests/unit/cta-tracked-link.test.ts and is not
 * re-verified here.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

type AnyElement = ReactElement<any>;

function findByType(node: ReactNode, type: unknown, out: AnyElement[] = []): AnyElement[] {
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) findByType(child, type, out);
    return out;
  }
  const el = node as AnyElement;
  if (el.type === type) out.push(el);
  if (el.props && 'children' in el.props) findByType(el.props.children, type, out);
  return out;
}

describe('SiteFooter CTA wiring', () => {
  // The footer renders two booking links: the CTA banner and the Company
  // column entry. Both share footer_book, the same way all five Services
  // column links share footer_services — separate ids would imply the owner
  // makes a decision from the split, and there is no such decision.
  it('wires footer_book to both booking links, each pointing at /book', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    const bookLinks = findByType(tree, TrackedCtaLink).filter((el) => el.props.cta === 'footer_book');
    expect(bookLinks).toHaveLength(2);
    for (const link of bookLinks) expect(link.props.href).toBe('/book');
    expect(bookLinks.map((el) => el.props.id)).toContain('footer-company-book-link');
  });

  it('wires footer_contact to exactly one element, pointing at /contact', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    const contactLinks = findByType(tree, TrackedCtaLink).filter((el) => el.props.cta === 'footer_contact');
    expect(contactLinks).toHaveLength(1);
    expect(contactLinks[0].props.href).toBe('/contact');
    expect(contactLinks[0].props.id).toBe('footer-company-contact-link');
  });

  it('wires footer_services to all five service deep links, each pointing at /services', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    const serviceLinks = findByType(tree, TrackedCtaLink).filter((el) => el.props.cta === 'footer_services');
    expect(serviceLinks).toHaveLength(5);
    for (const link of serviceLinks) {
      expect(link.props.href).toBe('/services');
    }
    const ids = serviceLinks.map((l) => l.props.id).sort();
    expect(ids).toEqual([
      'footer-services-link-boarding',
      'footer-services-link-group-walks',
      'footer-services-link-puppy-visits',
      'footer-services-link-senior-dog-care',
      'footer-services-link-walk-training',
    ]);
  });

  it('does not wire a stale reserved id (footer_phone, footer_email, home_pricing_card, etc.)', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    const ctas = findByType(tree, TrackedCtaLink).map((el) => el.props.cta);
    const stale = ['footer_phone', 'footer_email', 'home_pricing_card', 'home_service_card', 'services_pricing_card'];
    for (const id of stale) {
      expect(ctas).not.toContain(id);
    }
  });
});
