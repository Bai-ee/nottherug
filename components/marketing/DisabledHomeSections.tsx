'use client';

// Home page sections that are gated off at their call site in
// app/(marketing)/page.tsx with `{false && <X />}` — same disabled state as
// the source app/page.tsx before extraction. docs/copy/README.md documents
// that the copy tool deliberately excludes `{false && ...}` content, and that
// must stay true here. Do not re-enable without an explicit product decision
// (plans/002-production-readiness.md P2A: "do not re-enable the currently
// disabled card carousel").
//
// Each export below is a normal component — the `false &&` gate lives at the
// call site, not in here, so re-enabling one later is a one-line flip.

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AnimatedServiceCards from '@/components/AnimatedServiceCards';
import NeighborhoodCard from './NeighborhoodCard';

export function PersonalizedCareCarousel() {
  return (
    <div id="home-personalized-care-pin-stage">
      <div id="home-personalized-care-scroll-window">
        <AnimatedServiceCards />
      </div>
    </div>
  );
}

export function OtherServicesTeaser() {
  const router = useRouter();
  return (
    <section className="section bg-warm" id="home-other-services-section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label">More Ways We Help</div>
          <h2>Additional services &amp; care</h2>
          <div className="divider divider-center"></div>
        </div>
        <div className="grid-3" id="home-other-services-grid" style={{ gap: '32px' }}>
          <div className="service-card" onClick={() => router.push('/#home-personalized-care-section')}>
            <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-senior.svg" alt="" loading="lazy" /></div>
            <h3>Senior Dog Visits</h3>
            <p>Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs. We move at their pace, with patience, comfort, and plenty of care.</p>
            <div className="svc-price">$35<span>/visit</span></div>
            <div className="price-tax-note" style={{ fontSize: '12px', color: 'var(--mid-gray)', fontWeight: 400, marginTop: '2px' }}>+ sales tax</div>
          </div>
          <div className="service-card" onClick={() => router.push('/#home-personalized-care-section')}>
            <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-boarding.svg" alt="" loading="lazy" /></div>
            <h3>Boarding &amp; Overnight Sitting</h3>
            <p>Loving overnight care in your dog&apos;s own home, where they can stick to their routine and sleep in familiar surroundings while you&apos;re away.</p>
            <div className="svc-price">$100<span>/night</span></div>
            <div className="price-tax-note" style={{ fontSize: '12px', color: 'var(--mid-gray)', fontWeight: 400, marginTop: '2px' }}>+ sales tax</div>
            <div className="svc-badge">7+ day discounts</div>
          </div>
          <div className="service-card" onClick={() => router.push('/#home-personalized-care-section')}>
            <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-cat.svg" alt="" loading="lazy" /></div>
            <h3>Cat Visits</h3>
            <p>Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We&apos;ll also water plants, bring in the mail, and keep an eye on your home while you&apos;re away.</p>
            <div className="svc-price">$35<span>/visit</span></div>
            <div className="price-tax-note" style={{ fontSize: '12px', color: 'var(--mid-gray)', fontWeight: 400, marginTop: '2px' }}>+ sales tax</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link href="/#home-personalized-care-section" className="btn btn-outline">See All Services &amp; Rates</Link>
        </div>
      </div>
    </section>
  );
}

