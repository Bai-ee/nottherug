/**
 * Coverage for components/marketing/TrackedCtaAnchor.tsx: the tel:/mailto:/
 * external counterpart to TrackedCtaLink (see tests/unit/cta-tracked-link.test.ts).
 * Confirms it renders a real <a> (not next/link), preserves the destination,
 * fires exactly one cta_click per click, still calls a caller's own onClick
 * even when the tracker throws, and does not double-fire on a modified click
 * (cmd/ctrl/shift/middle-click) — the browser decides that behavior natively
 * because this component never calls preventDefault.
 *
 * Called directly as a plain function, same approach as TrackedCtaLink's
 * suite: no hooks here, so no renderer/DOM is needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MouseEvent } from 'react';

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track }));

const fakeClickEvent = {} as MouseEvent<HTMLAnchorElement>;
const modifiedClickEvent = { metaKey: true } as MouseEvent<HTMLAnchorElement>;

describe('TrackedCtaAnchor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a real <a>, not a next/link, preserving href/target/rel', async () => {
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const element = TrackedCtaAnchor({
      cta: 'contact_phone',
      href: 'tel:+13476109676',
      target: '_self',
      rel: 'noopener',
      children: '(347) 610-9676',
    });

    expect(element.type).toBe('a');
    expect(element.props.href).toBe('tel:+13476109676');
    expect(element.props.target).toBe('_self');
    expect(element.props.rel).toBe('noopener');
  });

  it('fires exactly one cta_click per click, with only the cta id and page', async () => {
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const element = TrackedCtaAnchor({ cta: 'contact_email', href: 'mailto:luis@nottherug.com', children: 'Email' });

    element.props.onClick?.(fakeClickEvent);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('cta_click', { cta: 'contact_email' });
  });

  it('still calls a caller-supplied onClick, without firing a second cta_click', async () => {
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const callerOnClick = vi.fn();
    const element = TrackedCtaAnchor({
      cta: 'contact_phone',
      href: 'tel:+13476109676',
      children: 'Call',
      onClick: callerOnClick,
    });

    element.props.onClick?.(fakeClickEvent);

    expect(track).toHaveBeenCalledTimes(1);
    expect(callerOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire on a modified click (cmd/ctrl/shift/middle-click)', async () => {
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const element = TrackedCtaAnchor({ cta: 'contact_email', href: 'mailto:luis@nottherug.com', children: 'Email' });

    element.props.onClick?.(modifiedClickEvent);

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('still calls the caller onClick (and never throws) when the tracker itself throws', async () => {
    track.mockImplementation(() => {
      throw new Error('tracking backend unreachable');
    });
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const callerOnClick = vi.fn();
    const element = TrackedCtaAnchor({
      cta: 'contact_phone',
      href: 'tel:+13476109676',
      children: 'Call',
      onClick: callerOnClick,
    });

    expect(() => element.props.onClick?.(fakeClickEvent)).not.toThrow();
    expect(callerOnClick).toHaveBeenCalledTimes(1);
  });
});
