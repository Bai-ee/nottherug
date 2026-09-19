import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import BookingOnboardingIntake from '@/components/booking/BookingOnboardingIntake';
import { parseBookingPrefill } from '@/lib/leads/prefill';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/book',
  title: 'Book a Walk — Free Meet & Greet',
  description: 'No commitment, no charge. We come to you, meet your dog, and answer every question.',
});

// The welcome modal (components/marketing/WelcomeWalkModal.tsx) sends visitors
// here with their two answers in the query string. parseBookingPrefill only
// accepts values that match the shared option lists, so anything else is
// ignored and the form opens with its normal defaults.
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const prefill = parseBookingPrefill(await searchParams, 'book-page');

  return (
    <div id="book-page" className="page" style={{ display: 'block' }}>
      <nav id="main-nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            {/* Nav wordmark, CSS-sized (#nav-logo-img in app/globals.css sets
                width: 370/200/190/168px across breakpoints/scroll states,
                height: auto) — the same responsive-image pattern next/image
                supports via its own width/height + sizes, not a static box. */}
            <Image
              id="nav-logo-img"
              src="/img/horiz_logo_off_white.png"
              alt="Not The Rug"
              width={498}
              height={88}
              sizes="(max-width: 767px) 200px, 370px"
              priority
            />
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
            "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00007.webp') center 20%/cover no-repeat",
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
                {/* Same props as before, now via the wrapper that also reads
                    the welcome modal's sessionStorage handoff when the visitor
                    arrives at ?onboarding=welcome. */}
                <BookingOnboardingIntake
                  paneId="book-tab-meetgreet"
                  source={prefill.source}
                  initialValues={prefill.values}
                  initialPhoneConsult={prefill.phoneConsult}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
