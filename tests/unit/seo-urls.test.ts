import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SITE_URL,
  absoluteUrl,
  normalizePublicBaseUrl,
  resolvePublicBaseUrl,
} from '@/lib/content/site';
import { founderDailyBriefEmail } from '@/lib/email/founder-brief-template';

// Loads the SEO modules fresh so SITE_URL re-reads PUBLIC_BASE_URL.
async function loadWithBase(base: string | undefined) {
  vi.resetModules();
  if (base === undefined) vi.stubEnv('PUBLIC_BASE_URL', '');
  else vi.stubEnv('PUBLIC_BASE_URL', base);
  const site = await import('@/lib/content/site');
  const sitemap = (await import('@/app/sitemap')).default;
  const robots = (await import('@/app/robots')).default;
  return { site, sitemap, robots };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('normalizePublicBaseUrl', () => {
  it.each([
    ['https://nottherug-ten.vercel.app', 'https://nottherug-ten.vercel.app'],
    ['https://nottherug-ten.vercel.app/', 'https://nottherug-ten.vercel.app'],
    ['https://nottherug-ten.vercel.app///', 'https://nottherug-ten.vercel.app'],
    ['  https://nottherug.com/  ', 'https://nottherug.com'],
    ['https://nottherug.com/some/path/?q=1#h', 'https://nottherug.com'],
    ['http://localhost:3650/', 'http://localhost:3650'],
    ['HTTPS://NotTheRug.com', 'https://nottherug.com'],
  ])('%j -> %s', (input, expected) => {
    expect(normalizePublicBaseUrl(input)).toBe(expected);
  });

  it.each(['', '   ', 'nottherug.com', 'ftp://nottherug.com', 'javascript:alert(1)', 'not a url', '//nottherug.com'])(
    'rejects %j with a clear error',
    (input) => {
      expect(() => normalizePublicBaseUrl(input)).toThrow(/PUBLIC_BASE_URL/);
    },
  );
});

describe('resolvePublicBaseUrl', () => {
  it('uses the fallback silently when unset or blank', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolvePublicBaseUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolvePublicBaseUrl('  ')).toBe(DEFAULT_SITE_URL);
    expect(resolvePublicBaseUrl('', 'http://req.test')).toBe('http://req.test');
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back and warns once on junk', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolvePublicBaseUrl('nottherug.com')).toBe(DEFAULT_SITE_URL);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('absoluteUrl', () => {
  it('never produces a double slash after the host', () => {
    expect(absoluteUrl('/', 'https://a.test')).toBe('https://a.test/');
    expect(absoluteUrl('/about', 'https://a.test')).toBe('https://a.test/about');
    expect(absoluteUrl('/sitemap.xml', 'https://a.test')).toBe('https://a.test/sitemap.xml');
  });
});

describe.each([
  ['no trailing slash', 'https://nottherug-ten.vercel.app', 'https://nottherug-ten.vercel.app'],
  ['trailing slash', 'https://nottherug-ten.vercel.app/', 'https://nottherug-ten.vercel.app'],
  ['whitespace and path', '  https://nottherug-ten.vercel.app/x/  ', 'https://nottherug-ten.vercel.app'],
  ['unset', undefined, DEFAULT_SITE_URL],
])('sitemap, robots and metadata with PUBLIC_BASE_URL %s', (_label, raw, host) => {
  it('builds every URL on the right host without //', async () => {
    const { site, sitemap, robots } = await loadWithBase(raw);

    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.url.startsWith(`${host}/`)).toBe(true);
      expect(e.url.slice(host.length)).not.toMatch(/^\/\//);
      expect(e.url.replace(/^https?:\/\//, '')).not.toContain('//');
    }

    const r = robots();
    expect(r.sitemap).toBe(`${host}/sitemap.xml`);

    const meta = site.buildPageMetadata({ path: '/about', title: 'About', description: 'd' });
    expect(meta.openGraph?.url).toBe(`${host}/about`);
    expect(String(meta.metadataBase)).toBe(`${host}/`);
    expect(meta.alternates?.canonical).toBe('/about');
    // OG/Twitter images are relative, so they resolve against metadataBase.
    const img = (meta.openGraph?.images as Array<{ url: string }>)[0].url;
    expect(new URL(img, meta.metadataBase as URL).href).toBe(`${host}${img}`);
    const tw = (meta.twitter?.images as string[])[0];
    expect(new URL(tw, meta.metadataBase as URL).href).toBe(`${host}${tw}`);
  });
});

describe('sitemap destinations', () => {
  const routeFile = (path: string) =>
    path === '/' ? 'app/(marketing)/page.tsx' : `app/(marketing)${path}/page.tsx`;

  it('every entry maps to an existing route file', () => {
    return loadWithBase(undefined).then(({ sitemap }) => {
      for (const e of sitemap()) {
        const path = new URL(e.url).pathname;
        expect(existsSync(routeFile(path)), path).toBe(true);
      }
    });
  });

  it('lists no redirected route and keeps /contact out', async () => {
    const { sitemap } = await loadWithBase(undefined);
    const config = (await import('../../next.config')).default;
    const redirects = (await config.redirects?.()) ?? [];
    const redirected = new Set(redirects.map((r) => r.source));
    expect(redirected.has('/services')).toBe(true);
    const paths = sitemap().map((e) => new URL(e.url).pathname);
    for (const p of paths) expect(redirected.has(p), p).toBe(false);
    expect(paths).not.toContain('/contact');
    expect(paths).not.toContain('/services');
    expect(paths).not.toContain('/how-it-works');
  });

  it('every listed route is indexable (no noIndex in its page source)', async () => {
    const { sitemap } = await loadWithBase(undefined);
    for (const e of sitemap()) {
      const src = readFileSync(routeFile(new URL(e.url).pathname), 'utf8');
      expect(src, e.url).not.toMatch(/noIndex:\s*true/);
    }
  });
});

describe('founder-brief email links', () => {
  it('embeds clean absolute links from a trailing-slash base', () => {
    const base = resolvePublicBaseUrl(' https://nottherug-ten.vercel.app/ ');
    const email = founderDailyBriefEmail({
      brief: { summary: {} } as never,
      dashboardUrl: absoluteUrl('/admin/dashboard', base),
      briefUrl: absoluteUrl('/admin/dashboard', base),
      leadsUrl: absoluteUrl('/admin/dashboard/leads', base),
      generatedAt: '2026-10-01T12:00:00Z',
    });
    expect(email.html).toContain('href="https://nottherug-ten.vercel.app/admin/dashboard"');
    expect(email.text).toContain('https://nottherug-ten.vercel.app/admin/dashboard/leads');
    expect(email.html).not.toContain('vercel.app//');
  });
});
