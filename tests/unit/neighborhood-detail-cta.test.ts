/**
 * Coverage for components/marketing/NeighborhoodDetail.tsx's CTA wiring.
 * No hooks in this component, so it is called directly with a fixture hood
 * and its returned element tree walked for TrackedCtaLink nodes — see
 * tests/unit/site-footer-cta.test.ts for why this proves wiring rather than
 * click behavior (that's covered once, at the primitive level).
 */
import { describe, it, expect, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { WILLIAMSBURG } from '@/lib/content/coverage';

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

describe('NeighborhoodDetail CTA wiring', () => {
  it('wires neighborhood_detail_book and neighborhood_detail_contact each to exactly one real element', async () => {
    const { default: NeighborhoodDetail } = await import('@/components/marketing/NeighborhoodDetail');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = NeighborhoodDetail({ hood: WILLIAMSBURG });

    const links = findByType(tree, TrackedCtaLink);
    const bookLinks = links.filter((el) => el.props.cta === 'neighborhood_detail_book');
    const contactLinks = links.filter((el) => el.props.cta === 'neighborhood_detail_contact');

    expect(bookLinks).toHaveLength(1);
    expect(bookLinks[0].props.href).toBe('/book');

    expect(contactLinks).toHaveLength(1);
    expect(contactLinks[0].props.href).toBe('/contact');
    expect(contactLinks[0].props.id).toBe('neighborhood-detail-contact-link');
  });
});
