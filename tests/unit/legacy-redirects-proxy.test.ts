/**
 * F08: legacy `/?page=` / `/?hood=` links redirect in proxy.ts (not in the
 * homepage render, which must stay static). Covers the table, precedence,
 * passthrough, LAUNCH_MODE interplay and the preview noindex header.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { resolveLegacyRedirect } from '@/lib/routing/legacyRedirects';

const PAGE_CASES: Array<[string, string | null]> = [
  ['home', null],
  ['services', '/#home-personalized-care-section'],
  ['how-it-works', '/#home-how-it-works-block'],
  ['about', '/about'],
  ['safety', '/safety'],
  ['neighborhoods', '/neighborhoods/williamsburg'],
  ['reviews', '/reviews'],
  ['book', '/book'],
  ['contact', '/contact'],
];

const resolve = (qs: string) => resolveLegacyRedirect(new URLSearchParams(qs));
const run = (url: string) => proxy(new NextRequest(`http://localhost:3000${url}`));
const location = (res: Response) => res.headers.get('location');

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('resolveLegacyRedirect', () => {
  it.each(PAGE_CASES)('page=%s -> %s', (page, target) => {
    expect(resolve(`page=${page}`)).toBe(target);
  });

  it('hood=williamsburg -> neighborhood page, and wins over page', () => {
    expect(resolve('hood=williamsburg')).toBe('/neighborhoods/williamsburg');
    expect(resolve('hood=williamsburg&page=about')).toBe('/neighborhoods/williamsburg');
  });

  it('duplicate params: the first value wins', () => {
    expect(resolve('page=about&page=safety')).toBe('/about');
    expect(resolve('page=nope&page=about')).toBeNull();
  });

  it('unknown, empty and inherited-key values do not redirect', () => {
    for (const qs of ['page=does-not-exist', 'page=', 'hood=elsewhere', 'hood=constructor', 'page=toString', 'welcome=1', '']) {
      expect(resolve(qs)).toBeNull();
    }
  });

  it('an unknown hood falls through to a valid page', () => {
    expect(resolve('hood=elsewhere&page=about')).toBe('/about');
  });
});

describe('proxy legacy redirects', () => {
  it.each(PAGE_CASES.filter(([, t]) => t))('/?page=%s -> 307 %s', (page, target) => {
    const res = run(`/?page=${page}`);
    expect(res.status).toBe(307);
    expect(location(res)).toBe(`http://localhost:3000${target}`);
  });

  it('drops other params on a redirect (as the page redirect did)', () => {
    const res = run('/?utm_source=x&page=about');
    expect(res.status).toBe(307);
    expect(location(res)).toBe('http://localhost:3000/about');
  });

  it('passes non-legacy URLs through untouched', () => {
    for (const url of ['/', '/?welcome=1', '/?utm_source=x&utm_campaign=y', '/?page=home', '/?page=nope', '/?hood=constructor']) {
      const res = run(url);
      expect(res.status).toBe(200);
      expect(location(res)).toBeNull();
    }
  });

  it('does not touch other paths carrying the same params', () => {
    const res = run('/about?page=book');
    expect(res.status).toBe(200);
    expect(location(res)).toBeNull();
  });

  it('LAUNCH_MODE on: the gate (307 to /contact) wins over legacy targets', () => {
    process.env.LAUNCH_MODE = 'true';
    for (const url of ['/', '/?page=about', '/?welcome=1']) {
      const res = run(url);
      expect(res.status).toBe(307);
      expect(location(res)).toBe('http://localhost:3000/contact');
    }
  });

  it('LAUNCH_MODE off: legacy redirects apply', () => {
    process.env.LAUNCH_MODE = 'false';
    expect(location(run('/?page=safety'))).toBe('http://localhost:3000/safety');
  });

  it('preview/dev responses, including redirects, carry noindex', () => {
    delete process.env.VERCEL_ENV;
    for (const url of ['/', '/?page=about']) {
      expect(run(url).headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
    process.env.LAUNCH_MODE = 'true';
    expect(run('/?page=about').headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('production responses carry no noindex header', () => {
    process.env.VERCEL_ENV = 'production';
    expect(run('/?page=about').headers.get('x-robots-tag')).toBeNull();
    expect(run('/').headers.get('x-robots-tag')).toBeNull();
  });
});
