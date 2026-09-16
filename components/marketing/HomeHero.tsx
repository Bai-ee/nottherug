'use client';

import { useRef } from 'react';
import { useHomeHeroMotion } from './hooks/useHomeHeroMotion';
import TrackedCtaLink from './TrackedCtaLink';

export default function HomeHero() {
  const heroRef = useRef<HTMLElement | null>(null);
  useHomeHeroMotion(heroRef);

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero-visual" id="hero-visual-video-shell">
        <figure className="polaroid polaroid-tilt-right taped taped-center" id="hero-polaroid-frame">
          <div className="polaroid-window" id="hero-polaroid-window">
            <video id="hero-bg-video" autoPlay muted loop playsInline preload="auto">
              <source src="/logos/Not_The_Rug_2023_clipped_web.webm" type="video/webm" />
              <source src="/logos/Not_The_Rug_2023_clipped_web.mp4" type="video/mp4" />
            </video>
          </div>
          <figcaption className="polaroid-caption" id="hero-polaroid-caption"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> McCarren Park, Williamsburg</figcaption>
          <img className="polaroid-badge" id="hero-polaroid-badge" src="/logos/notRugGreen.png" alt="Not The Rug NYC dog walking badge" width={1080} height={1080} />
        </figure>
      </div>
      <div className="hero-content" id="hero-content-shell">
        <div className="hero-eyebrow" id="hero-eyebrow-stamp-row">
          <span className="stamp-label" id="hero-stamp-label">Williamsburg, Brooklyn &middot; Est. 2011</span>
        </div>
        <h1 className="hero-h1">Your dog deserves<br /><em>someone they know.</em></h1>
        <p className="hero-p">Not The Rug is Williamsburg&apos;s most trusted dog walking service. No strangers. No first-time handlers. Just experienced professionals who show up consistently. Because peace of mind starts with knowing exactly who&apos;s holding the leash.</p>
        <div className="hero-actions" id="hero-actions-row">
          <TrackedCtaLink
            href="/book"
            className="btn btn-primary"
            id="hero-cta-primary"
            cta="hero_book"
            page="home"
          >
            Book Luis, for a Meet &amp; Greet
          </TrackedCtaLink>
          <TrackedCtaLink
            href="/services"
            className="btn btn-ghost"
            id="hero-cta-secondary"
            cta="hero_view_services"
            page="home"
          >
            View Services
          </TrackedCtaLink>
        </div>
      </div>
      <div className="hero-stats" id="hero-stats-strip">
        <a className="hero-stat-item hero-stat-link" data-variant="star" href="https://www.yelp.com/biz/not-the-rug-brooklyn-8" target="_blank" rel="noopener">
          <div className="hero-stat-num">5★</div>
          <div className="hero-stat-label">Yelp<br />rating</div>
        </a>
        <div className="hero-stat-divider" aria-hidden="true"></div>
        <a className="hero-stat-item hero-stat-link" data-variant="star" href="https://share.google/xbrJjkZt4eoHUOxBl" target="_blank" rel="noopener">
          <div className="hero-stat-num">5★</div>
          <div className="hero-stat-label">Google<br />rating</div>
        </a>
        <div className="hero-stat-divider" aria-hidden="true"></div>
        <a className="hero-stat-item hero-stat-link" href="https://share.google/xbrJjkZt4eoHUOxBl" target="_blank" rel="noopener">
          <div className="hero-stat-num">79</div>
          <div className="hero-stat-label">Verified<br />reviews</div>
        </a>
        <div className="hero-stat-divider" aria-hidden="true"></div>
        <div className="hero-stat-item">
          <div className="hero-stat-num">15+</div>
          <div className="hero-stat-label">Years in<br />Williamsburg</div>
        </div>
      </div>
    </section>
  );
}
