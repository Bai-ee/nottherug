'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    (async () => {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.gsap || gsapModule.default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      gsap.defaults({ ease: 'power3.out', duration: 0.8 });

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        gsap.set('.hero-eyebrow, .hero-p, .hero-actions, .hero-stats', { autoAlpha: 0, y: 30 });
      }

      function splitIntoWords(el: HTMLElement) {
        const nodes = Array.from(el.childNodes);
        el.innerHTML = '';
        nodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            (node as Text).textContent!.split(/(\s+)/).forEach(word => {
              if (!word.trim()) { el.appendChild(document.createTextNode(word)); return; }
              const wrap = document.createElement('span');
              wrap.className = 'word-wrap';
              const inner = document.createElement('span');
              inner.className = 'word-inner';
              inner.textContent = word;
              wrap.appendChild(inner);
              el.appendChild(wrap);
            });
          } else if ((node as Element).nodeName === 'BR') {
            el.appendChild(document.createElement('br'));
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            (node as Element).textContent!.split(/(\s+)/).forEach(word => {
              if (!word.trim()) { el.appendChild(document.createTextNode(word)); return; }
              const wrap = document.createElement('span');
              wrap.className = 'word-wrap';
              const inner = document.createElement('span');
              inner.className = 'word-inner';
              const clone = (node as Element).cloneNode(false) as Element;
              clone.textContent = word;
              inner.appendChild(clone);
              wrap.appendChild(inner);
              el.appendChild(wrap);
            });
          }
        });
        return el.querySelectorAll('.word-inner');
      }

      if (!prefersReducedMotion) {
        const heroH1 = document.querySelector('.hero-h1') as HTMLElement | null;
        if (heroH1) {
          splitIntoWords(heroH1);
          gsap.set('.hero-h1 .word-inner', { y: '110%' });
        }
        gsap.set('.hero-visual', { clipPath: 'inset(0 100% 0 0)' });
      }

      function initHeroEntrance() {
        if (prefersReducedMotion) return;
        const words = document.querySelectorAll('.hero-h1 .word-inner');
        if (!words.length) return;

        gsap.set(words, { y: '110%' });
        gsap.set('.hero-eyebrow, .hero-p, .hero-actions, .hero-stats', { autoAlpha: 0, y: 30 });
        gsap.set('.hero-visual', { clipPath: 'inset(0 100% 0 0)' });

        const tl = gsap.timeline({ delay: 0.12, defaults: { ease: 'power4.out' } });
        tl
          .to('.hero-visual', { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power4.inOut' }, 0)
          .to('.hero-stats',  { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.45')
          .to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' }, '-=0.4')
          .to(words,          { y: '0%', duration: 0.88, stagger: 0.065 }, '-=0.35')
          .to('.hero-p',      { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.65')
          .to('.hero-actions',{ autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.5');
      }

      function initHeroParallax() {
        if (prefersReducedMotion) return;
        const heroImg = document.querySelector('#hero-bg-video') || document.querySelector('.hero-visual .hero-img');
        if (!heroImg) return;
        gsap.to(heroImg, {
          yPercent: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1.8
          }
        });
      }

      const statTargets  = [5, 5, 79, 15];
      const statSuffixes = ['★', '★', '', '+'];
      let statsAnimated  = false;

      function initStatCounters() {
        if (prefersReducedMotion) return;
        const statEls = document.querySelectorAll('.hero-stat-num');
        if (!statEls.length) return;

        statsAnimated = false;

        ScrollTrigger.create({
          trigger: '.hero-stats',
          start: 'top 90%',
          once: true,
          onEnter: () => {
            if (statsAnimated) return;
            statsAnimated = true;

            statEls.forEach((el, i) => {
              const obj = { val: 0 };
              gsap.to(obj, {
                val: statTargets[i],
                duration: 1.9,
                delay: 0.6 + i * 0.07,
                ease: 'power2.out',
                onUpdate() { el.textContent = Math.round(obj.val) + statSuffixes[i]; }
              });
            });
          }
        });
      }

      function initNavScroll() {
        ScrollTrigger.create({
          trigger: document.body,
          start: 'top+=60 top',
          onEnter:     () => gsap.to('#main-nav', { boxShadow: '0 2px 32px rgba(0,0,0,0.09)', duration: 0.3 }),
          onLeaveBack: () => gsap.to('#main-nav', { boxShadow: '0 0 0 rgba(0,0,0,0)',          duration: 0.3 })
        });
      }

      const revealedEls = new WeakSet<Element>();

      function initSectionReveals(pageEl: HTMLElement) {
        if (prefersReducedMotion || !pageEl) return;

        const cardSel = [
          '.service-card', '.hiw-step', '.review-card', '.hood-card',
          '.trust-card', '.pricing-card', '.team-card', '.value-cell',
          '.process-step', '.cta-band', '.contact-card', '.package-tier',
          '.booking-form', '.phase-callout'
        ].join(',');

        const headingSel = [
          '.section h2', '.section h3', '.section .label',
          '.page-hero h1', '.page-hero p', '.book-hero h1', '.book-hero p'
        ].join(',');

        const cards    = Array.from(pageEl.querySelectorAll(cardSel)).filter(el => !revealedEls.has(el));
        const headings = Array.from(pageEl.querySelectorAll(headingSel)).filter(el => !revealedEls.has(el));

        if (headings.length) {
          gsap.set(headings, { autoAlpha: 0, y: 26 });
          ScrollTrigger.batch(headings, {
            onEnter: batch => {
              batch.forEach((el: Element) => revealedEls.add(el));
              gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
            },
            start: 'top 90%',
            once: true
          });
        }

        if (cards.length) {
          gsap.set(cards, { autoAlpha: 0, y: 52 });
          ScrollTrigger.batch(cards, {
            onEnter: batch => {
              batch.forEach((el: Element) => revealedEls.add(el));
              gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.085, ease: 'power3.out' });
            },
            start: 'top 88%',
            once: true
          });
        }
      }

      function pageTransitionIn(pageEl: HTMLElement) {
        if (prefersReducedMotion) return;
        gsap.fromTo(pageEl,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out' }
        );
      }

      const pages = ['home','services','how-it-works','about','safety','neighborhoods','reviews','book','contact'];

      function showPage(pageId: string) {
        pages.forEach(p => {
          const el = document.getElementById('page-' + p);
          if (el) el.classList.remove('active');
        });

        const target = document.getElementById('page-' + pageId);
        if (target) {
          target.classList.add('active');
          window.scrollTo(0, 0);

          ScrollTrigger.getAll().forEach(t => t.kill());

          pageTransitionIn(target);
          initNavScroll();

          if (pageId === 'home') {
            initHeroEntrance();
            initHeroParallax();
            initStatCounters();
            setTimeout(() => initSectionReveals(target), 420);
          } else {
            initSectionReveals(target);
            setTimeout(() => ScrollTrigger.refresh(), 420);
          }
        }

        document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
          (a as HTMLElement).classList.toggle('active', (a as HTMLElement).dataset.page === pageId);
        });
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) mobileMenu.style.display = 'none';
        return false;
      }

      const hoodData: Record<string, { name: string; color: string; tagline: string; desc: string; parks: string[]; seo: string }> = {
        williamsburg: {
          name: 'Williamsburg',
          color: '#7D9E8C',
          tagline: 'Our home neighborhood since 2011',
          desc: 'Williamsburg is where Not The Rug was born, and it remains the heart of our operation. We know every building, every doorman, every park bench, and every dog on every block. When it comes to Williamsburg dog walking, nobody knows these streets better.',
          parks: ['McCarren Park', 'East River State Park', 'Domino Park', 'N 5th St Dog Run', 'Marcy Park'],
          seo: 'Dog walker Williamsburg Brooklyn'
        },
        greenpoint: {
          name: 'Greenpoint',
          color: '#9DB89A',
          tagline: 'McGolrick Park specialists',
          desc: "From McGolrick Park in the morning to the Greenpoint waterfront in the afternoon, our walkers know the best routes through this neighborhood's quiet tree-lined streets. A calm, residential neighborhood that's perfect for dogs who love exploring.",
          parks: ['McGolrick Park', 'Monsignor McGolrick Park', 'Greenpoint Waterfront', 'Transmitter Park', 'India St Pier'],
          seo: 'Dog walker Greenpoint Brooklyn'
        },
        bushwick: {
          name: 'Bushwick',
          color: '#C4A888',
          tagline: 'Maria Hernandez Park routes',
          desc: "Bushwick's blend of industrial streets and leafy residential blocks makes for fascinating walks. Maria Hernandez Park is our anchor, with multiple routes through the surrounding neighborhood suited to every temperament.",
          parks: ['Maria Hernandez Park', 'Bushwick Inlet Park', 'Halsey Street Plaza', 'Irving Square Park'],
          seo: 'Dog walker Bushwick Brooklyn'
        },
        bedstuy: {
          name: 'Bed-Stuy',
          color: '#A888C4',
          tagline: 'Herbert Von King Park walks',
          desc: "Beautiful brownstones, wide sidewalks, and some of Brooklyn's finest parks make Bed-Stuy a pleasure to walk in. Herbert Von King Park is a particular favorite for its off-leash hours and well-maintained grounds.",
          parks: ['Herbert Von King Park', 'Marcus Garvey Park', 'Stuyvesant Heights Park', 'Tompkins Park'],
          seo: 'Dog walker Bed-Stuy Brooklyn'
        },
        'park-slope': {
          name: 'Park Slope',
          color: '#88A8C4',
          tagline: 'Prospect Park dog runs',
          desc: "If you live in Park Slope with a dog, you already know you hit the lottery. Prospect Park's off-leash hours, the Long Meadow, and the dedicated dog beach make this neighborhood one of the best in the city for dogs.",
          parks: ['Prospect Park', 'Long Meadow Dog Run', 'Prospect Park Lake', 'Bartel-Pritchard Square'],
          seo: 'Dog walker Park Slope Brooklyn'
        },
        'east-williamsburg': {
          name: 'East Williamsburg',
          color: '#C4C488',
          tagline: 'Expanding coverage area',
          desc: "We've recently expanded to East Williamsburg to serve the growing community east of the BQE. Our walkers are building deep knowledge of this neighborhood's parks and best walking routes.",
          parks: ['Bushwick Inlet Park', 'Flushing Ave Greenway', 'Cooper Park'],
          seo: 'Dog walker East Williamsburg Brooklyn'
        }
      };

      function showNeighborhood(hoodId: string) {
        showPage('neighborhoods');
        const data = hoodData[hoodId];
        if (!data) return;

        const detail = document.getElementById('hood-detail');
        const content = document.getElementById('hood-content');
        if (!detail || !content) return;
        detail.style.display = 'block';

        content.innerHTML = `
          <div style="background:${data.color}22; border:1px solid ${data.color}44; border-radius:var(--radius-lg); padding:48px; margin-bottom:40px">
            <div class="label">${data.seo}</div>
            <h2>Dog Walking in<br><span style="color:${data.color}; font-style:italic; font-family:var(--font-italic)">${data.name}</span></h2>
            <div class="divider"></div>
            <p style="color:var(--mid-gray); font-size:16px; line-height:1.8; max-width:620px; margin-bottom:28px">${data.desc}</p>
            <div>
              <div style="font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--mid-gray); margin-bottom:12px">Parks We Walk</div>
              <div class="hood-parks">
                ${data.parks.map(p => `<span class="park-tag" style="background:${data.color}33; border-color:${data.color}66; color:var(--charcoal)">${p}</span>`).join('')}
              </div>
            </div>
            <div style="margin-top:32px; display:flex; gap:14px; flex-wrap:wrap;">
              <button class="btn btn-primary" onclick="showPage('book')">Book a Walk in ${data.name}</button>
              <button class="btn btn-outline" onclick="showPage('contact')">Ask About ${data.name} Coverage</button>
            </div>
          </div>
          <div class="grid-3" style="gap:24px">
            <div class="card card-pad">
              <div style="margin-bottom:12px"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
              <h4 style="font-family:var(--font-display); font-size:18px; margin-bottom:8px">Your Assigned Walker</h4>
              <p style="font-size:14px; color:var(--mid-gray)">We match you with a walker who lives or regularly works in ${data.name} — they know the neighborhood the way you know your apartment.</p>
            </div>
            <div class="card card-pad">
              <div style="margin-bottom:12px"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></div>
              <h4 style="font-family:var(--font-display); font-size:18px; margin-bottom:8px">Local Park Routes</h4>
              <p style="font-size:14px; color:var(--mid-gray)">Our walkers have season-calibrated routes for ${data.name} — shaded summer paths, dry winter routes, and parks with good off-leash hours.</p>
            </div>
            <div class="card card-pad">
              <div style="margin-bottom:12px"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
              <h4 style="font-family:var(--font-display); font-size:18px; margin-bottom:8px">Fast Availability</h4>
              <p style="font-size:14px; color:var(--mid-gray)">We typically have walker availability in ${data.name} within 1–2 weeks of inquiry. Contact us to check current capacity.</p>
            </div>
          </div>
        `;

        setTimeout(() => {
          detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }

      function toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        if (!menu) return;
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      }

      function switchBookTab(el: HTMLElement, tabId: string) {
        const form = el.closest('.booking-form');
        if (!form) return;
        form.querySelectorAll('.booking-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        form.querySelectorAll('.booking-form-body > [id]').forEach(pane => {
          (pane as HTMLElement).style.display = (pane as HTMLElement).id === tabId ? 'block' : 'none';
        });
      }

      document.querySelectorAll('details').forEach(det => {
        det.addEventListener('toggle', () => {
          const span = det.querySelector('summary span');
          if (span) span.textContent = det.open ? '−' : '+';
        });
      });

      (window as any).showPage = showPage;
      (window as any).showNeighborhood = showNeighborhood;
      (window as any).toggleMobileMenu = toggleMobileMenu;
      (window as any).switchBookTab = switchBookTab;

      showPage('home');
    })();
  }, []);

  return (
    <>
      {/* NAVIGATION */}
      <nav id="main-nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => (window as any).showPage('home')}>
            <img id="nav-logo-img" src="logos/ntr_offwhite_horiz.png" alt="Not The Rug" />
          </div>
          <div className="nav-links">
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }} data-page="services">Services &amp; Rates</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('how-it-works'); }} data-page="how-it-works">How It Works</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('about'); }} data-page="about">About Us</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('safety'); }} data-page="safety">Safety &amp; Trust</a>
            <div className="nav-dropdown">
              <a href="#" onClick={(e) => e.preventDefault()} data-page="neighborhoods">Neighborhoods ▾</a>
              <div className="dropdown-menu">
                <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('williamsburg'); }}>Williamsburg</a>
                <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('greenpoint'); }}>Greenpoint</a>
                <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('bushwick'); }}>Bushwick</a>
                <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('bedstuy'); }}>Bed-Stuy</a>
                <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('park-slope'); }}>Park Slope</a>
                <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('neighborhoods'); }}>All Neighborhoods →</a>
              </div>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('reviews'); }} data-page="reviews">Reviews</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('book'); }} className="nav-cta" data-page="book">Book a Walk</a>
            <a href="/admin" id="nav-admin-login-link" style={{fontSize:'13px', opacity:0.5}}>Login</a>
          </div>
          <div className="nav-hamburger" onClick={() => (window as any).toggleMobileMenu()}>
            <span></span><span></span><span></span>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className="mobile-menu" id="mobile-menu">
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); (window as any).toggleMobileMenu(); }}>Services &amp; Rates</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('how-it-works'); (window as any).toggleMobileMenu(); }}>How It Works</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('about'); (window as any).toggleMobileMenu(); }}>About Us</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('safety'); (window as any).toggleMobileMenu(); }}>Safety &amp; Trust</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('neighborhoods'); (window as any).toggleMobileMenu(); }}>Neighborhoods</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('reviews'); (window as any).toggleMobileMenu(); }}>Reviews</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('contact'); (window as any).toggleMobileMenu(); }}>Contact</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('book'); (window as any).toggleMobileMenu(); }} className="mobile-cta">Book a Walk</a>
      </div>

      {/* PAGE: HOME */}
      <div id="page-home" className="page active">

        {/* Hero */}
        <section className="hero">
          <div className="hero-visual" id="hero-visual-video-shell">
            <video id="hero-bg-video" autoPlay muted loop playsInline preload="auto">
              <source src="logos/Not_The_Rug_2023_clipped_web.webm" type="video/webm" />
              <source src="logos/Not_The_Rug_2023_clipped_web.mp4" type="video/mp4" />
            </video>
            <div className="hero-img-overlay"></div>
            <div className="hero-img-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> McCarren Park, Williamsburg</div>
          </div>
          <div className="hero-content">
            <h1 className="hero-h1">Your dog deserves<br /><em>someone they know.</em></h1>
            <p className="hero-p">Not The Rug is Williamsburg&apos;s original neighborhood dog walking service. No apps, no strangers, no shortcuts — just consistent, caring walks from a team your dog loves.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => (window as any).showPage('book')}>Book a Free Meet &amp; Greet</button>
              <button className="btn btn-ghost" onClick={() => (window as any).showPage('services')}>View Services</button>
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
          </div>
        </section>

        {/* Trust bar */}
        <div className="trust-bar">
          <div className="trust-bar-inner">
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              NAPPS Certified
            </div>
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Fully Insured &amp; Bonded
            </div>
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              GPS-Tracked Every Walk
            </div>
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Background-Checked Team
            </div>
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              CPR &amp; First Aid Certified
            </div>
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Max 3 Dogs Per Walk
            </div>
          </div>
        </div>

        {/* Scrolling social proof */}
        <div className="social-proof-strip">
          <div className="proof-track" id="proof-track">
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Luis&apos;s professionalism puts even the most nervous pet parent at ease&quot;</span><span className="proof-author">— Jessica Y., Williamsburg</span></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Seriously — hire Not The Rug. They won&apos;t disappoint.&quot;</span><span className="proof-author">— Jayne A., Williamsburg</span></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Trust Luis to take care of your dog as if it was his own&quot;</span><span className="proof-author">— Kassie T., Williamsburg</span></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Daily updates, cute photos, and my dog LOVES her walker&quot;</span><span className="proof-author">— Hayley M., Williamsburg</span></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Luis&apos;s professionalism puts even the most nervous pet parent at ease&quot;</span><span className="proof-author">— Jessica Y., Williamsburg</span></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Seriously — hire Not The Rug. They won&apos;t disappoint.&quot;</span><span className="proof-author">— Jayne A., Williamsburg</span></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Trust Luis to take care of your dog as if it was his own&quot;</span><span className="proof-author">— Kassie T., Williamsburg</span></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="stars">★★★★★</div><span className="proof-quote">&quot;Daily updates, cute photos, and my dog LOVES her walker&quot;</span><span className="proof-author">— Hayley M., Williamsburg</span></div>
            <div className="proof-sep"></div>
          </div>
        </div>

        {/* Services preview */}
        <section className="section">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'56px'}}>
              <div className="label">What We Offer</div>
              <h2>Personalized care for <em style={{fontFamily:'var(--font-italic)', fontStyle:'italic', color:'var(--sage-dark)'}}>every dog</em></h2>
              <div className="divider divider-center"></div>
              <p style={{color:'var(--mid-gray)', maxWidth:'480px', margin:'0 auto', fontSize:'16px'}}>Small group walks, solo sessions, puppy care, and boarding — all delivered by a team your dog will actually look forward to seeing.</p>
            </div>
            <div className="services-grid">
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="4" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M12 17c-2.5 0-6 1.5-6 4v1h12v-1c0-2.5-3.5-4-6-4z"/></svg></div>
                <h4>Group Walk</h4>
                <p>45-minute walks with up to 3 dogs. GPS tracked, report card included, paws cleaned on return.</p>
                <div className="service-price">$33<span>/walk</span></div>
                <div style={{marginTop:'12px'}}><span className="badge badge-sage">Most Popular</span></div>
              </div>
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
                <h4>Walk + Training</h4>
                <p>Solo 60-minute session combining your dog&apos;s exercise with positive reinforcement training.</p>
                <div className="service-price">$60<span>/session</span></div>
                <div style={{marginTop:'12px'}}><span className="badge badge-gold">Premium</span></div>
              </div>
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                <h4>Boarding &amp; Sitting</h4>
                <p>In-home overnight care so your dog sleeps in familiar surroundings while you&apos;re away.</p>
                <div className="service-price">$100<span>/night</span></div>
                <div style={{marginTop:'12px'}}><span className="badge badge-terra">7+ day discounts</span></div>
              </div>
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="4" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M12 17c-2.5 0-6 1.5-6 4v1h12v-1c0-2.5-3.5-4-6-4z"/></svg></div>
                <h4>Puppy Visits</h4>
                <p>Specialized visits for puppies 2–6 months old. 2–3 visits daily recommended for development. Discount for 2nd and 3rd daily visit.</p>
                <div className="service-price">$35<span>/visit</span></div>
              </div>
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg></div>
                <h4>Senior Dog Care</h4>
                <p>Gentle 20-minute solo visits for senior or special needs dogs at their own comfortable pace.</p>
                <div className="service-price">$25<span>/visit</span></div>
              </div>
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-8.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75z"/></svg></div>
                <h4>Cat Visits</h4>
                <p>Feeding, play, litter, brushing, and a little love. Plant watering, mail collection, and tidying up included. Perfect for weekends away.</p>
                <div className="service-price">$30<span>/visit</span></div>
              </div>
            </div>
            <div style={{textAlign:'center', marginTop:'40px'}}>
              <button className="btn btn-outline" onClick={() => (window as any).showPage('services')}>See All Packages &amp; Rates</button>
            </div>
          </div>
        </section>

        {/* How it works strip */}
        <section className="section bg-warm">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'64px'}}>
              <div className="label">Simple Process</div>
              <h2>From first hello<br />to daily routine</h2>
            </div>
            <div className="hiw-steps">
              <div className="hiw-step">
                <div className="hiw-num">1</div>
                <h4>Meet &amp; Greet</h4>
                <p>Free in-home consultation so your dog meets your walker before the first walk.</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-num">2</div>
                <h4>Set Your Schedule</h4>
                <p>Choose your walking frequency, preferred times, and any special instructions.</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-num">3</div>
                <h4>First Walk</h4>
                <p>GPS-tracked 45-minute adventure with post-walk photo report sent to your phone.</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-num">4</div>
                <h4>Ongoing Care</h4>
                <p>Same walker, same routine. Your dog knows the drill and so do we.</p>
              </div>
            </div>
            <div style={{textAlign:'center', marginTop:'56px'}}>
              <button className="btn btn-primary" onClick={() => (window as any).showPage('how-it-works')}>Learn More About Our Process</button>
            </div>
          </div>
        </section>

        {/* Featured reviews */}
        <section className="section">
          <div className="container">
            <div style={{marginBottom:'48px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'20px'}}>
              <div>
                <div className="label">Client Feedback</div>
                <h2>What our clients say</h2>
                <div className="divider"></div>
              </div>
              <button className="btn btn-ghost" onClick={() => (window as any).showPage('reviews')}>Read All Reviews</button>
            </div>
            <div className="grid-3">
              <div className="review-card card-hover">
                <div className="review-mark">&quot;</div>
                <div className="stars">★★★★★</div>
                <p className="review-text">Luis and team are truly the best of the best. It&apos;s not easy to trust just anyone with our fur baby, but Luis&apos;s professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.</p>
                <div className="review-author">
                  <div className="review-avatar"><div className="review-avatar-ph">JY</div></div>
                  <div>
                    <div className="review-name">Jessica Y.</div>
                    <div className="review-meta">Williamsburg · Yelp</div>
                  </div>
                </div>
              </div>
              <div className="review-card card-hover">
                <div className="review-mark">&quot;</div>
                <div className="stars">★★★★★</div>
                <p className="review-text">We&apos;ve been with Not The Rug for over two years and couldn&apos;t be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.</p>
                <div className="review-author">
                  <div className="review-avatar"><div className="review-avatar-ph">JA</div></div>
                  <div>
                    <div className="review-name">Jayne A.</div>
                    <div className="review-meta">Williamsburg · Yelp</div>
                  </div>
                </div>
              </div>
              <div className="review-card card-hover">
                <div className="review-mark">&quot;</div>
                <div className="stars">★★★★★</div>
                <p className="review-text">Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own — flexible with schedule changes and always reliable. Your dogs will be in great hands!</p>
                <div className="review-author">
                  <div className="review-avatar"><div className="review-avatar-ph">KT</div></div>
                  <div>
                    <div className="review-name">Kassie T.</div>
                    <div className="review-meta">Williamsburg · Yelp</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Owner pull quote */}
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

        {/* Neighborhood teaser */}
        <section className="section bg-warm">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'48px'}}>
              <div className="label">Service Areas</div>
              <h2>We know every street,<br />every park, every shortcut</h2>
              <p style={{color:'var(--mid-gray)', maxWidth:'440px', margin:'16px auto 0', fontSize:'16px'}}>15 years of walks means 15 years of neighborhood knowledge. Find your area below.</p>
            </div>
            <div className="hood-cards-grid">
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('williamsburg')}>
                <div className="hood-card-img img-placeholder img-ph-1" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Williamsburg</div><div className="hood-card-desc">Our home neighborhood since 2011</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('greenpoint')}>
                <div className="hood-card-img img-placeholder img-ph-2" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Greenpoint</div><div className="hood-card-desc">McGolrick Park specialists</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('bushwick')}>
                <div className="hood-card-img img-placeholder img-ph-3" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Bushwick</div><div className="hood-card-desc">Maria Hernandez Park routes</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('bedstuy')}>
                <div className="hood-card-img img-placeholder img-ph-4" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Bed-Stuy</div><div className="hood-card-desc">Herbert Von King Park walks</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('park-slope')}>
                <div className="hood-card-img img-placeholder img-ph-5" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Park Slope</div><div className="hood-card-desc">Prospect Park dog runs</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showPage('neighborhoods')} style={{background:'var(--sage-dark)', position:'relative'}}>
                <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', gap:'12px'}}>
                  <div><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></div>
                  <div style={{fontFamily:'var(--font-display)', fontSize:'22px'}}>+ More Areas</div>
                  <div style={{fontSize:'13px', opacity:.7}}>View full coverage map</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="section">
          <div className="container">
            <div className="cta-band">
              <div>
                <div className="label label-dark">Get Started Today</div>
                <h2 style={{color:'white'}}>Ready for a walker<br />your dog actually loves?</h2>
                <p>Book a free meet &amp; greet — no commitment required. We&apos;ll come to you.</p>
              </div>
              <div className="cta-band-actions">
                <button className="btn btn-outline-white" onClick={() => (window as any).showPage('book')}>Book Meet &amp; Greet</button>
                <button className="btn" style={{color:'rgba(255,255,255,0.7)', padding:'14px 0'}} onClick={() => (window as any).showPage('contact')}>Contact Us →</button>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-home */}

      {/* PAGE: SERVICES */}
      <div id="page-services" className="page">
        <div className="page-hero" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/IMAGE 00001.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>Services &amp; Rates</div>
            <h1>Transparent pricing,<br />no surprises</h1>
            <p>Every service includes a free consultation, GPS tracking, and post-walk photo updates.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-services"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Biscuit · @biscuit_bklyn</a>
        </div>

        {/* Services grid */}
        <section className="section">
          <div className="container">
            <div className="grid-3" id="services-grid" style={{gap:'32px', marginBottom:'48px'}}>

              {/* Group Walk */}
              <div className="service-card">
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="4" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M12 17c-2.5 0-6 1.5-6 4v1h12v-1c0-2.5-3.5-4-6-4z"/></svg></div>
                <h3>Group Walk</h3>
                <p>45-minute walks with up to 3 dogs. GPS tracked, report card included, paws cleaned on return.</p>
                <div className="svc-price">$33<span>/walk</span></div>
                <div className="svc-badge">Most Popular</div>
              </div>

              {/* Walk + Training */}
              <div className="service-card">
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
                <h3>Walk + Training</h3>
                <p>Solo 60-minute session combining your dog&apos;s exercise with positive reinforcement training.</p>
                <div className="svc-price">$60<span>/session</span></div>
                <div className="svc-badge">Premium</div>
              </div>

              {/* Boarding & Sitting */}
              <div className="service-card">
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                <h3>Boarding &amp; Sitting</h3>
                <p>In-home overnight care so your dog sleeps in familiar surroundings while you&apos;re away.</p>
                <div className="svc-price">$100<span>/night</span></div>
                <div className="svc-badge">7+ day discounts</div>
              </div>

              {/* Puppy Visits */}
              <div className="service-card">
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="4" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M12 17c-2.5 0-6 1.5-6 4v1h12v-1c0-2.5-3.5-4-6-4z"/></svg></div>
                <h3>Puppy Visits</h3>
                <p>Specialized visits for puppies 2–6 months old. 2–3 visits daily recommended for development. Discount for 2nd and 3rd daily visit.</p>
                <div className="svc-price">$35<span>/visit</span></div>
              </div>

              {/* Senior Dog Care */}
              <div className="service-card">
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                <h3>Senior Dog Care</h3>
                <p>Gentle 20-minute solo visits for senior or special needs dogs at their own comfortable pace.</p>
                <div className="svc-price">$25<span>/visit</span></div>
              </div>

              {/* Cat Visits */}
              <div className="service-card">
                <div className="service-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-8.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75z"/></svg></div>
                <h3>Cat Visits</h3>
                <p>Feeding, play, litter, brushing, and a little love. Plant watering, mail collection, and tidying up included. Perfect for weekends away.</p>
                <div className="svc-price">$30<span>/visit</span></div>
              </div>

            </div>
          </div>
        </section>

        {/* Monthly packages */}
        <section className="section bg-texture" style={{backgroundColor:'var(--cream)', paddingTop:0}}>
          <div className="container">
            <div className="package-banner">
              <div>
                <div className="label" style={{color:'var(--gold-light)'}}>Save with Packages</div>
                <h2 style={{color:'white'}}>Monthly walking plans</h2>
                <p style={{color:'rgba(255,255,255,0.65)', maxWidth:'480px', marginTop:'12px', fontSize:'16px'}}>Commit to a regular schedule and save up to 20%. Predictable care for your dog, predictable billing for you.</p>
              </div>
              <div className="package-tiers">
                <div className="package-tier">
                  <div className="package-tier-name">The Casual</div>
                  <div className="package-tier-price">~$140/mo</div>
                  <div className="package-tier-desc">4 walks/month — occasional care when you need it</div>
                  <div className="package-tier-save">Standard rate</div>
                  <button className="btn btn-outline-white btn-sm" style={{width:'100%', justifyContent:'center'}} onClick={() => (window as any).showPage('book')}>Get Started</button>
                </div>
                <div className="package-tier" style={{borderColor:'rgba(201,169,110,0.5)', background:'rgba(201,169,110,0.1)'}}>
                  <div className="package-tier-name">The Regular</div>
                  <div className="package-tier-price">~$660/mo</div>
                  <div className="package-tier-desc">5 walks/week — daily structure your dog thrives on</div>
                  <div className="package-tier-save">Save 6% vs. single rate</div>
                  <button className="btn btn-outline-white btn-sm" style={{width:'100%', justifyContent:'center'}} onClick={() => (window as any).showPage('book')}>Get Started</button>
                </div>
                <div className="package-tier">
                  <div className="package-tier-name">The Committed</div>
                  <div className="package-tier-price">Custom</div>
                  <div className="package-tier-desc">Multiple services bundled — walking + training + boarding</div>
                  <div className="package-tier-save">Best value</div>
                  <button className="btn btn-outline-white btn-sm" style={{width:'100%', justifyContent:'center'}} onClick={() => (window as any).showPage('contact')}>Let&apos;s Talk</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What's always included */}
        <section className="section" style={{paddingTop:0}}>
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'48px'}}>
              <div className="label">Always Included</div>
              <h2>Every walk, every time</h2>
            </div>
            <div className="grid-4">
              <div style={{textAlign:'center', padding:'24px'}}>
                <div style={{marginBottom:'14px'}}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                <h4 style={{fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'8px'}}>GPS Tracking</h4>
                <p style={{fontSize:'14px', color:'var(--mid-gray)'}}>Live route map sent after every walk so you see exactly where they went.</p>
              </div>
              <div style={{textAlign:'center', padding:'24px'}}>
                <div style={{marginBottom:'14px'}}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
                <h4 style={{fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'8px'}}>Photo Report</h4>
                <p style={{fontSize:'14px', color:'var(--mid-gray)'}}>Post-walk update with photos, mood notes, and any observations.</p>
              </div>
              <div style={{textAlign:'center', padding:'24px'}}>
                <div style={{marginBottom:'14px'}}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                <h4 style={{fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'8px'}}>Double-Leash Safety</h4>
                <p style={{fontSize:'14px', color:'var(--mid-gray)'}}>Our signature dual collar-and-harness method on every walk.</p>
              </div>
              <div style={{textAlign:'center', padding:'24px'}}>
                <div style={{marginBottom:'14px'}}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                <h4 style={{fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'8px'}}>Direct Communication</h4>
                <p style={{fontSize:'14px', color:'var(--mid-gray)'}}>Text or call your walker directly — no support tickets, no bots.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{paddingTop:0}} id="services-signup-section">
          <div className="container">
            <div className="booking-form-wrap">
              <div className="booking-form">
                <div className="booking-form-tabs">
                  <div className="booking-tab active" onClick={(e) => (window as any).switchBookTab(e.currentTarget, 'svc-tab-meetgreet')}>Free Meet &amp; Greet</div>
                  <div className="booking-tab" onClick={(e) => (window as any).switchBookTab(e.currentTarget, 'svc-tab-service')}>Book a Service</div>
                  <div className="booking-tab" onClick={(e) => (window as any).switchBookTab(e.currentTarget, 'svc-tab-contact')}>Ask a Question</div>
                </div>
                <div className="booking-form-body">
                  {/* Meet & Greet Tab */}
                  <div id="svc-tab-meetgreet">
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Let&apos;s meet your dog</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Fill this out and we&apos;ll reach out within 2 hours on weekdays to schedule your free visit.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Your Name</label>
                        <input type="text" className="form-control" placeholder="First & last name" />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel" className="form-control" placeholder="(347) 000-0000" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" className="form-control" placeholder="you@email.com" />
                      </div>
                      <div className="form-group">
                        <label>Neighborhood</label>
                        <select className="form-control form-select">
                          <option>Williamsburg</option>
                          <option>Greenpoint</option>
                          <option>Bushwick</option>
                          <option>Bed-Stuy</option>
                          <option>Park Slope</option>
                          <option>East Williamsburg</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Dog&apos;s Name</label>
                        <input type="text" className="form-control" placeholder="What's their name?" />
                      </div>
                      <div className="form-group">
                        <label>Breed &amp; Age</label>
                        <input type="text" className="form-control" placeholder="e.g. Golden, 3 years" />
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:'20px'}}>
                      <label>Service Interested In</label>
                      <select className="form-control form-select">
                        <option>Daily Group Walks</option>
                        <option>Walk + Training Sessions</option>
                        <option>Puppy Visits</option>
                        <option>Senior Dog Care</option>
                        <option>Boarding / Sitting</option>
                        <option>Not sure yet</option>
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:'24px'}}>
                      <label>Anything we should know?</label>
                      <textarea className="form-control" rows={3} placeholder="Quirks, anxieties, medication needs, building access info — anything helpful"></textarea>
                    </div>
                    <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'16px'}} onClick={() => alert('✅ Form submitted! In a live site, this connects to Time To Pet or your CRM.')}>Request My Free Meet &amp; Greet</button>
                    <p className="form-note">We respond within 2 hours Mon–Fri · No spam, ever · Your info stays private</p>
                  </div>

                  {/* Service Booking Tab */}
                  <div id="svc-tab-service" style={{display:'none'}}>
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Book a service</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Existing clients can book below. New clients — please start with a Meet &amp; Greet.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Service Type</label>
                        <select className="form-control form-select">
                          <option>Group Walk ($33/walk)</option>
                          <option>Solo Walk + Training ($60)</option>
                          <option>Puppy Visit ($35)</option>
                          <option>Senior Visit ($25)</option>
                          <option>Boarding ($100/night)</option>
                          <option>Cat Visit ($30)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Preferred Date</label>
                        <input type="date" className="form-control" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Preferred Time</label>
                        <select className="form-control form-select">
                          <option>Morning (8–10 AM)</option>
                          <option>Late Morning (10 AM–12 PM)</option>
                          <option>Midday (12–2 PM)</option>
                          <option>Afternoon (2–5 PM)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Number of Dogs</label>
                        <select className="form-control form-select">
                          <option>1 dog</option>
                          <option>2 dogs (same household)</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:'24px'}}>
                      <label>Your Email</label>
                      <input type="email" className="form-control" placeholder="For confirmation" />
                    </div>
                    <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'16px'}} onClick={() => alert('✅ In a live site, this connects to Time To Pet booking system.')}>Request Booking</button>
                  </div>

                  {/* Ask a Question Tab */}
                  <div id="svc-tab-contact" style={{display:'none'}}>
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Get in touch</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Have a specific situation or question? Send us a message and we&apos;ll reply personally.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Your Name</label>
                        <input type="text" className="form-control" placeholder="Name" />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-control" placeholder="Email" />
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:'20px'}}>
                      <label>Subject</label>
                      <select className="form-control form-select">
                        <option>General inquiry</option>
                        <option>Pricing question</option>
                        <option>My dog has special needs</option>
                        <option>Coverage area question</option>
                        <option>Team / employment</option>
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:'24px'}}>
                      <label>Message</label>
                      <textarea className="form-control" rows={4} placeholder="Tell us what's on your mind..."></textarea>
                    </div>
                    <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'16px'}} onClick={() => alert('✅ Message sent!')}>Send Message</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-services */}

      {/* PAGE: HOW IT WORKS */}
      <div id="page-how-it-works" className="page">
        <div className="page-hero" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/IMAGE 00002.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>The Process</div>
            <h1>How it works</h1>
            <p>From first contact to daily walks — here&apos;s exactly what to expect when you join Not The Rug.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-howitworks"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Mochi · @mochi_wlmsbg</a>
        </div>

        <section className="section">
          <div className="container">
            <div className="grid-2" style={{gap:'80px'}}>
              <div>
                <div className="process-step">
                  <div className="process-num-big">01</div>
                  <div className="process-content">
                    <h3>Reach Out</h3>
                    <p>Fill out our simple intake form or give us a call. Tell us about your dog — breed, age, personality, any quirks we should know about. We respond within 2 hours on weekdays.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">02</div>
                  <div className="process-content">
                    <h3>Free Meet &amp; Greet</h3>
                    <p>We come to your home. Your dog meets their future walker in their own space, on their own terms. We discuss your routine, review key handling, and answer every question. No charge, no commitment.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">03</div>
                  <div className="process-content">
                    <h3>Set Up Your Profile</h3>
                    <p>We&apos;ll log feeding schedules, vet contacts, emergency protocols, door codes, and any behavioral notes. Your dog&apos;s profile travels with their walker on every visit.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">04</div>
                  <div className="process-content">
                    <h3>First Walk</h3>
                    <p>Your assigned walker arrives within a 15-minute window. GPS tracking starts, your dog gets 45 minutes of proper exercise, and you receive a photo report when they&apos;re home safe.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">05</div>
                  <div className="process-content">
                    <h3>Ongoing &amp; Recurring</h3>
                    <p>Same walker, same time, same route calibrated to your dog&apos;s preferences. Monthly invoicing, simple cancellation policy (48-hour notice), and an open line to us whenever you need it.</p>
                  </div>
                </div>
              </div>

              <div>
                {/* Walk report card mock */}
                <div style={{position:'sticky', top:'100px'}}>
                  <div className="label">Sample Walk Report</div>
                  <div className="report-card-mock">
                    <div className="rc-header">
                      <div className="rc-paw"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="4" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M12 17c-2.5 0-6 1.5-6 4v1h12v-1c0-2.5-3.5-4-6-4z"/></svg></div>
                      <div>
                        <div className="rc-title">Walk Report — Bruno</div>
                        <div className="rc-subtitle">Tuesday, March 18 · 10:15 AM</div>
                      </div>
                    </div>
                    <div className="rc-body">
                      <div className="rc-row">
                        <div className="rc-icon">⏱️</div>
                        <div><div className="rc-label">Duration</div><div className="rc-value">46 minutes</div></div>
                      </div>
                      <div className="rc-row">
                        <div className="rc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 8.7 8.7 21.3c-.9.9-2.4.9-3.3 0l-2.7-2.7a2.3 2.3 0 0 1 0-3.3L15.3 2.7c.9-.9 2.4-.9 3.3 0l2.7 2.7c.9.9.9 2.4 0 3.3z"/><line x1="7.5" y1="10.5" x2="10" y2="13"/><line x1="10.5" y1="7.5" x2="13" y2="10"/><line x1="13.5" y1="4.5" x2="16" y2="7"/></svg></div>
                        <div><div className="rc-label">Distance</div><div className="rc-value">1.8 miles</div></div>
                      </div>
                      <div className="rc-row">
                        <div className="rc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22 C2 22 8 16 14 10 C20 4 22 2 22 2 C22 2 20 4 14 10 C8 16 2 22 2 22z"/><path d="M22 2 L12 12"/></svg></div>
                        <div><div className="rc-label">Potty Breaks</div><div className="rc-value">2 times — all cleaned up</div></div>
                      </div>
                      <div className="rc-row">
                        <div className="rc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 10c.7-.7 1-1.6 1-2.5a3.5 3.5 0 0 0-3.5-3.5C13.6 4 12.7 4.3 12 5L5 12c-.7.7-1 1.6-1 2.5a3.5 3.5 0 0 0 3.5 3.5c.9 0 1.8-.3 2.5-1l7-7z"/><path d="M14 10l-4 4"/></svg></div>
                        <div><div className="rc-label">Treats</div><div className="rc-value">2 × Zukes Mini Naturals</div></div>
                      </div>
                      <div className="rc-map">
                        <div className="rc-map-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> GPS Route · McCarren Park Loop</div>
                      </div>
                      <div style={{fontSize:'13px', color:'var(--mid-gray)', marginBottom:'10px'}}>Walker&apos;s Note</div>
                      <p style={{fontSize:'14px', color:'var(--charcoal)', lineHeight:'1.6', marginBottom:'16px'}}>&quot;Bruno was in great spirits today! He made a new friend at the park — a golden named Lucy. He was a bit tired on the way back so we took the shady route home. Paws cleaned, water bowl topped up. See you Thursday!&quot;</p>
                      <div className="rc-photo-row">
                        <div className="rc-photo img-placeholder img-ph-1" style={{aspectRatio:'1'}}></div>
                        <div className="rc-photo img-placeholder img-ph-2" style={{aspectRatio:'1'}}></div>
                        <div className="rc-photo img-placeholder img-ph-3" style={{aspectRatio:'1'}}></div>
                      </div>
                    </div>
                  </div>

                  <div className="phase-callout" style={{marginTop:'24px'}}>
                    <div className="phase-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                    <div>
                      <div className="phase-tag">Coming Soon — Phase 2</div>
                      <h4>Real-Time Walk App</h4>
                      <p>We&apos;re building a dedicated client app for live GPS tracking, instant messaging with your walker, and booking management — all in one place.</p>
                      <ul className="phase-list">
                        <li>Live GPS map during the walk</li>
                        <li>Instant photo push notifications</li>
                        <li>In-app booking and scheduling</li>
                        <li>Walker rating and feedback</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-how-it-works */}

      {/* PAGE: ABOUT */}
      <div id="page-about" className="page">
        <div className="page-hero" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/IMAGE 00003.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>Our Story</div>
            <h1>15 years of walks,<br />one neighborhood</h1>
            <p>Not The Rug was born in Williamsburg and has never left. Here&apos;s why that matters.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-about"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Scout · @scout_bklyn</a>
        </div>

        {/* Origin story */}
        <section className="section">
          <div className="container">
            <div className="grid-2" style={{gap:'72px'}}>
              <div>
                <div className="label">Founded 2011</div>
                <h2>A neighborhood service, not a platform</h2>
                <div className="divider"></div>
                <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8', marginBottom:'20px'}}>Not The Rug was founded in 2011 by Luis, a Williamsburg resident since 2006. Before that, Luis spent years in broadcasting and music — working as a Program Director at SiriusXM Radio and consulting for Red Bull on music strategy and cultural programming. In 2008, the pace of that world pushed him to step away. He took a job walking dogs on the Upper West Side, and the work changed everything. It started with two dogs — Suzy and Oliver — and daily walks rooted in close observation. What began as a reset became a calling, and what started as a favor for a few friends on N 7th Street became Brooklyn&apos;s most trusted neighborhood dog walking service.</p>
                <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8', marginBottom:'20px'}}>The name is a promise. Your dog will not ruin your rug because they&apos;ll be properly walked, genuinely cared for, and returned home happy. It&apos;s also a nod to the neighborhood&apos;s sense of humor — we don&apos;t take ourselves too seriously, but we take your dog very seriously.</p>
                <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8'}}>We&apos;ve never expanded beyond what we can do well. We don&apos;t use gig workers. We don&apos;t dispatch strangers. Every walker on our team has been with us for years, knows the neighborhood by heart, and knows your dog by name.</p>
              </div>
              <div>
                <div style={{aspectRatio:'4/5', borderRadius:'var(--radius-lg)', overflow:'hidden', marginBottom:'20px'}}>
                  <div className="img-placeholder img-ph-2" style={{height:'100%'}}>
                    <div className="img-label">Luis, founder · Williamsburg 2011</div>
                  </div>
                </div>
                <div className="grid-2" style={{gap:'12px'}}>
                  <div style={{background:'var(--cream)', border:'1px solid var(--light-gray)', borderRadius:'var(--radius)', padding:'20px', textAlign:'center'}}>
                    <div style={{fontFamily:'var(--font-display)', fontSize:'36px', color:'var(--sage-dark)'}}>2011</div>
                    <div style={{fontSize:'13px', color:'var(--mid-gray)'}}>Founded in Williamsburg</div>
                  </div>
                  <div style={{background:'var(--cream)', border:'1px solid var(--light-gray)', borderRadius:'var(--radius)', padding:'20px', textAlign:'center'}}>
                    <div style={{fontFamily:'var(--font-display)', fontSize:'36px', color:'var(--sage-dark)'}}>5★</div>
                    <div style={{fontSize:'13px', color:'var(--mid-gray)'}}>Avg. rating across platforms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section bg-warm">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'48px'}}>
              <div className="label">How We Work</div>
              <h2>The principles behind every walk</h2>
            </div>
            <p style={{textAlign:'center', color:'var(--mid-gray)', maxWidth:'620px', margin:'0 auto 48px', fontSize:'16px', lineHeight:'1.8'}}>Our walks are structured and consistent, giving dogs a familiar rhythm from pickup to drop-off. Our walkers stay present, adjust pace as needed, and respond in real time to what each dog is communicating — on the leash and in their body. Repetition builds trust. Dogs move with more ease, and the transition from walk to rest becomes natural rather than chaotic.</p>
            <div className="values-grid">
              <div className="value-cell">
                <div className="value-num">01</div>
                <h4>Consistency Over Convenience</h4>
                <p>We turn down more clients than we take on. Not because we&apos;re exclusive — because we only take new clients when we can assign a consistent walker who has true capacity. Your dog doesn&apos;t need a different person every week.</p>
              </div>
              <div className="value-cell" style={{background:'var(--cream)'}}>
                <div className="value-num">02</div>
                <h4>Small Groups, Real Attention</h4>
                <p>Three dogs maximum per walk. Always. That&apos;s not a marketing line — it&apos;s a practical commitment to safe, attentive care. Your dog gets exercise and engagement, not crowd management.</p>
              </div>
              <div className="value-cell" style={{background:'var(--cream)'}}>
                <div className="value-num">03</div>
                <h4>Neighborhood Expertise</h4>
                <p>We know which parks get flooded in rain, which blocks have aggressive off-leash dogs, which routes are best for reactive dogs, and which shortcuts to use in summer heat. 15 years builds that kind of knowledge.</p>
              </div>
              <div className="value-cell">
                <div className="value-num">04</div>
                <h4>Real People, Always Reachable</h4>
                <p>Luis&apos;s personal number is on the website. You can text or call your walker directly. There&apos;s no support ticket system here. If something happens — good or bad — you hear from a human, immediately.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="section">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'48px'}}>
              <div className="label">The Team</div>
              <h2>Meet your dog&apos;s people</h2>
              <div className="divider divider-center"></div>
            </div>
            <div className="grid-3">
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-2" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Luis</div>
                  <div className="team-role">Founder &amp; Lead Walker</div>
                  <p className="team-bio">Former SiriusXM Program Director and Red Bull music strategist who traded the broadcast world for Brooklyn sidewalks. Founded Not The Rug in 2011 after discovering dog walking on the Upper West Side. Williamsburg resident since 2006 — he knows every block, every park, and most of the dogs by name.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">NAPPS Certified</span>
                    <span className="badge badge-sage">CPR/First Aid</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-1" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Joseph</div>
                  <div className="team-role">Senior Walker · 5+ Years</div>
                  <p className="team-bio">Film buff and former skateboarder who discovered dogs were his real calling. Clients say their dogs hear his footsteps in the hallway before the doorbell rings.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">CPR/First Aid</span>
                    <span className="badge badge-gold">5+ Year Veteran</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-3" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Marcus</div>
                  <div className="team-role">Walker &amp; Training Specialist</div>
                  <p className="team-bio">Former Petco trainer with a background in positive reinforcement methodology. Specializes in reactive and anxious dogs. Owns a rescue named Potato.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">Training Specialist</span>
                    <span className="badge badge-terra">Reactive Dog Expert</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-5" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Léa <span style={{fontWeight:400, fontSize:'13px', color:'var(--mid-gray)'}}>(pronounced lay-uh)</span></div>
                  <div className="team-role">Walker · 5+ Years</div>
                  <p className="team-bio">Environmental science background and lifelong animal advocate. Owns a mutt named Miso and approaches each walk like a miniature nature expedition.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">CPR/First Aid</span>
                    <span className="badge badge-gold">5+ Year Veteran</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-4" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Lincoln</div>
                  <div className="team-role">Walker</div>
                  <p className="team-bio">Originally from South Louisiana where she grew up caring for everything from dogs to miniature donkeys to emus, Lincoln moved to Brooklyn three years ago with her three Southern pups. Her deep respect for animals and steady, generous approach make her a trusted presence on every walk.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">CPR/First Aid</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-1" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Nina</div>
                  <div className="team-role">Senior Walker · Longest-Serving</div>
                  <p className="team-bio">Auntie Nina has been around dogs since infancy and treats every one like family. Born and raised in New Jersey, she&apos;s one of Not The Rug&apos;s longest-serving team members with deep relationships across clients and pups alike. Probably holding an iced latte — any season.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">CPR/First Aid</span>
                    <span className="badge badge-gold">5+ Year Veteran</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-3" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Christian</div>
                  <div className="team-role">Walker</div>
                  <p className="team-bio">After six years as a chef and kitchen manager, Christian traded the kitchen for the neighborhood — bringing the same discipline, focus, and attention to detail to every walk. Patient, steady, and deeply caring with every dog in his charge.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">CPR/First Aid</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-5" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Shawn</div>
                  <div className="team-role">Walker</div>
                  <p className="team-bio">Artist, musician, and visual creator, Shawn brings a calm, grounded presence to every walk. After two years with another service, he joined Not The Rug for its more intentional approach to care — and it shows.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">CPR/First Aid</span>
                  </div>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo img-placeholder img-ph-2" style={{height:'280px'}}></div>
                <div className="team-info">
                  <div className="team-name">Ivan</div>
                  <div className="team-role">Walker</div>
                  <p className="team-bio">The definition of an animal lover — Ivan&apos;s home crew includes Lucy the dachshund, Casper the parrot, cats, and a 50-gallon fish tank. A recent Brooklyn College graduate with over three years of professional experience, he brings genuine enthusiasm to every walk.</p>
                  <div className="team-certifications">
                    <span className="badge badge-sage">CPR/First Aid</span>
                  </div>
                </div>
              </div>
              <div className="team-card" style={{border:'2px dashed var(--sage-light)', background:'var(--cream)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px', textAlign:'center'}}>
                <div style={{marginBottom:'16px'}}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></div>
                <h4 style={{fontFamily:'var(--font-display)', fontSize:'22px', marginBottom:'10px'}}>Join the team</h4>
                <p style={{fontSize:'14px', color:'var(--mid-gray)', marginBottom:'20px'}}>We hire experienced, passionate walkers who want to build real relationships — not just fill shifts.</p>
                <button className="btn btn-outline btn-sm" onClick={() => (window as any).showPage('contact')}>Learn More</button>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-about */}

      {/* PAGE: SAFETY & TRUST */}
      <div id="page-safety" className="page">
        <div className="page-hero" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/IMAGE 00004.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>Safety &amp; Trust</div>
            <h1>Why trust matters<br />more than price</h1>
            <p>Every trust and safety standard we hold ourselves to — and why we hold it.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-safety"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Waffles · @waffles_nyc</a>
        </div>

        <section className="section">
          <div className="container">
            <div className="grid-2" style={{gap:'32px', marginBottom:'64px'}}>
              <div className="trust-card">
                <div className="trust-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <div>
                  <h4>Fully Insured &amp; Bonded</h4>
                  <p>Not The Rug carries comprehensive pet care liability insurance and is fully bonded. In the unlikely event of an accident or property issue, you&apos;re protected. We&apos;ll share proof of insurance on request.</p>
                </div>
              </div>
              <div className="trust-card">
                <div className="trust-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                <div>
                  <h4>Background-Checked Team</h4>
                  <p>Every member of our team undergoes a comprehensive background check before their first walk. We vet our walkers as carefully as you&apos;d vet someone with a key to your home — because that&apos;s exactly what they have.</p>
                </div>
              </div>
              <div className="trust-card">
                <div className="trust-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                <div>
                  <h4>GPS Tracking on Every Walk</h4>
                  <p>Every walk is GPS logged. You receive a post-walk route map showing exactly where your dog went, how long they walked, and when they returned. No guessing, no vague check-ins.</p>
                </div>
              </div>
              <div className="trust-card">
                <div className="trust-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                <div>
                  <h4>Double-Leash Safety Method</h4>
                  <p>All our walkers use our signature dual collar-and-harness method — front clip harnesses paired with martingale collars, secured with Geartac security belts. Two points of contact means if one fails, your dog is still safe. Every walker carries a trainer treat pouch and follows a strict no-phone-while-walking policy. We conduct weekly gear checks on all equipment, and every new team member completes four weeks of walking and safety training directly with the owner before their first solo walk. This is non-negotiable regardless of breed or temperament.</p>
                </div>
              </div>
              <div className="trust-card">
                <div className="trust-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
                <div>
                  <h4>CPR &amp; First Aid Certified</h4>
                  <p>Our entire active team is certified in pet CPR and first aid. We also maintain current contact for each client&apos;s vet and have an emergency protocol reviewed at every onboarding.</p>
                </div>
              </div>
              <div className="trust-card">
                <div className="trust-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <div>
                  <h4>Max 3 Dogs Per Walk</h4>
                  <p>We cap every group walk at three dogs. This is a safety standard and a quality standard. Your dog gets genuine attention — not a chaotic pack of strangers that can&apos;t be safely managed.</p>
                </div>
              </div>
            </div>

            {/* Certifications strip */}
            <div style={{textAlign:'center', marginBottom:'32px'}}>
              <div className="label">Certifications &amp; Memberships</div>
              <h3>Professional credentials</h3>
            </div>
            <div className="cert-strip" style={{justifyContent:'center'}}>
              <div className="cert-item">
                <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></div>
                <div className="cert-label">NAPPS Member</div>
              </div>
              <div className="cert-item">
                <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
                <div className="cert-label">Pet CPR Certified</div>
              </div>
              <div className="cert-item">
                <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg></div>
                <div className="cert-label">First Aid Certified</div>
              </div>
              <div className="cert-item">
                <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                <div className="cert-label">Background Checked</div>
              </div>
              <div className="cert-item">
                <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></div>
                <div className="cert-label">Fully Insured</div>
              </div>
              <div className="cert-item">
                <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                <div className="cert-label">Bonded</div>
              </div>
            </div>

            {/* FAQ */}
            <div style={{background:'var(--warm-white)', border:'1px solid var(--light-gray)', borderRadius:'var(--radius-lg)', padding:'48px', marginTop:'64px'}}>
              <div style={{textAlign:'center', marginBottom:'40px'}}>
                <div className="label">Common Questions</div>
                <h3>What families usually ask</h3>
              </div>
              <div style={{maxWidth:'720px', margin:'0 auto'}}>
                <details style={{borderBottom:'1px solid var(--light-gray)', padding:'18px 0', cursor:'pointer'}}>
                  <summary style={{fontWeight:600, fontSize:'15px', listStyle:'none', display:'flex', justifyContent:'space-between'}}>What happens if my dog gets injured on a walk? <span style={{color:'var(--sage)'}}>+</span></summary>
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>We contact you immediately, administer first aid if needed, and transport to your designated vet or the nearest emergency clinic. Our insurance covers veterinary costs arising from walker negligence. We document everything and stay with your dog until you can be there.</p>
                </details>
                <details style={{borderBottom:'1px solid var(--light-gray)', padding:'18px 0', cursor:'pointer'}}>
                  <summary style={{fontWeight:600, fontSize:'15px', listStyle:'none', display:'flex', justifyContent:'space-between'}}>Will my dog always have the same walker? <span style={{color:'var(--sage)'}}>+</span></summary>
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>Yes, in the vast majority of cases. We assign a primary walker at onboarding and only introduce a backup walker (who you&apos;ll meet in advance) if your regular walker is unavailable. We never send an unknown person to your home.</p>
                </details>
                <details style={{borderBottom:'1px solid var(--light-gray)', padding:'18px 0', cursor:'pointer'}}>
                  <summary style={{fontWeight:600, fontSize:'15px', listStyle:'none', display:'flex', justifyContent:'space-between'}}>What are your vaccination requirements? <span style={{color:'var(--sage)'}}>+</span></summary>
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>All dogs must be current on Rabies, DHPP (distemper/parvo), and Bordetella vaccines. We require documentation at onboarding. This protects your dog, our walkers, and other dogs in our care.</p>
                </details>
                <details style={{borderBottom:'1px solid var(--light-gray)', padding:'18px 0', cursor:'pointer'}}>
                  <summary style={{fontWeight:600, fontSize:'15px', listStyle:'none', display:'flex', justifyContent:'space-between'}}>What&apos;s your cancellation policy? <span style={{color:'var(--sage)'}}>+</span></summary>
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>48-hour notice for individual walks, no charge. For boarding, we request 72-hour notice for full refunds. We understand life is unpredictable and handle edge cases with flexibility.</p>
                </details>
                <details style={{borderTop:'1px solid var(--light-gray)', padding:'18px 0', cursor:'pointer'}}>
                  <summary style={{fontWeight:600, fontSize:'15px', listStyle:'none', display:'flex', justifyContent:'space-between'}}>Why do you clean dogs&apos; paws after every walk? <span style={{color:'var(--sage)'}}>+</span></summary>
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>Dogs perspire through their mouth and feet, and outdoor debris such as rat poison, fertilizer, and construction materials can be harmful if left on paws. We clean every dog&apos;s paws thoroughly after every walk, regardless of weather conditions. It&apos;s a small step that protects your dog&apos;s health and keeps your home clean.</p>
                </details>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-safety */}

      {/* PAGE: NEIGHBORHOODS */}
      <div id="page-neighborhoods" className="page">
        <div className="page-hero" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/IMAGE 00005.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>Service Areas</div>
            <h1>Brooklyn is our<br />backyard</h1>
            <p>We serve six neighborhoods and know every park, shortcut, and puddle to avoid. Select your area below.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-neighborhoods"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Pepper · @pepper_bklyn</a>
        </div>

        <section className="section">
          <div className="container">
            <div className="grid-3" style={{gap:'24px'}}>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('williamsburg')} style={{aspectRatio:'1', position:'relative'}}>
                <div className="hood-card-img img-placeholder img-ph-1" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Williamsburg</div><div className="hood-card-desc">Our home since 2011</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('greenpoint')} style={{aspectRatio:'1', position:'relative'}}>
                <div className="hood-card-img img-placeholder img-ph-2" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Greenpoint</div><div className="hood-card-desc">McGolrick Park specialists</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('bushwick')} style={{aspectRatio:'1', position:'relative'}}>
                <div className="hood-card-img img-placeholder img-ph-3" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Bushwick</div><div className="hood-card-desc">Maria Hernandez routes</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('bedstuy')} style={{aspectRatio:'1', position:'relative'}}>
                <div className="hood-card-img img-placeholder img-ph-4" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Bed-Stuy</div><div className="hood-card-desc">Herbert Von King Park</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('park-slope')} style={{aspectRatio:'1', position:'relative'}}>
                <div className="hood-card-img img-placeholder img-ph-5" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Park Slope</div><div className="hood-card-desc">Prospect Park dog runs</div></div></div>
              </div>
              <div className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('east-williamsburg')} style={{aspectRatio:'1', position:'relative'}}>
                <div className="hood-card-img img-placeholder img-ph-1" style={{height:'100%', position:'absolute', inset:0, filter:'hue-rotate(60deg)'}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">East Williamsburg</div><div className="hood-card-desc">Expanding coverage</div></div></div>
              </div>
            </div>
          </div>
        </section>

        {/* Hidden neighborhood detail sections (shown via JS) */}
        <div id="hood-detail" style={{display:'none'}}>
          <section className="section bg-warm">
            <div className="container">
              <div id="hood-content"></div>
            </div>
          </section>
        </div>

      </div>{/* /page-neighborhoods */}

      {/* PAGE: REVIEWS */}
      <div id="page-reviews" className="page">
        <div className="page-hero bg-charcoal" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/IMAGE 00006.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>Client Reviews</div>
            <h1 style={{color:'white'}}>What Brooklyn<br />dog owners say</h1>
            <div className="reviews-hero-stats">
              <div>
                <div className="review-big-num">5.0</div>
                <div className="stars" style={{fontSize:'20px', marginTop:'4px'}}>★★★★★</div>
                <div className="review-source-label">Google Rating</div>
              </div>
              <div className="reviews-divider"></div>
              <div>
                <div className="review-big-num">5.0</div>
                <div className="stars" style={{fontSize:'20px', marginTop:'4px'}}>★★★★★</div>
                <div className="review-source-label">Yelp Rating · 34 Reviews</div>
              </div>
              <div className="reviews-divider"></div>
              <div>
                <div style={{fontFamily:'var(--font-display)', fontSize:'52px', color:'white', lineHeight:1}}>15</div>
                <div className="review-source-label" style={{marginTop:'4px'}}>Years of 5-star service</div>
              </div>
            </div>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-reviews"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Beans · @beans_wlmsbg</a>
        </div>

        <section className="section">
          <div className="container">
            <div className="reviews-masonry">
              <div className="review-card card-hover">
                <div className="review-mark">&quot;</div>
                <div className="stars">★★★★★</div>
                <p className="review-text">Luis and team are truly the best of the best. It&apos;s not easy to trust just anyone with our beloved fur baby, but Luis&apos;s professionalism and kindness combined with the GPS tracking he provides puts even the most nervous pet parent (me!!!) at ease.</p>
                <div className="review-author">
                  <div className="review-avatar"><div className="review-avatar-ph">JY</div></div>
                  <div><div className="review-name">Jessica Y.</div><div className="review-meta">Williamsburg · Yelp</div></div>
                </div>
              </div>
              <div className="review-card card-hover">
                <div className="review-mark">&quot;</div>
                <div className="stars">★★★★★</div>
                <p className="review-text">Luis is the guy you want your fur babies to be taken care of by. We have used him for over two years now and couldn&apos;t even begin to tell you how grateful we are to have him! He has saved us so many times with our busy work schedules. From their normal walk, we get text updates and pics every day. He&apos;s even helped us with the rehab of one of our dogs recovering from surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug. They won&apos;t disappoint.</p>
                <div className="review-author">
                  <div className="review-avatar"><div className="review-avatar-ph">JA</div></div>
                  <div><div className="review-name">Jayne A.</div><div className="review-meta">Williamsburg · Yelp</div></div>
                </div>
              </div>
              <div className="review-card card-hover">
                <div className="review-mark">&quot;</div>
                <div className="stars">★★★★★</div>
                <p className="review-text">Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own. He is also flexible and accommodating with schedule changes. Your dogs will be in great hands!</p>
                <div className="review-author">
                  <div className="review-avatar"><div className="review-avatar-ph">KT</div></div>
                  <div><div className="review-name">Kassie T.</div><div className="review-meta">Williamsburg · Yelp</div></div>
                </div>
              </div>
              <div className="review-card card-hover">
                <div className="review-mark">&quot;</div>
                <div className="stars">★★★★★</div>
                <p className="review-text">They were so awesome with my dog and super patient with me. Daily updates on how the walk went, cute photos, and the price is really nice for a longer walk duration. My dog LOVES Nuria!</p>
                <div className="review-author">
                  <div className="review-avatar"><div className="review-avatar-ph">HM</div></div>
                  <div><div className="review-name">Hayley M.</div><div className="review-meta">Williamsburg · Yelp</div></div>
                </div>
              </div>
            </div>

            <div style={{textAlign:'center', marginTop:'56px', padding:'40px', background:'var(--warm-white)', border:'1px solid var(--light-gray)', borderRadius:'var(--radius-lg)'}}>
              <div className="label">Leave a Review</div>
              <h3>Loved working with us?</h3>
              <p style={{color:'var(--mid-gray)', margin:'12px 0 28px'}}>Your review helps other Brooklyn dog owners find trustworthy care — and it means the world to our team.</p>
              <div style={{display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap'}}>
                <a className="btn btn-primary" href="https://share.google/xbrJjkZt4eoHUOxBl" target="_blank" rel="noopener">Review on Google</a>
                <a className="btn btn-outline" href="https://www.yelp.com/biz/not-the-rug-brooklyn-8" target="_blank" rel="noopener">Review on Yelp</a>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-reviews */}

      {/* PAGE: BOOK */}
      <div id="page-book" className="page">
        <div className="book-hero" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/IMAGE 00007.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>Get Started</div>
            <h1>Book your free<br />Meet &amp; Greet</h1>
            <p>No commitment, no charge. We come to you, meet your dog, and answer every question.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-book"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Noodle · @noodle_bklyn</a>
        </div>

        <section className="section">
          <div className="container">
            <div className="booking-form-wrap">
              <div className="booking-form">
                <div className="booking-form-tabs">
                  <div className="booking-tab active" onClick={(e) => (window as any).switchBookTab(e.currentTarget, 'tab-meetgreet')}>Free Meet &amp; Greet</div>
                  <div className="booking-tab" onClick={(e) => (window as any).switchBookTab(e.currentTarget, 'tab-service')}>Book a Service</div>
                  <div className="booking-tab" onClick={(e) => (window as any).switchBookTab(e.currentTarget, 'tab-contact')}>Ask a Question</div>
                </div>
                <div className="booking-form-body">
                  {/* Meet & Greet Tab */}
                  <div id="tab-meetgreet">
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Let&apos;s meet your dog</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Fill this out and we&apos;ll reach out within 2 hours on weekdays to schedule your free visit.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Your Name</label>
                        <input type="text" className="form-control" placeholder="First & last name" />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel" className="form-control" placeholder="(347) 000-0000" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" className="form-control" placeholder="you@email.com" />
                      </div>
                      <div className="form-group">
                        <label>Neighborhood</label>
                        <select className="form-control form-select">
                          <option>Williamsburg</option>
                          <option>Greenpoint</option>
                          <option>Bushwick</option>
                          <option>Bed-Stuy</option>
                          <option>Park Slope</option>
                          <option>East Williamsburg</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Dog&apos;s Name</label>
                        <input type="text" className="form-control" placeholder="What's their name?" />
                      </div>
                      <div className="form-group">
                        <label>Breed &amp; Age</label>
                        <input type="text" className="form-control" placeholder="e.g. Golden, 3 years" />
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:'20px'}}>
                      <label>Service Interested In</label>
                      <select className="form-control form-select">
                        <option>Daily Group Walks</option>
                        <option>Walk + Training Sessions</option>
                        <option>Puppy Visits</option>
                        <option>Senior Dog Care</option>
                        <option>Boarding / Sitting</option>
                        <option>Not sure yet</option>
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:'24px'}}>
                      <label>Anything we should know?</label>
                      <textarea className="form-control" rows={3} placeholder="Quirks, anxieties, medication needs, building access info — anything helpful"></textarea>
                    </div>
                    <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'16px'}} onClick={() => alert('✅ Form submitted! In a live site, this connects to Time To Pet or your CRM.')}>Request My Free Meet &amp; Greet</button>
                    <p className="form-note">We respond within 2 hours Mon–Fri · No spam, ever · Your info stays private</p>
                  </div>

                  {/* Service Booking Tab */}
                  <div id="tab-service" style={{display:'none'}}>
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Book a service</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Existing clients can book below. New clients — please start with a Meet &amp; Greet.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Service Type</label>
                        <select className="form-control form-select">
                          <option>Group Walk ($33/walk)</option>
                          <option>Solo Walk + Training ($60)</option>
                          <option>Puppy Visit ($35)</option>
                          <option>Senior Visit ($25)</option>
                          <option>Boarding ($100/night)</option>
                          <option>Cat Visit ($30)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Preferred Date</label>
                        <input type="date" className="form-control" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Preferred Time</label>
                        <select className="form-control form-select">
                          <option>Morning (8–10 AM)</option>
                          <option>Late Morning (10 AM–12 PM)</option>
                          <option>Midday (12–2 PM)</option>
                          <option>Afternoon (2–5 PM)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Number of Dogs</label>
                        <select className="form-control form-select">
                          <option>1 dog</option>
                          <option>2 dogs (same household)</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:'24px'}}>
                      <label>Your Email</label>
                      <input type="email" className="form-control" placeholder="For confirmation" />
                    </div>
                    <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'16px'}} onClick={() => alert('✅ In a live site, this connects to Time To Pet booking system (Phase 1 integration).')}>Request Booking</button>
                    <div className="phase-callout" style={{marginTop:'24px', padding:'24px'}}>
                      <div className="phase-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                      <div>
                        <div className="phase-tag">Phase 1 Roadmap</div>
                        <h4 style={{fontSize:'17px'}}>Online Booking Integration</h4>
                        <p style={{fontSize:'13px'}}>We&apos;re integrating Time To Pet for real-time availability, instant confirmation, and automated reminders. Live within 30 days of site launch.</p>
                      </div>
                    </div>
                  </div>

                  {/* Ask a question Tab */}
                  <div id="tab-contact" style={{display:'none'}}>
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Get in touch</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Have a specific situation or question? Send us a message and we&apos;ll reply personally.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Your Name</label>
                        <input type="text" className="form-control" placeholder="Name" />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-control" placeholder="Email" />
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:'20px'}}>
                      <label>Subject</label>
                      <select className="form-control form-select">
                        <option>General inquiry</option>
                        <option>Pricing question</option>
                        <option>My dog has special needs</option>
                        <option>Coverage area question</option>
                        <option>Team / employment</option>
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:'24px'}}>
                      <label>Message</label>
                      <textarea className="form-control" rows={4} placeholder="Tell us what's on your mind..."></textarea>
                    </div>
                    <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'16px'}} onClick={() => alert('✅ Message sent!')}>Send Message</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase roadmap */}
            <div style={{maxWidth:'700px', margin:'64px auto 0'}}>
              <div style={{textAlign:'center', marginBottom:'36px'}}>
                <div className="label">Website Roadmap</div>
                <h3>What&apos;s coming next</h3>
                <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'8px'}}>We&apos;re building this site in phases to launch fast and improve continuously.</p>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                <div style={{background:'var(--sage-dark)', color:'white', borderRadius:'var(--radius)', padding:'24px 28px', display:'flex', gap:'20px', alignItems:'flex-start'}}>
                  <div style={{background:'rgba(255,255,255,0.15)', borderRadius:'8px', padding:'8px 14px', fontWeight:700, fontSize:'13px', whiteSpace:'nowrap'}}>Phase 1 · Now</div>
                  <div>
                    <div style={{fontWeight:600, marginBottom:'4px'}}>New Website Launch</div>
                    <div style={{fontSize:'13px', opacity:.75}}>Brand refresh, service pages, neighborhood SEO, contact forms, Yelp/Google review integration</div>
                  </div>
                </div>
                <div style={{background:'var(--warm-white)', border:'1px solid var(--light-gray)', borderRadius:'var(--radius)', padding:'24px 28px', display:'flex', gap:'20px', alignItems:'flex-start'}}>
                  <div style={{background:'var(--gold-light)', color:'#7A5A20', borderRadius:'8px', padding:'8px 14px', fontWeight:700, fontSize:'13px', whiteSpace:'nowrap'}}>Phase 2 · 30 days</div>
                  <div>
                    <div style={{fontWeight:600, marginBottom:'4px'}}>Online Booking Integration</div>
                    <div style={{fontSize:'13px', color:'var(--mid-gray)'}}>Time To Pet integration: real-time availability, client portal, automated invoicing, walk reports</div>
                  </div>
                </div>
                <div style={{background:'var(--warm-white)', border:'1px solid var(--light-gray)', borderRadius:'var(--radius)', padding:'24px 28px', display:'flex', gap:'20px', alignItems:'flex-start'}}>
                  <div style={{background:'var(--light-gray)', color:'var(--mid-gray)', borderRadius:'8px', padding:'8px 14px', fontWeight:700, fontSize:'13px', whiteSpace:'nowrap'}}>Phase 3 · 90 days</div>
                  <div>
                    <div style={{fontWeight:600, marginBottom:'4px'}}>Client Mobile App</div>
                    <div style={{fontSize:'13px', color:'var(--mid-gray)'}}>Live GPS during walks, push notifications, in-app messaging, subscription management</div>
                  </div>
                </div>
                <div style={{background:'var(--warm-white)', border:'1px solid var(--light-gray)', borderRadius:'var(--radius)', padding:'24px 28px', display:'flex', gap:'20px', alignItems:'flex-start'}}>
                  <div style={{background:'var(--light-gray)', color:'var(--mid-gray)', borderRadius:'8px', padding:'8px 14px', fontWeight:700, fontSize:'13px', whiteSpace:'nowrap'}}>Phase 4 · 6 months</div>
                  <div>
                    <div style={{fontWeight:600, marginBottom:'4px'}}>Loyalty &amp; Referral Program</div>
                    <div style={{fontSize:'13px', color:'var(--mid-gray)'}}>Walk rewards points, referral credits, subscription discounts, anniversary milestones</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-book */}

      {/* PAGE: CONTACT */}
      <div id="page-contact" className="page">
        <div className="page-hero" style={{background:"linear-gradient(rgba(28,28,26,0.60), rgba(28,28,26,0.60)), url('dogs/Screenshot 2026-03-23 at 8.41.59 AM.png') center 20%/cover no-repeat"}}>
          <div className="container">
            <div className="label" style={{color:'var(--sage-light)'}}>Get In Touch</div>
            <h1>We&apos;re real people<br />with a real number</h1>
            <p>No chatbots, no ticket queues. Text us, call us, or fill out the form.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-contact"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Archie · @archie_bklyn</a>
        </div>

        <section className="section">
          <div className="container">
            <div className="grid-2" style={{gap:'56px', alignItems:'flex-start'}}>
              <div>
                <div className="contact-card">
                  <div className="contact-method">
                    <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                    <div>
                      <h4>Call or Text</h4>
                      <p>The fastest way to reach us. Luis personally responds to all messages.</p>
                      <a href="tel:+13476109676" style={{display:'block', marginTop:'10px'}}>(347) 610-9676</a>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                    <div>
                      <h4>Email</h4>
                      <p>For less urgent inquiries, new client intake, or detailed questions.</p>
                      <a href="mailto:luis@nottherug.com" style={{display:'block', marginTop:'10px'}}>luis@nottherug.com</a>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                    <div>
                      <h4>Service Area</h4>
                      <p>We&apos;re based in Williamsburg and serve Greenpoint, Bushwick, Bed-Stuy, Park Slope, and East Williamsburg.</p>
                      <p style={{marginTop:'8px', fontSize:'13px', color:'var(--mid-gray)'}}>281 N 7th St, Ste 13, Brooklyn, NY 11211<br />b/t Havemeyer St &amp; Meeker Ave · Williamsburg North Side</p>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                    <div>
                      <h4>Response Hours</h4>
                      <p>Mon–Fri, 8 AM–7 PM · Sat–Sun, 9 AM–5 PM</p>
                      <p style={{marginTop:'4px', fontSize:'13px', color:'var(--mid-gray)'}}>Typically reply within 2 hours on weekdays</p>
                    </div>
                  </div>
                </div>

                <div style={{background:'var(--charcoal)', borderRadius:'var(--radius-lg)', padding:'32px', marginTop:'24px', color:'white'}}>
                  <div style={{marginBottom:'12px'}}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
                  <h4 style={{fontFamily:'var(--font-display)', fontSize:'20px', marginBottom:'8px', color:'white'}}>Follow us on Instagram</h4>
                  <p style={{color:'rgba(255,255,255,0.6)', fontSize:'14px', marginBottom:'16px'}}>Daily walk photos, dog spotlights, neighborhood content, and the occasional chaos.</p>
                  <a href="https://www.instagram.com/nottherug/" target="_blank" className="btn btn-outline-white btn-sm" style={{display:'inline-flex'}}>@nottherug</a>
                </div>
              </div>

              <div>
                <div className="label">Send a Message</div>
                <h3 style={{marginBottom:'24px'}}>Tell us about your dog</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Your Name</label>
                      <input type="text" className="form-control" placeholder="Name" />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="tel" className="form-control" placeholder="Phone" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-control" placeholder="Email" />
                  </div>
                  <div className="form-group">
                    <label>Neighborhood</label>
                    <select className="form-control form-select">
                      <option>Williamsburg</option>
                      <option>Greenpoint</option>
                      <option>Bushwick</option>
                      <option>Bed-Stuy</option>
                      <option>Park Slope</option>
                      <option>East Williamsburg</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea className="form-control" rows={5} placeholder="Tell us about your dog and what you're looking for..."></textarea>
                  </div>
                  <button className="btn btn-primary" style={{justifyContent:'center'}} onClick={() => alert("✅ Message sent! We'll be in touch within 2 hours.")}>Send Message</button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /page-contact */}

      {/* FOOTER */}
      <footer id="main-footer">
        <div className="container">
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
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }}>Group Walks</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }}>Walk + Training</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }}>Puppy Visits</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }}>Senior Dog Care</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }}>Boarding</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }}>Monthly Plans</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Neighborhoods</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('williamsburg'); }}>Williamsburg</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('greenpoint'); }}>Greenpoint</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('bushwick'); }}>Bushwick</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('bedstuy'); }}>Bed-Stuy</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('park-slope'); }}>Park Slope</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('east-williamsburg'); }}>East Williamsburg</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('about'); }}>About Us</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('how-it-works'); }}>How It Works</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('safety'); }}>Safety &amp; Trust</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('reviews'); }}>Reviews</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('contact'); }}>Contact</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('book'); }}>Book a Walk</a></li>
              </ul>
            </div>
          </div>
          <div id="footer-newsletter-shell" style={{borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'32px', marginBottom:'32px', textAlign:'center'}}>
            <h4 style={{fontFamily:'var(--font-body)', fontSize:'14px', fontWeight:500, color:'rgba(255,255,255,0.55)', marginBottom:'8px'}}>Stay In Touch</h4>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'16px', maxWidth:'320px', marginLeft:'auto', marginRight:'auto'}}>Subscribe for dog care tips, neighborhood news, and Not The Rug updates.</p>
            <div style={{display:'flex', gap:'8px', maxWidth:'360px', margin:'0 auto'}}>
              <input type="email" placeholder="Your email address" style={{flex:1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'white', padding:'10px 14px', borderRadius:'6px', fontSize:'14px', fontFamily:'var(--font-body)'}} />
              <button className="btn btn-primary btn-sm" style={{whiteSpace:'nowrap'}} onClick={() => alert("✅ Subscribed! (Newsletter integration needed before launch)")}>Subscribe</button>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St &amp; Meeker Ave · All rights reserved</div>
            <div style={{display:'flex', gap:'24px'}}>
              <a href="#" style={{fontSize:'13px', color:'rgba(255,255,255,0.35)'}}>Privacy</a>
              <a href="#" style={{fontSize:'13px', color:'rgba(255,255,255,0.35)'}}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
