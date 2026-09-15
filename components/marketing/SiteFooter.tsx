import Link from 'next/link';
import TrackedCtaLink from './TrackedCtaLink';

// Shared footer for the marketing pages that had it in the source SPA (home,
// services, how-it-works, about, safety, neighborhoods, reviews). /book and
// /contact do not render it, matching their existing dedicated route design.
export default function SiteFooter() {
  return (
    <footer id="main-footer">
      <div className="container">
        <div id="footer-content-zone">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">Not The Rug</div>
              <p className="footer-tagline">Brooklyn&apos;s most trusted neighborhood dog walking service. Williamsburg-based since 2011. Small groups, consistent walkers, genuine care.</p>
              <div className="footer-social">
                <div className="social-btn" title="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </div>
                <div className="social-btn" title="Yelp">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                <div className="social-btn" title="Google">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                </div>
              </div>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <ul>
                <li><Link href="/services">Group Walks</Link></li>
                <li><Link href="/services">Walk + Training</Link></li>
                <li><Link href="/services">Puppy Visits</Link></li>
                <li><Link href="/services">Senior Dog Care</Link></li>
                <li><Link href="/services">Boarding</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Service Area</h4>
              <ul>
                <li><Link href="/neighborhoods/williamsburg">Williamsburg</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/how-it-works">How It Works</Link></li>
                <li><Link href="/safety">Safety &amp; Trust</Link></li>
                <li><Link href="/reviews">Reviews</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/book">Book a Walk</Link></li>
              </ul>
            </div>
          </div>
          <div id="footer-cta-shell" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '28px', marginBottom: '28px' }}>
            <div id="footer-cta-copy" style={{ maxWidth: '440px' }}>
              <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Ready to get started?</h4>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Book a free meet &amp; greet and tell us about your dog. No commitment — just a chance to connect.</p>
            </div>
            <TrackedCtaLink href="/book" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }} cta="footer_book" page="footer">Book Luis, for a Meet &amp; Greet</TrackedCtaLink>
          </div>
          <div className="divider-word divider-word-dark" id="footer-est-divider" aria-hidden="true">Brooklyn &middot; Est. 2011</div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St &amp; Meeker Ave · All rights reserved</div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="#" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Privacy</a>
              <a href="#" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Terms</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
