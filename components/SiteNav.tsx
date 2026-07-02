'use client';

import { useState } from 'react';
import Link from 'next/link';

// Full site navigation for standalone routes (e.g. /contact, /book).
// Section links deep-link into the homepage SPA via ?page= / ?hood=,
// which app/page.tsx reads on init to open the matching section.
export default function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav id="main-nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <img id="nav-logo-img" src="/img/horiz_logo_off_white.png" alt="Not The Rug" />
          </Link>
          <div className="nav-links">
            <Link href="/?page=services" data-page="services">Services &amp; Rates</Link>
            <Link href="/?page=how-it-works" data-page="how-it-works">How It Works</Link>
            <Link href="/?page=about" data-page="about">About Us</Link>
            <Link href="/?page=safety" data-page="safety">Safety &amp; Trust</Link>
            <div className="nav-dropdown">
              <a href="#" onClick={(e) => e.preventDefault()} data-page="neighborhoods">Neighborhoods ▾</a>
              <div className="dropdown-menu">
                <Link href="/?hood=williamsburg">Williamsburg</Link>
                <Link href="/?hood=greenpoint">Greenpoint</Link>
                <Link href="/?hood=bushwick">Bushwick</Link>
                <Link href="/?hood=bedstuy">Bed-Stuy</Link>
                <Link href="/?hood=park-slope">Park Slope</Link>
                <Link href="/?page=neighborhoods">All Neighborhoods →</Link>
              </div>
            </div>
            <Link href="/?page=reviews" data-page="reviews">Reviews</Link>
            <Link href="/admin" id="nav-admin-login-link">Login</Link>
            <Link href="/book" className="nav-cta" data-page="book">Book a Walk</Link>
          </div>
          <div className="nav-hamburger" onClick={() => setMobileOpen((v) => !v)}>
            <span></span><span></span><span></span>
          </div>
        </div>
      </nav>

      <div className="mobile-menu" id="mobile-menu" style={{ display: mobileOpen ? 'block' : 'none' }}>
        <Link href="/?page=services">Services &amp; Rates</Link>
        <Link href="/?page=how-it-works">How It Works</Link>
        <Link href="/?page=about">About Us</Link>
        <Link href="/?page=safety">Safety &amp; Trust</Link>
        <Link href="/?page=neighborhoods">Neighborhoods</Link>
        <Link href="/?page=reviews">Reviews</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/book" className="mobile-cta">Book a Walk</Link>
        <Link href="/admin" id="mobile-menu-login-link">Login</Link>
      </div>
    </>
  );
}
