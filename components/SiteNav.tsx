'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { INSTAGRAM_URL } from '@/lib/content/site';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';
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
// `cta` is set only on the two entries the owner reports on (service interest
// and contact intent); the rest stay untracked on purpose. Exported so the
// wiring is testable without a DOM renderer — see tests/unit/site-nav-links.test.ts.
export const NAV_LINKS: Array<{ href: string; label: string; dataPage: string; cta?: CtaId }> = [
  { href: '/#home-personalized-care-section', label: 'What We Do', dataPage: 'services', cta: 'nav_services' },
  { href: '/#home-team-section', label: 'Who Does It', dataPage: 'about' },
  { href: '/#home-closing-parks-row', label: 'Where We Do It', dataPage: 'neighborhoods' },
  { href: '/#home-how-it-works-block', label: 'How It Works', dataPage: 'how-it-works' },
  { href: '/#home-contact-sheet-section', label: 'Let’s Get Started', dataPage: 'contact', cta: 'nav_contact' },
];

// SiteNav is already a Client Component and every tracked control in it already
// owns an onClick (smooth scroll, or opening the welcome modal), so the click is
// recorded inline instead of through TrackedCtaLink — same one-event-per-click
// behaviour, without splitting each map() below into two link shapes. Tracking
// must never break the navigation it is measuring, hence the try/catch.
function trackNavCta(cta: CtaId) {
  try {
    track('cta_click', { cta });
  } catch (err) {
    console.warn('[analytics] cta_click failed', err);
  }
}

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
  function handleBookClick(e: React.MouseEvent<HTMLAnchorElement>, cta: CtaId) {
    trackNavCta(cta);
    // A cmd/ctrl/shift-click means "open this somewhere else" — let the browser
    // do that with the real href instead of opening the modal over this page.
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
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
      <nav id="main-nav" ref={navRef} data-mobile-open={mobileOpen ? 'true' : 'false'}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            {/* Nav wordmark, CSS-sized (#nav-logo-img in app/globals.css sets
                width: 370/200/190/168px across breakpoints/scroll states,
                height: auto). Plain <img>, not next/image: the source PNG is
                already ~50KB and shown above the fold on every route, so the
                ~60KB next/image client runtime this dragged into every
                marketing route's bundle cost more than the resize/format
                conversion saved — see plans/010 "Release budgets". */}
            {/* eslint-disable-next-line @next/next/no-img-element -- small (~50KB) CSS-sized wordmark shown as-is; next/image runtime cost exceeds its savings here */}
            <img
              id="nav-logo-img"
              src="/img/horiz_logo_off_white.png"
              alt="Not The Rug"
              width={498}
              height={88}
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <div className="nav-links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-page={link.dataPage}
                className={pathname === link.href ? 'active' : undefined}
                scroll={isHomeHashLink(link.href) ? false : undefined}
                onClick={() => {
                  if (link.cta) trackNavCta(link.cta);
                  handleHashLinkClick(link.href);
                }}
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
            <Link href="/book" id="nav-book-cta" className="nav-cta btn-accent" data-page="book" onClick={(e) => handleBookClick(e, 'nav_book')}>Book a Walk</Link>
          </div>
          {/* Real <button>, not a div role="button": every selector below is
              class/attribute-based (.nav-hamburger, [data-open]), not tag-based,
              so this keeps its styling. aria-label gives it the accessible
              name it never had (the three bars are unlabeled decoration) — the
              browser's native Enter/Space activation replaces the old
              hand-rolled onKeyDown. */}
          <button
            type="button"
            id="nav-hamburger-toggle"
            className="nav-hamburger"
            data-open={mobileOpen ? 'true' : 'false'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className="mobile-menu" id="mobile-menu" data-open={mobileOpen ? 'true' : 'false'}>
        <div id="mobile-menu-links-list">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            scroll={isHomeHashLink(link.href) ? false : undefined}
            onClick={() => {
              if (link.cta) trackNavCta(link.cta);
              handleHashLinkClick(link.href);
            }}
          >{link.label}</Link>
        ))}
        </div>
        <Link href="/book" id="mobile-menu-book-cta" className="mobile-cta btn-accent" onClick={(e) => handleBookClick(e, 'mobile_menu_book')}>Book a Walk</Link>
        <div id="mobile-menu-utility-row">
          <Link href="/admin" id="mobile-menu-login-link">Login</Link>
          <a
            id="mobile-menu-instagram-link"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Not The Rug on Instagram"
            onClick={() => setMobileOpen(false)}
          >
            <InstagramGlyph /> Instagram
          </a>
        </div>
      </div>
    </>
  );
}
