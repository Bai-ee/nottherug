import type { Metadata } from 'next';
import Link from 'next/link';
import MeetGreetForm from '@/components/MeetGreetForm';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/book',
  title: 'Book a Walk — Free Meet & Greet · Not The Rug',
  description: 'No commitment, no charge. We come to you, meet your dog, and answer every question.',
});

export default function BookPage() {
  return (
    <div id="book-page" className="page" style={{ display: 'block' }}>
      <nav id="main-nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <img id="nav-logo-img" src="/img/horiz_logo_off_white.png" alt="Not The Rug" />
          </Link>
          <div className="nav-links">
            <Link
              href="/admin"
              id="nav-admin-login-link"
              style={{
                background: '#fff',
                color: '#1c1c1a',
                padding: '9px 22px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                opacity: 1,
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
              }}
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div
        id="book-hero-shell"
        className="book-hero"
        style={{
          background:
            "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00007.png') center 20%/cover no-repeat",
        }}
      >
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>Get Started</div>
          <h1>
            Book your free<br />Meet &amp; Greet
          </h1>
          <p>No commitment, no charge. We come to you, meet your dog, and answer every question.</p>
        </div>
      </div>

      <section id="book-form-section" className="section">
        <div className="container">
          <div className="booking-form-wrap">
            <div className="booking-form">
              <div id="book-form-body" className="booking-form-body">
                <MeetGreetForm paneId="book-tab-meetgreet" source="book-page" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
