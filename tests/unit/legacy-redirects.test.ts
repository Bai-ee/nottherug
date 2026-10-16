/**
 * Legacy WordPress URLs (nottherug.com before the cutover) redirect
 * permanently to the closest real content. Paths with no honest match
 * (/gallery, /blog, 2019 posts, /feed, /wp-*) must NOT be redirected.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import nextConfig from '@/next.config';

const ROOT = process.cwd();

const EXPECTED: Record<string, string> = {
  '/about-us': '/about',
  '/testimonials': '/reviews',
  '/our-staff': '/#home-team-section',
  '/faqs': '/safety',
  '/services': '/#home-personalized-care-section',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(name) ? [full] : [];
  });
}

describe('legacy WordPress redirects', () => {
  it('maps each legacy path permanently to the exact destination', async () => {
    const redirects = await nextConfig.redirects!();
    for (const [source, destination] of Object.entries(EXPECTED)) {
      const matches = redirects.filter((r) => r.source === source);
      expect(matches, source).toHaveLength(1);
      expect(matches[0].destination).toBe(destination);
      expect(matches[0].permanent).toBe(true);
    }
  });

  it('does not redirect paths with no matching content or blanket-match wp/feed/unknown', async () => {
    const redirects = await nextConfig.redirects!();
    for (const r of redirects) {
      expect(r.source).not.toMatch(/wp-|feed|:path|[*(]/);
      expect(['/gallery', '/blog', '/contact']).not.toContain(r.source);
      expect(r.destination).not.toBe('/');
    }
  });

  it('every destination route and anchor id exists in source', async () => {
    const redirects = await nextConfig.redirects!();
    const files = [...sourceFiles(path.join(ROOT, 'components')), ...sourceFiles(path.join(ROOT, 'app'))];
    const corpus = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const source of Object.keys(EXPECTED)) {
      const { destination } = redirects.find((r) => r.source === source)!;
      const [route, anchor] = destination.split('#');
      if (route !== '/') {
        expect(existsSync(path.join(ROOT, 'app/(marketing)', route, 'page.tsx')), destination).toBe(true);
      }
      if (anchor) {
        expect(corpus.includes(`id="${anchor}"`), `#${anchor}`).toBe(true);
      }
    }
  });
});
