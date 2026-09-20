'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useHomeHeroMotion } from './hooks/useHomeHeroMotion';
import { openWelcomeWalkModal } from '@/lib/marketing/welcome-modal';
import TrackedCtaAnchor from './TrackedCtaAnchor';
import TrackedCtaLink from './TrackedCtaLink';

/**
 * Pauses/resumes the muted decorative hero clip based on viewport visibility
 * and `prefers-reduced-motion`. The clip only ever plays once it is at least
 * partially on screen and motion is allowed; otherwise it sits on its poster
 * frame. Scoped to this component only — see patches/03-hero-video-markup for
 * why this can't live in the shared `useHomeHeroMotion` hook.
 */
function useHeroVideoLifecycle(videoRef: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isIntersecting = false;

    const syncPlayback = () => {
      if (reduceMotionQuery.matches) {
        video.pause();
        return;
      }
      if (isIntersecting) {
        video.play().catch(() => {
          // Autoplay can be rejected before user interaction on some
          // browsers; the poster frame stays visible until it succeeds.
        });
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries.some((entry) => entry.isIntersecting);
        syncPlayback();
      },
      { threshold: 0.1 },
    );
    observer.observe(video);

    reduceMotionQuery.addEventListener('change', syncPlayback);

    return () => {
      observer.disconnect();
      reduceMotionQuery.removeEventListener('change', syncPlayback);
    };
  }, [videoRef]);
}

export default function HomeHero() {
  const heroRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useHomeHeroMotion(heroRef);
  useHeroVideoLifecycle(videoRef);

  function scrollToServices(e: React.MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById('home-personalized-care-section');
    if (!target) return; // no section on this page — let the anchor do its thing
    e.preventDefault();
    target.scrollIntoView({
      // globals.css deliberately omits `scroll-behavior: smooth`, so callers
      // opt in; honour the reduced-motion preference here.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function openContactModal(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let a cmd/ctrl/shift-click open /contact in a new tab instead.
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openWelcomeWalkModal();
  }

  return (
    <section className="hero" id="home-hero-section" ref={heroRef}>
      <div className="hero-visual" id="hero-visual-video-shell">
        <figure className="polaroid polaroid-tilt-right taped taped-center" id="hero-polaroid-frame">
          <div className="polaroid-window" id="hero-polaroid-window">
            <video
              id="hero-bg-video"
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/video/hero-mccarren-poster.webp"
            >
              <source src="/video/hero-mccarren-1080.webm" type="video/webm" />
              <source src="/video/hero-mccarren-1080.mp4" type="video/mp4" />
            </video>
          </div>
          <figcaption className="polaroid-caption" id="hero-polaroid-caption"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> McCarren Park, Williamsburg</figcaption>
          {/* Rendered box is .polaroid-badge / #hero-polaroid-badge in
              globals.css: 80-144px on mobile/tablet, clamp(224px,18vw,288px)
              on desktop. next/image needs the source's real intrinsic size
              (1080x1080) and resizes/re-encodes down to those boxes at
              request time; CSS keeps sizing the rendered box. */}
          <Image
            className="polaroid-badge"
            id="hero-polaroid-badge"
            src="/logos/notRugGreen.png"
            alt="Not The Rug NYC dog walking badge"
            width={1080}
            height={1080}
            sizes="(max-width: 1100px) 144px, 288px"
          />
        </figure>
      </div>
      <div className="hero-content" id="hero-content-shell">
        <div className="hero-eyebrow" id="hero-eyebrow-stamp-row">
          <span className="stamp-label" id="hero-stamp-label">Williamsburg, Brooklyn &middot; Est. 2011</span>
        </div>
        <h1 className="hero-h1" id="hero-headline">
          {/* Four hard-broken lines, kept at the top level of the h1: the
              hero word-split in useHomeHeroMotion only re-emits <br>s that are
              direct children, so a <br> nested inside <em> would be dropped
              once the entrance animation rebuilds the markup. The spaces
              before each <br> matter: phones hide the 1st and 3rd break
              (globals.css) to set the same headline on two centred lines. */}
          Your dog <br />deserves <br /><em>someone they</em> <br /><em>know.</em>
        </h1>
        <p className="hero-p">Not The Rug is Williamsburg&apos;s most trusted dog walking service. No strangers. No first-time handlers. Just experienced professionals who show up consistently.</p>
        {/* Desktop shows View Services (button) + Contact Luis (text link);
            phones show Contact Luis (button) + View services (text link).
            Both pairs are in the markup and globals.css shows one pair per
            breakpoint, so each analytics id has exactly one visible control
            at any width. Handlers are shared above. */}
        <div className="hero-actions" id="hero-actions-row">
          {/* Primary action keeps the reader on the page: it scrolls down to
              the services rundown. The href is the real anchor so it still
              works before hydration and with JS off. */}
          <TrackedCtaAnchor
            href="#home-personalized-care-section"
            className="btn btn-primary btn-accent hero-desktop-copy"
            id="hero-cta-primary"
            cta="hero_view_services"
            onClick={scrollToServices}
          >
            View Services
          </TrackedCtaAnchor>
          {/* Opens the welcome modal (group walk offer + intake). The href
              stays a real link so the button still works before hydration and
              with JS off — /contact carries the same meet & greet form. */}
          <TrackedCtaLink
            href="/contact"
            className="btn btn-ghost hero-desktop-copy"
            id="hero-cta-secondary"
            cta="hero_contact"
            onClick={openContactModal}
          >
            Contact Luis
          </TrackedCtaLink>
          <TrackedCtaLink
            href="/contact"
            className="btn btn-primary btn-accent hero-phone-copy"
            id="hero-cta-phone-contact"
            cta="hero_contact"
            onClick={openContactModal}
          >
            Contact Luis, to set up a walk
          </TrackedCtaLink>
          <TrackedCtaAnchor
            href="#home-personalized-care-section"
            className="btn btn-ghost hero-phone-copy"
            id="hero-cta-phone-services"
            cta="hero_view_services"
            onClick={scrollToServices}
          >
            View services
          </TrackedCtaAnchor>
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
