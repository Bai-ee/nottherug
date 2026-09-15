import type { Metadata } from 'next';
import MeetGreetForm from '@/components/MeetGreetForm';
import SiteNav from '@/components/SiteNav';
import ContactInfoCard from '@/components/marketing/ContactInfoCard';
import { buildPageMetadata, INSTAGRAM_PLACEHOLDER_URL } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/contact',
  title: "We're real people with a real number",
  description: 'No chatbots, no ticket queues. Text us, call us, or fill out the form.',
  noIndex: true,
});

// The SPA's ?page=contact hero referenced a non-existent asset
// ("Screenshot 2026-03-23 at 8.41.59 AM.png" is not in public/dogs) —
// this route uses the same photo already shipped on /book instead.
const CONTACT_HERO_BACKGROUND =
  "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00007.webp') center 20%/cover no-repeat";

export default function ContactPage() {
  return (
    <div id="contact-page" className="page" style={{ display: 'block' }}>
      <SiteNav />

      <div
        id="contact-hero"
        className="page-hero"
        style={{ background: CONTACT_HERO_BACKGROUND }}
      >
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>Get In Touch</div>
          <h1>We&apos;re real people<br />with a real number</h1>
          <p>No chatbots, no ticket queues. Text us, call us, or fill out the form.</p>
        </div>
        <a href={INSTAGRAM_PLACEHOLDER_URL} target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-contact"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Archie · @archie_bklyn</a>
      </div>

      <section id="contact-form-section" className="section">
        <div className="container">
          <div className="grid-2" style={{ gap: '56px', alignItems: 'flex-start' }}>
            <ContactInfoCard />
            <div id="contact-form-column">
              <div className="label">Send a Message</div>
              <h3 style={{ marginBottom: '24px' }}>Tell us about your dog</h3>
              <div id="contact-form-wrap-shell" className="booking-form-wrap">
                <div className="booking-form">
                  <div id="contact-form-body" className="booking-form-body">
                    <MeetGreetForm paneId="contact-tab-meetgreet" source="contact" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
