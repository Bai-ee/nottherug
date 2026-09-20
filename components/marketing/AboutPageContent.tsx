'use client';

import { useRef } from 'react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from './SiteFooter';
import TeamGrid from './TeamGrid';
import ValuesGrid from './ValuesGrid';
import { useSectionReveals } from './hooks/useSectionReveals';
import { INSTAGRAM_PLACEHOLDER_URL } from '@/lib/content/site';
import { ABOUT_STATS, FOUNDER_PHOTO, FOUNDER_STORY, PRINCIPLES_INTRO } from '@/lib/content/about';

export default function AboutPageContent() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useSectionReveals(pageRef);

  return (
    <div id="about-page-shell" ref={pageRef}>
      <SiteNav />

      <div id="about-hero-section" className="page-hero page-hero-about">
        <div className="container">
          <div className="label" style={{ color: 'var(--sage-light)' }}>Our Story</div>
          <h1>15 years of walks,<br />one neighborhood</h1>
          <p>Not The Rug was born in Williamsburg and has never left. Here&apos;s why that matters.</p>
        </div>
        <a href={INSTAGRAM_PLACEHOLDER_URL} target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-about"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Scout · @scout_bklyn</a>
      </div>

      <section id="about-story-section" className="section">
        <div className="container">
          <div className="grid-2" style={{ gap: '72px' }}>
            <div>
              <div className="label">Founded 2011</div>
              <h2>A neighborhood service, not a platform</h2>
              <div className="divider"></div>
              {FOUNDER_STORY.map((paragraph, i) => (
                <p
                  key={paragraph.slice(0, 32)}
                  style={{ color: 'var(--mid-gray)', fontSize: '16px', lineHeight: '1.8', marginBottom: i === FOUNDER_STORY.length - 1 ? 0 : '20px' }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <div>
              <div style={{ aspectRatio: '4/5', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '20px' }}>
                <div id="about-founder-image" style={{ height: '100%', backgroundImage: `url('${FOUNDER_PHOTO}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
              </div>
              <div className="grid-2" style={{ gap: '12px' }}>
                {ABOUT_STATS.map((stat) => (
                  <div key={stat.value} style={{ background: 'var(--cream)', border: '1px solid var(--light-gray)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: 'var(--sage-dark)' }}>{stat.value}</div>
                    <div style={{ fontSize: '13px', color: 'var(--mid-gray)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about-team-section" className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="label">The Team</div>
            <h2>Meet your dog&apos;s people</h2>
            <div className="divider divider-center"></div>
          </div>
          <TeamGrid />
        </div>
      </section>

      <section id="about-principles-section" className="section bg-warm">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="label">How We Work</div>
            <h2>The principles behind every walk</h2>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--mid-gray)', maxWidth: '620px', margin: '0 auto 48px', fontSize: '16px', lineHeight: '1.8' }}>{PRINCIPLES_INTRO}</p>
          <ValuesGrid />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
