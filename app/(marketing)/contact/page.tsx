import type { Metadata } from 'next';
import MeetGreetForm from '@/components/MeetGreetForm';
import SiteNav from '@/components/SiteNav';
import ContactInfoCard from '@/components/marketing/ContactInfoCard';
import { buildPageMetadata } from '@/lib/content/site';

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
