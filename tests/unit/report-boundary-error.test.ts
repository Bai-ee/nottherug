import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportBoundaryError } from '@/lib/server/reportError';

describe('reportBoundaryError', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs the boundary name, route, error class, and digest', () => {
    const error = Object.assign(new Error('irrelevant'), { name: 'TypeError', digest: 'abc123' });
    reportBoundaryError({ boundary: 'marketing-error', route: '/book', error });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const logged = errorSpy.mock.calls[0].join(' ');
    expect(logged).toContain('[boundary:marketing-error]');
    expect(logged).toContain('route=/book');
    expect(logged).toContain('class=TypeError');
    expect(logged).toContain('digest=abc123');
  });

  it('omits the digest segment when none is present', () => {
    const error = new Error('boom');
    reportBoundaryError({ boundary: 'global-error', error });

    const logged = errorSpy.mock.calls[0].join(' ');
    expect(logged).not.toContain('digest=');
  });

  it('never logs the error message, even when it contains sensitive-looking content', () => {
    const sensitive = 'sk-live-super-secret-token leaked-customer-email@example.com';
    const error = new Error(sensitive);
    reportBoundaryError({ boundary: 'admin-error', route: '/admin/leads', error });

    const logged = errorSpy.mock.calls[0].join(' ');
    expect(logged).not.toContain(sensitive);
    expect(logged).not.toContain('leaked-customer-email');
  });

  it('never logs a stack trace', () => {
    const error = new Error('boom');
    reportBoundaryError({ boundary: 'global-error', error });

    const logged = errorSpy.mock.calls[0].join(' ');
    expect(logged).not.toContain('at ');
    expect(logged).not.toContain(error.stack ?? '__no-stack__');
  });

  it('falls back to a generic "Error" class for plain non-Error values without throwing', () => {
    expect(() =>
      reportBoundaryError({ boundary: 'marketing-error', route: '/', error: 'a raw string throw' })
    ).not.toThrow();

    const logged = errorSpy.mock.calls[0].join(' ');
    expect(logged).toContain('class=Error');
    expect(logged).not.toContain('a raw string throw');
  });

  it('never throws even if console.error itself throws', () => {
    errorSpy.mockImplementation(() => {
      throw new Error('logging transport down');
    });

    expect(() =>
      reportBoundaryError({ boundary: 'global-error', error: new Error('boom') })
    ).not.toThrow();
  });
});
