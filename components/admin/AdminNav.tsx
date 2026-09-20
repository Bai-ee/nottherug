'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { useNavScrollShadow } from '@/components/marketing/hooks/useNavScrollShadow';

/**
 * The admin section bar. Same markup shape and the same class names as
 * components/SiteNav.tsx, so it inherits the marketing nav's styling from
 * app/globals.css — the fixed olive band, the pasted paper logo, the mobile
 * menu — without any admin-only nav styling of its own. Only the
 * destinations differ: marketing links become dashboard sections, and the
 * "Book a Walk" CTA slot becomes the way back to the Client Access page.
 *
 * Reconciled union of every destination the five former per-page navs
 * pointed at (dashboard/leads/generator/photos/brief), plus the founder
 * brief preview link the dashboard's old nav carried.
 */
const NAV_LINKS: Array<{ href: string; label: string; locked?: boolean }> = [
  { href: '/admin/dashboard', label: 'Site Performance' },
  { href: '/admin/dashboard/leads', label: 'Scheduled Leads' },
  // Locked: the tools behind these are not ready for the owner to use on
  // their own yet. They stay listed so the sections are not a surprise later,
  // but they do not navigate and are not focusable.
  { href: '/admin/dashboard/brief', label: 'Brief', locked: true },
  { href: '/admin/dashboard/photos', label: 'Photos', locked: true },
  { href: '/admin/dashboard/generator', label: 'Generator', locked: true },
  { href: '/admin/dashboard/preview/founder-brief', label: 'Founder Brief', locked: true },
];

/** A small padlock, so a locked entry says why it does nothing. */
function LockIcon() {
  return (
    <svg
      className="admin-nav-lock-icon"
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

// /admin/dashboard is a prefix of every other destination here, so it only
// counts as active on an exact match; the rest also match their own subpaths.
function isActive(pathname: string, href: string): boolean {
  if (href === '/admin/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ email, onSignOut }: { email: string; onSignOut: () => void | Promise<void> }) {
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  // The same hook the marketing nav uses: past the top of the viewport the
  // band takes its shadow and the oversized paper logo tucks back in, so it
  // stops hanging over the content scrolling underneath it.
  useNavScrollShadow(navRef);

  return (
    <>
      {/* The ids below are the marketing nav's own ids on purpose: the polish
          rules in app/globals.css hang off #main-nav and #mobile-menu, so
          reusing them is what makes this bar identical to the site's without
          a line of admin-only nav CSS. SiteNav never renders on these pages,
          so the ids stay unique. */}
      <nav id="main-nav" data-admin-nav="" ref={navRef} data-mobile-open={mobileOpen ? 'true' : 'false'}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            {/* Same #nav-logo-img CSS sizing as the marketing nav (see
                app/globals.css and app/(marketing)/book/page.tsx). Plain
                <img>, not next/image: the source PNG is already ~50KB, so
                the next/image client runtime cost more than the
                resize/format conversion saved here — see plans/010
                "Release budgets" and components/SiteNav.tsx. */}
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
            {NAV_LINKS.map((link) => {
              if (link.locked) {
                return (
                  <span key={link.href} className="admin-nav-locked" aria-disabled="true">
                    {link.label}
                    <LockIcon />
                  </span>
                );
              }
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? 'active' : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/" id="admin-nav-view-site-link">View Site</Link>
            <button type="button" id="admin-nav-signout" onClick={() => void onSignOut()} title={email}>
              Sign Out
            </button>
            <Link href="/admin" id="admin-nav-client-access-link" className="nav-cta btn-accent">
              Client Access
            </Link>
          </div>
          <div
            id="admin-nav-hamburger-toggle"
            className="nav-hamburger"
            data-open={mobileOpen ? 'true' : 'false'}
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

      <div className="mobile-menu" id="mobile-menu" data-open={mobileOpen ? 'true' : 'false'}>
        <div id="mobile-menu-links-list">
          {NAV_LINKS.map((link) =>
            link.locked ? (
              <span key={link.href} className="admin-nav-locked" aria-disabled="true">
                {link.label}
                <LockIcon />
              </span>
            ) : (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ),
          )}
        </div>
        <Link href="/" id="admin-mobile-menu-view-site-link" onClick={() => setMobileOpen(false)}>
          View Site
        </Link>
        <button
          type="button"
          id="admin-mobile-menu-signout"
          onClick={() => { setMobileOpen(false); void onSignOut(); }}
        >
          Sign Out
        </button>
        <span id="admin-mobile-menu-email">{email}</span>
        <Link
          href="/admin"
          id="admin-mobile-menu-client-access-link"
          className="mobile-cta btn-accent"
          onClick={() => setMobileOpen(false)}
        >
          Client Access
        </Link>
      </div>
    </>
  );
}
