/**
 * H02: every admin data/document response, including its error responses,
 * carries `Cache-Control: private, no-store`.
 *
 * The header is applied by one boundary, the `headers()` entries in
 * next.config.ts, which Next applies in its router before/after the route
 * handler runs. Calling a route handler function directly in vitest never goes
 * through that layer, so handler-level tests cannot observe the header. This
 * suite therefore checks (1) the config output and (2) that every route file
 * calling verifyAdmin is matched by a configured source. The end-to-end
 * behaviour (401 and a handler that sets its own Cache-Control) was verified
 * against `next build && next start` — see plans/reports/013-P2-worker-E.md.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import nextConfig, { PRIVATE_ROUTE_SOURCES } from '@/next.config';

const APP_DIR = path.resolve(process.cwd(), 'app');

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === 'route.ts' ? [full] : [];
  });
}

/** `/a/:path*` matches `/a` and anything below; dynamic `[id]` segments match one segment. */
function sourceToRegExp(source: string): RegExp {
  return new RegExp(`^${source.replace(/\/:path\*$/, '(?:/.*)?')}$`);
}

function routePath(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file)).split(path.sep).join('/');
  return `/${rel}`.replace(/\[[^\]]+\]/g, 'x');
}

describe('private response caching boundary', () => {
  it('headers() sends Cache-Control: private, no-store for every private route source', async () => {
    const rules = await nextConfig.headers!();
    for (const source of PRIVATE_ROUTE_SOURCES) {
      const rule = rules.find((r) => r.source === source);
      expect(rule, `missing headers() entry for ${source}`).toBeDefined();
      expect(rule!.headers).toContainEqual({ key: 'Cache-Control', value: 'private, no-store' });
    }
  });

  it('keeps the existing global security headers', async () => {
    const rules = await nextConfig.headers!();
    const global = rules.find((r) => r.source === '/:path*');
    expect(global?.headers.map((h) => h.key)).toContain('X-Content-Type-Options');
  });

  it('covers every route handler that calls verifyAdmin, and every /api/admin route', () => {
    const matchers = PRIVATE_ROUTE_SOURCES.map(sourceToRegExp);
    const uncovered: string[] = [];
    let guarded = 0;
    for (const file of routeFiles(APP_DIR)) {
      const route = routePath(file);
      const usesAdminAuth = /\bverifyAdmin\b/.test(readFileSync(file, 'utf8'));
      if (usesAdminAuth) guarded += 1;
      if ((usesAdminAuth || route.startsWith('/api/admin')) && !matchers.some((m) => m.test(route))) {
        uncovered.push(route);
      }
    }
    expect(guarded).toBeGreaterThan(10);
    expect(uncovered).toEqual([]);
  });
});
