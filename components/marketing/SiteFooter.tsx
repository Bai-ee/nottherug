import Image from 'next/image';
import Link from 'next/link';
import { INSTAGRAM_URL, YELP_URL, GOOGLE_REVIEW_URL } from '@/lib/content/site';
import TrackedCtaLink from './TrackedCtaLink';
import TrackedCtaAnchor from './TrackedCtaAnchor';
import ContactUsTrigger from './ContactUsTrigger';
import {
  PHONE_DISPLAY,
  PHONE_HREF,
  EMAIL_DISPLAY,
  EMAIL_HREF,
  RESPONSE_HOURS,
} from '@/lib/content/contact';
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
// Layout note: the Brooklyn Bridge collage (#footer-art-shell) is the footer's
// focal point — a full-strength print at the centre of the grid on desktop, on
// top of everything at tablet and phone. The brand block, the link columns, the
// CTA and the legal line are all grid areas around it (see FOOTER in
// globals.css); nothing reads over the artwork.

// Both lists, and the columns themselves, run in page order — the rates in the
// order the cards are laid out (Dog Walking is the featured card and renders
// below the other three), the company entries in the order their bands appear.
// All four rate links report under one id, footer_services: the number the
// owner acts on is "did the footer send anyone to the rates", not which rate
// card they landed on. The per-link `id` is a DOM handle for styling and for
// the wiring test, not a second analytics id.
const FOOTER_RATES: Array<{ href: string; label: string; id: string }> = [
  { href: '/#home-rate-boarding-dog-sitting', label: 'Boarding & Dog Sitting', id: 'footer-rates-link-boarding-dog-sitting' },
  { href: '/#home-rate-puppy-walks', label: 'Puppy Walks', id: 'footer-rates-link-puppy-walks' },
  { href: '/#home-rate-senior-special-needs-walks', label: 'Senior & Special Needs', id: 'footer-rates-link-senior-special-needs' },
  { href: '/#home-group-walk-feature-card', label: 'Dog Walking', id: 'footer-rates-link-dog-walking' },
];

// Contact left this list when it became a modal trigger (ContactUsTrigger,
// rendered after the map): it is a button now, not an href, and it is the one
// company entry that states an intent rather than a reading interest — so it
// is also the only one carrying a cta id. The rest stay untracked on purpose.
const FOOTER_COMPANY: Array<{ href: string; label: string; id?: string; cta?: CtaId }> = [
  { href: '/#home-team-section', label: 'The Team' },
  { href: '/#home-closing-trust-section', label: 'Safety & Trust' },
  { href: '/#home-featured-reviews-section', label: 'Reviews' },
  { href: '/#home-instagram-section', label: 'Instagram' },
  { href: '/#home-how-it-works-block', label: 'How It Works' },
  { href: '/signup', label: 'Sign Up' },
];

export default function SiteFooter() {
  return (
    <footer id="main-footer">
      <div className="container">
        <div id="footer-content-zone">
          <div className="footer-grid">
            {/* The collage carries its own "Not The Rug · NYC Dog Walking" label,
                so it stands in for the cream circle badge this footer used to
                lead with. Static, sized by CSS (#footer-art-image). */}
            <div id="footer-art-shell">
              <Image
                id="footer-art-image"
                src="/img/bg-section-graphic-1.webp"
                alt="Not The Rug — NYC dog walking. A collage of the Brooklyn Bridge and the Manhattan skyline."
                width={1620}
                height={971}
                sizes="(max-width: 767px) 100vw, (max-width: 1100px) 720px, 46vw"
              />
            </div>
            <div className="footer-brand" id="footer-brand-block">
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
                    <TrackedCtaLink href={link.href} id={link.id} cta="footer_services">{link.label}</TrackedCtaLink>
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
                      <TrackedCtaLink href={link.href} id={link.id} cta={link.cta}>{link.label}</TrackedCtaLink>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
                <li>
                  <ContactUsTrigger
                    id="footer-company-contact-link"
                    cta="footer_contact"
                    className="footer-link-btn"
                  >
                    Contact Us
                  </ContactUsTrigger>
                </li>
              </ul>
            </div>
            {/* The same four facts the contact modal carries, in the same
                order, each held to a line or two. The street address stays
                on the legal line below, and the full service-area caveat
                stays in the modal. */}
            <div className="footer-col" id="footer-col-contact">
              <h4>Contact</h4>
              <ul id="footer-contact-list">
                <li className="footer-contact-item">
                  <span className="footer-contact-label">Call or Text</span>
                  <TrackedCtaAnchor
                    href={PHONE_HREF}
                    id="footer-contact-phone-link"
                    cta="contact_phone"
                    className="footer-contact-value"
                  >
                    {PHONE_DISPLAY}
                  </TrackedCtaAnchor>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-label">Email</span>
                  <TrackedCtaAnchor
                    href={EMAIL_HREF}
                    id="footer-contact-email-link"
                    cta="contact_email"
                    className="footer-contact-value"
                  >
                    {EMAIL_DISPLAY}
                  </TrackedCtaAnchor>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-label">Service Area</span>
                  <Link href="/#home-closing-parks-row" className="footer-contact-value">Williamsburg</Link>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-label">Response Hours</span>
                  <span className="footer-contact-value">{RESPONSE_HOURS}</span>
                </li>
              </ul>
            </div>
            {/* No rules in here: spacing separates the blocks. */}
            <div id="footer-cta-shell">
              <TrackedCtaLink
                href="/book"
                id="footer-book-luis-cta"
                className="btn btn-primary btn-sm btn-accent"
                cta="footer_book"
              >Contact Luis, to set up a walk</TrackedCtaLink>
            </div>
            <div className="footer-bottom">
              <div className="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St &amp; Meeker Ave · All rights reserved</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
