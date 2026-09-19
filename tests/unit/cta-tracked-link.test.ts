/**
 * Coverage for components/marketing/TrackedCtaLink.tsx: the shared tracked
 * link used by every "actual call site" audited for plans/003 A3. Confirms
 * one click produces exactly one cta_click event — including the case where
 * a caller also passes its own onClick (a wrapper + child both firing was
 * the specific double-count risk called out for this phase).
 *
 * TrackedCtaLink has no hooks, so it can be called directly as a plain
 * function (skipping next/link's own render machinery, which needs a real
 * DOM this suite intentionally does not have) and its returned element's
 * onClick prop exercised directly — the same click handler a real click
 * would invoke.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MouseEvent } from 'react';

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track }));

const fakeClickEvent = {} as MouseEvent<HTMLAnchorElement>;
const modifiedClickEvent = { metaKey: true } as MouseEvent<HTMLAnchorElement>;

describe('TrackedCtaLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires exactly one cta_click per click, with only the cta id and page', async () => {
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const element = TrackedCtaLink({ cta: 'closing_trust_book', page: 'home', href: '/book', children: 'Book' });

    element.props.onClick?.(fakeClickEvent);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('cta_click', { cta: 'closing_trust_book', page: 'home' });
  });

  it('still calls a caller-supplied onClick, without firing a second cta_click', async () => {
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const callerOnClick = vi.fn();
    const element = TrackedCtaLink({
      cta: 'footer_book',
      page: 'footer',
      href: '/book',
      children: 'Book',
      onClick: callerOnClick,
    });

    element.props.onClick?.(fakeClickEvent);

    expect(track).toHaveBeenCalledTimes(1);
    expect(callerOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire on a modified click (cmd/ctrl/shift/middle-click)', async () => {
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const element = TrackedCtaLink({ cta: 'nav_services', page: 'home', href: '/services', children: 'Services' });

    element.props.onClick?.(modifiedClickEvent);

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('still calls the caller onClick (and never throws) when the tracker itself throws', async () => {
    track.mockImplementation(() => {
      throw new Error('tracking backend unreachable');
    });
    const { default: TrackedCtaLink } = await import('@/components/marketing/TrackedCtaLink');
    const callerOnClick = vi.fn();
    const element = TrackedCtaLink({
      cta: 'closing_trust_book',
      page: 'home',
      href: '/book',
      children: 'Book',
      onClick: callerOnClick,
    });

    expect(() => element.props.onClick?.(fakeClickEvent)).not.toThrow();
    expect(callerOnClick).toHaveBeenCalledTimes(1);
  });
});
