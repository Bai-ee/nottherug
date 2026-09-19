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

/** Only the CTA-relevant props these tests read; avoids `any` while still
 *  letting findByType walk an arbitrary element tree. */
type CtaElementProps = {
  cta?: string;
  href?: string;
  id?: string;
  children?: ReactNode;
};
type AnyElement = ReactElement<CtaElementProps>;

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
  it('wires footer_book to the one booking link, pointing at /book', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    const bookLinks = findByType(tree, TrackedCtaLink).filter((el) => el.props.cta === 'footer_book');
    expect(bookLinks).toHaveLength(1);
    expect(bookLinks[0].props.href).toBe('/book');
    expect(bookLinks[0].props.id).toBe('footer-book-luis-cta');
  });

  it('wires footer_contact to exactly one element, the Company column entry', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    const contactLinks = findByType(tree, TrackedCtaLink).filter((el) => el.props.cta === 'footer_contact');
    expect(contactLinks).toHaveLength(1);
    expect(contactLinks[0].props.href).toBe('/#home-contact-sheet-header');
    expect(contactLinks[0].props.id).toBe('footer-company-contact-link');
  });

  // All six rate links share footer_services on purpose: the id measures
  // "the footer sent someone to the rates", and a per-rate split would imply
  // the owner makes a decision from it. There is no such decision.
  it('wires footer_services to all six rate links, each pointing at its rate card', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    const serviceLinks = findByType(tree, TrackedCtaLink).filter((el) => el.props.cta === 'footer_services');
    expect(serviceLinks).toHaveLength(6);
    for (const link of serviceLinks) {
      expect(link.props.href).toMatch(/^\/#home-/);
    }
    const ids = serviceLinks.map((l) => l.props.id).sort();
    expect(ids).toEqual([
      'footer-rates-link-boarding-sitting',
      'footer-rates-link-cat-visits',
      'footer-rates-link-group-walk',
      'footer-rates-link-puppy-walk',
      'footer-rates-link-senior-dog-visits',
      'footer-rates-link-solo-walk',
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

  it('leaves the outbound social links untracked', async () => {
    const { default: SiteFooter } = await import('@/components/marketing/SiteFooter');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = SiteFooter();

    // The Instagram/Yelp/Google buttons are plain <a> elements — plan 004
    // excludes outbound proof links until they answer a business question.
    const tracked = findByType(tree, TrackedCtaLink);
    expect(tracked).toHaveLength(8);
  });
});
