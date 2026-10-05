import { NextRequest, NextResponse } from 'next/server';
import { resolveLegacyRedirect } from '@/lib/routing/legacyRedirects';

// Paths that stay reachable while LAUNCH_MODE gates the rest of the site.
const ALLOWED_PREFIXES = ['/contact', '/book', '/admin', '/api', '/_next', '/favicon', '/dogs', '/logos', '/photos', '/media', '/fonts', '/images', '/img'];
const ALLOWED_FILES = new Set(['/robots.txt', '/sitemap.xml', '/manifest.json']);

const LAUNCH_DESTINATION = '/contact';

/**
 * Anything that is not the live production deployment must stay out of search
 * results: preview builds serve the same public routes and canonicals as
 * production, so without this they compete with it.
 */
function applyIndexingPolicy(res: NextResponse): NextResponse {
  if (process.env.VERCEL_ENV !== 'production') {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

/**
 * Old `/?page=` / `/?hood=` links redirect here, not in the homepage render, so
 * `/` can stay static. Same 307 `redirect()` produced when this lived in the page.
 * Returns null for any request that is not a legacy link.
 */
function legacyRedirect(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname !== '/' || !req.nextUrl.search) return null;
  const target = resolveLegacyRedirect(req.nextUrl.searchParams);
  if (!target) return null;
  const url = req.nextUrl.clone();
  const [path, hash] = target.split('#');
  url.pathname = path;
  url.hash = hash ? `#${hash}` : '';
  url.search = '';
  return NextResponse.redirect(url, 307);
}

export function proxy(req: NextRequest) {
  if (process.env.LAUNCH_MODE !== 'true') {
    return applyIndexingPolicy(legacyRedirect(req) ?? NextResponse.next());
  }

  const { pathname } = req.nextUrl;

  if (ALLOWED_FILES.has(pathname)) return applyIndexingPolicy(NextResponse.next());
  if (ALLOWED_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    return applyIndexingPolicy(NextResponse.next());
  }

  const url = req.nextUrl.clone();
  url.pathname = LAUNCH_DESTINATION;
  url.search = '';
  // 307, not 308: the launch gate is temporary, and a permanent redirect would be
  // cached by browsers and intermediaries long after LAUNCH_MODE is turned off.
  return applyIndexingPolicy(NextResponse.redirect(url, 307));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
