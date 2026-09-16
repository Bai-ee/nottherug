/**
 * Coverage for components/marketing/ContactInfoCard.tsx: confirms the real
 * bug fix from plan 004 T2 — contact_phone/contact_email now render through
 * TrackedCtaAnchor (a real <a>), not TrackedCtaLink (next/link, meant for
 * internal route navigation only, wrong semantics for tel:/mailto:).
 * ContactInfoCard has no hooks, so it is called directly and its returned
 * tree walked — see tests/unit/site-footer-cta.test.ts for why this proves
 * wiring, with click-fires-once behavior proven once at the primitive level.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { PHONE_HREF, EMAIL_HREF } from '@/lib/content/contact';

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

describe('ContactInfoCard CTA wiring', () => {
  it('renders contact_phone and contact_email through TrackedCtaAnchor (a real <a>), not TrackedCtaLink', async () => {
    const { default: ContactInfoCard } = await import('@/components/marketing/ContactInfoCard');
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const tree = ContactInfoCard();

    // No tel:/mailto: destination is ever wrapped in the internal-route Link.
    const linkCtas = findByType(tree, TrackedCtaLink).map((el) => el.props.cta);
    expect(linkCtas).not.toContain('contact_phone');
    expect(linkCtas).not.toContain('contact_email');

    const anchors = findByType(tree, TrackedCtaAnchor);
    const phone = anchors.filter((el) => el.props.cta === 'contact_phone');
    const email = anchors.filter((el) => el.props.cta === 'contact_email');

    expect(phone).toHaveLength(1);
    expect(phone[0].props.href).toBe(PHONE_HREF);
    expect(phone[0].props.href.startsWith('tel:')).toBe(true);

    expect(email).toHaveLength(1);
    expect(email[0].props.href).toBe(EMAIL_HREF);
    expect(email[0].props.href.startsWith('mailto:')).toBe(true);
  });
});
