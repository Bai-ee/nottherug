'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavScrollShadow } from './marketing/hooks/useNavScrollShadow';
import { track } from '@/lib/analytics/track';

const NAV_LINKS: Array<{ href: string; label: string; dataPage: string }> = [
  { href: '/services', label: 'Services & Rates', dataPage: 'services' },
  { href: '/how-it-works', label: 'How It Works', dataPage: 'how-it-works' },
  { href: '/about', label: 'About Us', dataPage: 'about' },
  { href: '/safety', label: 'Safety & Trust', dataPage: 'safety' },
  { href: '/neighborhoods/williamsburg', label: 'Williamsburg', dataPage: 'neighborhoods' },
  { href: '/reviews', label: 'Reviews', dataPage: 'reviews' },
];

// Full site navigation for every marketing route. Real Next.js routes now —
// no more `?page=`/`?hood=` deep links or window.showPage DOM toggling
// (see plans/002-production-readiness.md R13). Legacy `?page=`/`?hood=`
// URLs are still honored via a redirect on the home route.
export default function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  useNavScrollShadow(navRef);

  // Close the mobile menu on route change. Adjusted during render (React's
  // documented pattern for resetting state when a prop changes) rather than
  // in an effect, so it doesn't cause an extra committed render.
  const [menuClosedForPathname, setMenuClosedForPathname] = useState(pathname);
  if (pathname !== menuClosedForPathname) {
    setMenuClosedForPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  return (
    <>
      <nav id="main-nav" ref={navRef}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <img id="nav-logo-img" src="/img/horiz_logo_off_white.png" alt="Not The Rug" width={498} height={88} />
          </Link>
          <div className="nav-links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-page={link.dataPage}
                className={pathname === link.href ? 'active' : undefined}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/admin" id="nav-admin-login-link">Login</Link>
            <Link
              href="/book"
              className="nav-cta"
              data-page="book"
              onClick={() => track('cta_click', { cta: 'nav_book', page: pathname })}
            >
              Book a Walk
            </Link>
          </div>
          <div
            id="nav-hamburger-toggle"
            className="nav-hamburger"
            role="button"
            tabIndex={0}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMobileOpen((v) => !v);
              }
            }}
          >
            <span></span><span></span><span></span>
          </div>
        </div>
      </nav>

      <div className="mobile-menu" id="mobile-menu" style={{ display: mobileOpen ? 'block' : 'none' }}>
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>{link.label}</Link>
        ))}
        <Link href="/contact">Contact</Link>
        <Link
          href="/book"
          className="mobile-cta"
          onClick={() => track('cta_click', { cta: 'mobile_menu_book', page: pathname })}
        >
          Book a Walk
        </Link>
        <Link href="/admin" id="mobile-menu-login-link">Login</Link>
      </div>
    </>
  );
}
