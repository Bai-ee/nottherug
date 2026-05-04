import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PREFIXES = ['/contact', '/admin', '/api', '/_next', '/favicon', '/dogs', '/logos', '/photos', '/media', '/fonts', '/images'];
const ALLOWED_FILES = new Set(['/robots.txt', '/sitemap.xml', '/manifest.json']);

export function proxy(req: NextRequest) {
  if (process.env.LAUNCH_MODE !== 'true') return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (ALLOWED_FILES.has(pathname)) return NextResponse.next();
  if (ALLOWED_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/contact';
  url.search = '';
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
