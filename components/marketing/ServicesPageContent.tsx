'use client';

import { useRef } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import MeetGreetForm from '@/components/MeetGreetForm';
import SiteFooter from './SiteFooter';
import ServiceGrid from './ServiceGrid';
import TrackedCtaAnchor from './TrackedCtaAnchor';
import { useSectionReveals } from './hooks/useSectionReveals';
import { PHONE_DISPLAY, PHONE_HREF, EMAIL_DISPLAY, EMAIL_HREF } from '@/lib/content/contact';
import { INSTAGRAM_PLACEHOLDER_URL } from '@/lib/content/site';

const ALWAYS_INCLUDED: Array<{ title: string; desc: string; icon: React.ReactNode }> = [
  {
    title: 'GPS Tracking',
    desc: 'Live route map sent after every walk so you see exactly where they went.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  {
    title: 'Photo Report',
    desc: 'Post-walk update with photos, mood notes, and any observations.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  },
  {
    title: 'Double-Leash Safety',
    desc: 'Our signature dual collar-and-harness method on every walk.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  },
  {
    title: 'Direct Communication',
    desc: 'Text or call your walker directly — no support tickets, no bots.',
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
];

export default function ServicesPageContent() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useSectionReveals(pageRef);

  return (
    <div id="services-page-shell" ref={pageRef}>
      <SiteNav />

      <div className="page-hero" style={{ background: "linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('/dogs/IMAGE 00001.webp') center 20%/cover no-repeat" }}>
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>Services &amp; Rates</div>
          <h1>Transparent pricing,<br />no surprises</h1>
          <p>Every service includes a free consultation, GPS tracking, and post-walk photo updates.</p>
        </div>
        <a href={INSTAGRAM_PLACEHOLDER_URL} target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-services"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Biscuit · @biscuit_bklyn</a>
      </div>

      <section className="section">
        <div className="container">
          <ServiceGrid />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="label">Always Included</div>
            <h2>Every walk, every time</h2>
          </div>
          <div className="grid-4">
            {ALWAYS_INCLUDED.map((item) => (
              <div key={item.title} style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ marginBottom: '14px' }}>{item.icon}</div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '8px' }}>{item.title}</h4>
                <p style={{ fontSize: '14px', color: 'var(--mid-gray)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} id="services-signup-section">
        <div className="container">
          <div className="booking-form-wrap">
            <div className="booking-form">
              <div className="booking-form-body">
                <MeetGreetForm paneId="svc-tab-meetgreet" source="services" />
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--mid-gray)', fontSize: '14px', marginTop: '20px' }}>
            Already a client, or have a quick question first? Call or text{' '}
            <TrackedCtaAnchor href={PHONE_HREF} id="services-phone-link" cta="services_phone" page="services">{PHONE_DISPLAY}</TrackedCtaAnchor>, email{' '}
            <TrackedCtaAnchor href={EMAIL_HREF} id="services-email-link" cta="services_email" page="services">{EMAIL_DISPLAY}</TrackedCtaAnchor>, or <Link href="/contact">visit our contact page</Link>.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
