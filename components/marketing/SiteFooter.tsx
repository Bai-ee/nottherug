import Link from 'next/link';
import { INSTAGRAM_URL, YELP_URL, GOOGLE_REVIEW_URL } from '@/lib/content/site';
import TrackedCtaLink from './TrackedCtaLink';
import type { CtaId } from '@/lib/analytics/events';

// Shared footer for the marketing pages that had it in the source SPA (home,
// services, how-it-works, about, safety, neighborhoods, reviews). /book and
// /contact do not render it, matching their existing dedicated route design.
//
// Every nav entry points at the band on the home page that actually holds it —
// each rate at its own card, each company entry at its section. Entries with
// nowhere to land were dropped rather than left pointing at the top of a
// section: "Walk + Training" (no such rate), "Book a Walk" (a route, not a
// band — the CTA button below covers it), "Our Story" (its band was removed)
// and the placeholder Privacy/Terms links, which were href="#".
//
// Layout note: the dog collage overlays the footer's bottom-right corner (see
// `#main-footer::after` in globals.css), so everything under the link row is
// held to the left half — nothing reads over the artwork.

// Both lists, and the columns themselves, run in page order — the rates in the
// order the cards are laid out (Group Walk is the featured card and renders
// below the other five), the company entries in the order their bands appear.
// All six rate links report under one id, footer_services: the number the
// owner acts on is "did the footer send anyone to the rates", not which rate
// card they landed on. The per-link `id` is a DOM handle for styling and for
// the wiring test, not a second analytics id.
const FOOTER_RATES: Array<{ href: string; label: string; id: string }> = [
  { href: '/#home-rate-solo-walk', label: 'Solo Walk', id: 'footer-rates-link-solo-walk' },
  { href: '/#home-rate-senior-dog-visits', label: 'Senior Dog Visits', id: 'footer-rates-link-senior-dog-visits' },
  { href: '/#home-rate-puppy-walk', label: 'Puppy Walk', id: 'footer-rates-link-puppy-walk' },
  { href: '/#home-rate-boarding-overnight-sitting', label: 'Boarding & Sitting', id: 'footer-rates-link-boarding-sitting' },
  { href: '/#home-rate-cat-visits', label: 'Cat Visits', id: 'footer-rates-link-cat-visits' },
  { href: '/#home-group-walk-feature-card', label: 'Group Walk', id: 'footer-rates-link-group-walk' },
];

// Only "Contact" carries a cta id — it is the one company entry that states an
// intent rather than a reading interest. The rest stay untracked on purpose.
const FOOTER_COMPANY: Array<{ href: string; label: string; id?: string; cta?: CtaId }> = [
  { href: '/#home-team-section', label: 'The Team' },
  { href: '/#home-closing-trust-section', label: 'Safety & Trust' },
  { href: '/#home-featured-reviews-section', label: 'Reviews' },
  { href: '/#home-instagram-section', label: 'Instagram' },
  { href: '/#home-how-it-works-block', label: 'How It Works' },
  { href: '/#home-contact-sheet-header', label: 'Contact', id: 'footer-company-contact-link', cta: 'footer_contact' },
];

export default function SiteFooter() {
  return (
    <footer id="main-footer">
      <div className="container">
        <div id="footer-content-zone">
          <div className="footer-grid">
            <div className="footer-brand">
              {/* Cream circle badge in place of the wordmark — the footer runs
                  olive, and the disc is the one lockup that reads on it. */}
              <img
                id="footer-logo-badge"
                src="/logos/notRugYellow.png"
                alt="Not The Rug — NYC dog walking"
              />
              <p className="footer-tagline">Brooklyn&apos;s most trusted neighborhood dog walking service. Williamsburg-based since 2011. Small groups, consistent walkers, genuine care.</p>
              <div className="footer-social">
                <a
                  id="footer-instagram-link"
                  className="social-btn"
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Not The Rug on Instagram"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a
                  id="footer-yelp-link"
                  className="social-btn"
                  href={YELP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Not The Rug on Yelp"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </a>
                <a
                  id="footer-google-link"
                  className="social-btn"
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Not The Rug on Google"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                </a>
              </div>
            </div>
            <div className="footer-col" id="footer-col-rates">
              <h4>Services</h4>
              <ul>
                {FOOTER_RATES.map((link) => (
                  <li key={link.href}>
                    <TrackedCtaLink href={link.href} id={link.id} cta="footer_services" page="site">{link.label}</TrackedCtaLink>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-col" id="footer-col-company">
              <h4>Company</h4>
              <ul>
                {FOOTER_COMPANY.map((link) => (
                  <li key={link.href}>
                    {link.cta ? (
                      <TrackedCtaLink href={link.href} id={link.id} cta={link.cta} page="site">{link.label}</TrackedCtaLink>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-col" id="footer-col-service-area">
              <h4>Service Area</h4>
              <ul>
                <li><Link href="/#home-closing-parks-row">Williamsburg</Link></li>
              </ul>
            </div>
          </div>
          {/* No rules in here: the hairline above this row and the
              "Brooklyn · Est. 2011" rule under it read as clutter against the
              background artwork. Spacing separates the blocks instead. */}
          <div id="footer-cta-shell" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', paddingTop: '8px', marginBottom: '28px' }}>
            <TrackedCtaLink
              href="/book"
              id="footer-book-luis-cta"
              className="btn btn-primary btn-sm btn-accent"
              style={{ whiteSpace: 'nowrap' }}
              cta="footer_book"
              page="site"
            >Contact Luis</TrackedCtaLink>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St &amp; Meeker Ave · All rights reserved</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
