import { NextRequest, NextResponse } from 'next/server';

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

export function proxy(req: NextRequest) {
  if (process.env.LAUNCH_MODE !== 'true') return applyIndexingPolicy(NextResponse.next());

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
