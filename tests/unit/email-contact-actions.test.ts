/**
 * Plan 017: every contact-email surface renders the visible address as one
 * tracked mailto link plus a "Copy email address" fallback, and copy success
 * is only ever reported when the copy actually happened.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type MouseEvent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track }));

describe('EmailContactActions', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('renders the configured address as a correctly encoded mailto link, with a copy button', async () => {
    const { default: EmailContactActions } = await import('@/components/marketing/EmailContactActions');
    const { EMAIL_DISPLAY, EMAIL_HREF } = await import('@/lib/content/contact');
    const html = renderToStaticMarkup(createElement(EmailContactActions, { id: 'test-email-link' }));
    expect(EMAIL_HREF).toBe(`mailto:${EMAIL_DISPLAY}`);
    expect(EMAIL_DISPLAY).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]+$/);
    expect(html).toContain(`href="${EMAIL_HREF}"`);
    expect(html).toContain(`>${EMAIL_DISPLAY}</a>`);
    expect(html).toContain('id="test-email-link"');
    expect(html).toContain('Copy email address');
    expect(html).toContain('role="status"');
    expect(html).not.toMatch(/sent|opened/i);
  });

  it('copyText reports success only when the clipboard write resolves', async () => {
    const { copyText } = await import('@/components/marketing/EmailContactActions');
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('a@b.test')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('a@b.test');
  });

  it('copyText reports failure (so the manual fallback shows) when the clipboard is blocked', async () => {
    const { copyText } = await import('@/components/marketing/EmailContactActions');
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    // No document in the node test environment: the legacy path cannot copy either.
    expect(await copyText('a@b.test')).toBe(false);
  });
});

describe('TrackedCtaAnchor: one activation, one event', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records one event per native click even if the handler runs twice for it', async () => {
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const el = TrackedCtaAnchor({ cta: 'contact_email', href: 'mailto:x@y.test', children: 'x' });
    const native = new Event('click');
    const click = { nativeEvent: native } as unknown as MouseEvent<HTMLAnchorElement>;
    el.props.onClick?.(click);
    el.props.onClick?.(click);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('keeps repeated intentional clicks distinct', async () => {
    const { default: TrackedCtaAnchor } = await import('@/components/marketing/TrackedCtaAnchor');
    const el = TrackedCtaAnchor({ cta: 'contact_email', href: 'mailto:x@y.test', children: 'x' });
    el.props.onClick?.({ nativeEvent: new Event('click') } as unknown as MouseEvent<HTMLAnchorElement>);
    el.props.onClick?.({ nativeEvent: new Event('click') } as unknown as MouseEvent<HTMLAnchorElement>);
    expect(track).toHaveBeenCalledTimes(2);
  });
});
