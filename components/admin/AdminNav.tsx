'use client';

import { usePathname } from 'next/navigation';

/**
 * Reconciled union of every destination the five former per-page navs
 * pointed at (dashboard/leads/generator/photos/brief), plus the founder
 * brief preview link the dashboard's old nav carried.
 */
const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/dashboard/leads', label: 'Leads' },
  { href: '/admin/dashboard/brief', label: 'Brief' },
  { href: '/admin/dashboard/photos', label: 'Photos' },
  { href: '/admin/dashboard/generator', label: 'Generator' },
  { href: '/admin/dashboard/preview/founder-brief', label: 'Founder Brief' },
];

// /admin/dashboard is a prefix of every other destination here, so it only
// counts as active on an exact match; the rest also match their own subpaths.
function isActive(pathname: string, href: string): boolean {
  if (href === '/admin/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav id="admin-chrome-nav" aria-label="Admin sections">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            className={active ? 'admin-chrome-nav-link admin-chrome-nav-link-active' : 'admin-chrome-nav-link'}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
