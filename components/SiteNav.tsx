'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { GOOGLE_WRITE_REVIEW_URL, INSTAGRAM_URL } from '@/lib/content/site';
import { track } from '@/lib/analytics/track';
import type { CtaId } from '@/lib/analytics/events';
import { usePathname } from 'next/navigation';
import { useNavScrollShadow } from './marketing/hooks/useNavScrollShadow';
import { openWelcomeWalkModal } from '@/lib/marketing/welcome-modal';
import ContactUsTrigger from './marketing/ContactUsTrigger';

type NavLink = { href: string; label: string; dataPage: string; cta?: CtaId; external?: boolean };

/**
 * The bar carries only the main destinations; the hamburger (shown at every
 * width) carries everything. Hash links land on a band of the home page and
 * scroll there when already on home; `dataPage` keeps the page keys the
 * active-state and analytics hooks read. `cta` is set only where the owner
 * reports on the click (service interest and contact intent).
 */
export const BAR_LINKS: NavLink[] = [
  { href: '/#home-personalized-care-section', label: 'Services', dataPage: 'services', cta: 'nav_services' },
  { href: '/#home-team-section', label: 'About', dataPage: 'about' },
  { href: '/#home-featured-reviews-section', label: 'Reviews', dataPage: 'reviews' },
  { href: '/walk-with-us', label: 'Join Our Team', dataPage: 'walk-with-us' },
];

/**
 * The full menu, in the order the bands appear on the home page, then the
 * two off-page destinations. Exported so the wiring is testable without a DOM
 * renderer — see tests/unit/site-nav-links.test.ts.
 */
export const NAV_LINKS: NavLink[] = [
  { href: '/#home-personalized-care-section', label: 'What We Do', dataPage: 'services', cta: 'nav_services' },
  { href: '/#home-team-section', label: 'Who Does It', dataPage: 'about' },
  { href: '/#home-featured-reviews-section', label: 'Reviews', dataPage: 'reviews' },
  { href: '/#home-closing-parks-row', label: 'Where We Do It', dataPage: 'neighborhoods' },
  { href: '/#home-how-it-works-block', label: 'How It Works', dataPage: 'how-it-works' },
  { href: '/#home-contact-sheet-section', label: 'Let’s Get Started', dataPage: 'contact', cta: 'nav_get_started' },
  { href: '/walk-with-us', label: 'Join Our Team', dataPage: 'walk-with-us' },
  // Google's own write-a-review form (Google allows a business to ask; Yelp
  // does not, so Yelp is never linked as a place to leave one).
  { href: GOOGLE_WRITE_REVIEW_URL, label: 'Leave a Review', dataPage: 'review', external: true },
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
   * "Book a Walk" pops the welcome modal instead of navigating, on every
   * route: the home page renders the modal itself (HomePageContent) and the
   * marketing layout's WelcomeModalHost loads it on demand everywhere else.
   * The href stays /book for the pre-hydration and no-JS case.
   */
  function handleBookClick(e: React.MouseEvent<HTMLAnchorElement>, cta: CtaId) {
    trackNavCta(cta);
    // A cmd/ctrl/shift-click means "open this somewhere else" — let the browser
    // do that with the real href instead of opening the modal over this page.
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    // Only cancel the link when the modal took the request (a page with no
    // modal host still follows /book).
    if (!openWelcomeWalkModal()) return;
    e.preventDefault();
    setMobileOpen(false);
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
          <div className="nav-links" id="nav-bar-links">
            {BAR_LINKS.map((link) => (
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
            {/* A button, not a route: Contact opens the contact modal in place.
                The /contact page is still reachable on its own. */}
            <ContactUsTrigger id="nav-contact-us-trigger" cta="nav_contact_us" className="nav-contact-btn">
              Contact
            </ContactUsTrigger>
          </div>
          {/* Always on the bar, at every width: the booking ask, Instagram,
              then the menu that holds everything else. */}
          <div id="nav-actions-row">
            <Link href="/book" id="nav-book-cta" className="nav-cta btn-accent" data-page="book" onClick={(e) => handleBookClick(e, 'nav_book')}>Book a Walk</Link>
            <a
              id="nav-instagram-link"
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Not The Rug on Instagram"
            >
              <InstagramGlyph />
            </a>
            {/* Real <button>: aria-label names it, and native Enter/Space
                activation replaces a hand-rolled onKeyDown. */}
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
        </div>
      </nav>

      <div className="mobile-menu" id="mobile-menu" data-open={mobileOpen ? 'true' : 'false'}>
        <div id="mobile-menu-links-list">
        {/* A button, not a route: it opens the contact modal in place, like the
            bar's Contact Us. First row, above What We Do. */}
        <ContactUsTrigger
          id="mobile-menu-contact-trigger"
          cta="nav_contact_us"
          className="mobile-menu-primary-contact-btn"
          onOpen={() => setMobileOpen(false)}
        >
          Contact Us
        </ContactUsTrigger>
        {NAV_LINKS.map((link) => link.external ? (
          <a key={link.href} href={link.href} target="_blank" rel="noopener" onClick={() => setMobileOpen(false)}>{link.label}</a>
        ) : (
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