export function WeekdayBenefits() {
  const benefits = [
    'Early morning and evening visits',
    'Weekend walks',
    'Last-minute requests',
    'Longer visits when timing, weather, and your dog allow',
  ];
  return (
    <section className="section bg-warm" id="home-weekday-benefits-section">
      <div className="container">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="label label-tape" id="regular-clients-label-tape">For Regular Clients</div>
          <h2>Exclusive benefits for weekday walking clients</h2>
          <div className="divider"></div>
          <p style={{ color: 'var(--mid-gray)', fontSize: '16px', lineHeight: '1.8', marginBottom: '32px' }}>Our regular weekday clients receive priority access to services that are not available to the public.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {benefits.map((benefit) => (
              <div key={benefit} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'white', borderRadius: 'var(--radius)', padding: '18px 20px', border: '1px solid var(--light-gray)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px', color: 'var(--sage-dark)' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={{ fontSize: '15px', color: 'var(--charcoal)' }}>{benefit}</span>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--mid-gray)', fontSize: '15px', lineHeight: '1.7' }}>These services are reserved for families in our regular weekday walking program, helping us provide the consistent, dependable care we&apos;re known for.</p>
        </div>
      </div>
    </section>
  );
}

const VISIT_INCLUDES: Array<{ title: string; desc: string }> = [
  { title: 'Professionally Trained Team', desc: 'Every team member is trained in dog body language, safety, and positive reinforcement. We make it look easy because experience, patience, and consistency matter.' },
  { title: 'GPS Tracking', desc: "Follow your dog's adventure with GPS tracking and receive a personalized visit summary after every outing." },
  { title: 'Photo & Visit Report', desc: "Receive photos, potty updates, and notes about your dog's walk, mood, and adventure." },
  { title: 'Safety-First Equipment', desc: 'Every dog is walked using our secure leash belt, collar, and harness system for added safety and peace of mind.' },
  { title: 'Healthy Treats', desc: 'Every visit includes a high-value, grain- and chicken-free treat, or your own treats if you prefer.' },
  { title: 'Clean Paws & Fresh Water', desc: 'We wipe paws with unscented wipes, refresh water bowls, and help keep your home clean.' },
  { title: 'Meals & Medication', desc: "Need us to feed your dog or administer medication? We're happy to help at no additional charge." },
  { title: 'Temperature & Packages', desc: "We'll bring in packages, check your home's temperature, and adjust blinds, shades, or the AC to help keep your pup comfortable." },
  { title: 'Direct Communication', desc: 'Need us? Reach your walker or the owner directly. No bots. No call centers. Just real people who know your dog.' },
];

export function VisitIncludes() {
  return (
    <section className="section bg-warm" id="home-visit-includes-section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label">Standard of Care</div>
          <h2>Every visit includes</h2>
          <div className="divider divider-center"></div>
        </div>
        <div className="grid-3" id="standard-of-care-grid" style={{ gap: '28px' }}>
          {VISIT_INCLUDES.map((item) => (
            <div key={item.title} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '32px 28px', border: '1px solid var(--light-gray)' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '10px' }}>{item.title}</h4>
              <p style={{ fontSize: '14px', color: 'var(--mid-gray)', lineHeight: '1.7', marginBottom: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FounderPullQuote() {
  return (
    <section id="founder-quote-section">
      <div className="container">
        <blockquote id="founder-quote-block">
          <div id="founder-quote-mark" aria-hidden="true">&ldquo;</div>
          <p id="founder-quote-text">We share the same love for our clients&apos; dogs as they do. We understand the bond between a family and their pet — and our goal is simple: provide an intimate, positive experience for you and your loved one.</p>
          <footer id="founder-quote-attribution">
            <span id="founder-quote-rule" aria-hidden="true"></span>
            <cite id="founder-quote-cite">Luis Baro, Founder</cite>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}

export function NeighborhoodTeaser() {
  return (
    <section className="section bg-warm">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="label">Service Areas</div>
          <h2>We know Williamsburg street by street</h2>
          <p style={{ color: 'var(--mid-gray)', maxWidth: '440px', margin: '16px auto 0', fontSize: '16px' }}>Fifteen years of daily walks in one neighborhood. This is the block we know best.</p>
        </div>
        <div className="hood-cards-grid">
          <NeighborhoodCard
            id="home-williamsburg-hood-card"
            href="/neighborhoods/williamsburg"
            name="Williamsburg"
            desc="Our home neighborhood since 2011"
          />
        </div>
      </div>
    </section>
  );
}
