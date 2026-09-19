'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { INSTAGRAM_URL } from '@/lib/content/site';
import { usePathname } from 'next/navigation';
import { useNavScrollShadow } from './marketing/hooks/useNavScrollShadow';
import { openWelcomeWalkModal } from './marketing/WelcomeWalkModal';

/**
 * Every nav item now points at a section of the home page: the standalone
 * Services / How It Works / About / Safety / Reviews routes are represented
 * there, so the nav scrolls rather than navigates. `dataPage` keeps the old
 * page keys, which the active-state and analytics hooks still read.
 */
// Five plain-language entries instead of seven section names: the bar answers
// what, who, where and how, then asks for the walk. Each one lands on the band
// that holds the answer, listed in the order those bands appear on the page, so
// the nav reads as a table of contents rather than a menu with its own sequence.
//
// The last two are a pair: "How It Works" opens the process steps, and
// "Let's Get Started" drops on the intake form directly below them — read the
// steps, then fill the sheet.
//
// Deliberately not in the bar: Safety (its credentials are inside the band
// "Where We Do It" opens) and Reviews — the footer carries the full list of
// section links.
const NAV_LINKS: Array<{ href: string; label: string; dataPage: string }> = [
  { href: '/#home-personalized-care-section', label: 'What We Do', dataPage: 'services' },
  { href: '/#home-team-section', label: 'Who Does It', dataPage: 'about' },
  { href: '/#home-closing-parks-row', label: 'Where We Do It', dataPage: 'neighborhoods' },
  { href: '/#home-how-it-works-block', label: 'How It Works', dataPage: 'how-it-works' },
  { href: '/#home-contact-sheet-section', label: 'Let’s Get Started', dataPage: 'contact' },
];

// Full site navigation for every marketing route. Real Next.js routes now —
// no more `?page=`/`?hood=` deep links or window.showPage DOM toggling
// (see plans/002-production-readiness.md R13). Legacy `?page=`/`?hood=`
// URLs are still honored via a redirect on the home route.
/** Instagram glyph, same path the footer's social button uses. */
function InstagramGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

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

  /**
   * "Book a Walk" pops the welcome modal instead of navigating — but only on
   * the home route, the one page that renders it (see HomePageContent).
   * Everywhere else the link goes to /book as before, which is also the
   * pre-hydration and no-JS behaviour on home.
   */
  const bookOpensModal = pathname === '/';
  function handleBookClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!bookOpensModal) return;
    e.preventDefault();
    setMobileOpen(false);
    openWelcomeWalkModal();
  }

  /**
   * In-page entries (Services, How It Works, Williamsburg) ease down to their
   * section when we're already on the home route. The Link still does the
   * navigation — it keeps the hash in the URL and in history — it just hands
   * the scroll over (`scroll={false}` on home only, see isHomeHashLink),
   * because globals.css deliberately omits `scroll-behavior: smooth` and Next
   * would otherwise jump. Reduced motion gets that jump back. Off home the
   * link is a real navigation and the browser lands on the anchor itself.
   */
  function isHomeHashLink(href: string) {
    return pathname === '/' && href.startsWith('/#');
  }
  function handleHashLinkClick(href: string) {
    if (!isHomeHashLink(href)) return;
    const target = document.getElementById(href.slice(2));
    if (!target) return; // section not on the page — let the link navigate
    setMobileOpen(false);
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return (
    <>
      <nav id="main-nav" ref={navRef}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <img id="nav-logo-img" src="/img/horiz_logo_off_white.png" alt="Not The Rug" />
          </Link>
          <div className="nav-links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-page={link.dataPage}
                className={pathname === link.href ? 'active' : undefined}
                scroll={isHomeHashLink(link.href) ? false : undefined}
                onClick={() => handleHashLinkClick(link.href)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/admin" id="nav-admin-login-link">Login</Link>
            <a
              id="nav-instagram-link"
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Not The Rug on Instagram"
            >
              <InstagramGlyph />
            </a>
            <Link href="/book" className="nav-cta btn-accent" data-page="book" onClick={handleBookClick}>Book a Walk</Link>
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
          <Link
            key={link.href}
            href={link.href}
            scroll={isHomeHashLink(link.href) ? false : undefined}
            onClick={() => handleHashLinkClick(link.href)}
          >{link.label}</Link>
        ))}
        <Link href="/book" className="mobile-cta btn-accent" onClick={handleBookClick}>Book a Walk</Link>
        <Link href="/admin" id="mobile-menu-login-link">Login</Link>
        <a
          id="mobile-menu-instagram-link"
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
        >
          <InstagramGlyph /> Instagram
        </a>
      </div>
    </>
  );
}
