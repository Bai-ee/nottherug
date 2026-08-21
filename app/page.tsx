'use client';

import { useEffect, useRef, useState } from 'react';
import MeetGreetForm from '../components/MeetGreetForm';
import AnimatedServiceCards from '../components/AnimatedServiceCards';

// Large, washed-out background watermark print — points right (base rotate
// 90deg turns the glyph's toes-up orientation into toes-right), scattered in
// a loose two-row zigzag rather than one straight inline row. The wrapper
// div is what GSAP animates (position/opacity); the svg's own rotate stays
// static so the two transforms never fight each other.
function PawTrailPrint({ left, top, rotate, size, opacity }: { left: string; top: string; rotate: number; size: number; opacity: number }) {
  return (
    <div className="hiw-paw-print" style={{ left, top }}>
      <svg className="hiw-paw" viewBox="0 0 40 40" width={size} height={size} fill="currentColor"
        style={{ transform: `rotate(${rotate}deg)`, opacity }} aria-hidden="true">
        <ellipse cx="20" cy="27" rx="10" ry="8" />
        <ellipse cx="10" cy="14" rx="4" ry="5" transform="rotate(-15 10 14)" />
        <ellipse cx="18" cy="8" rx="4.5" ry="5.5" />
        <ellipse cx="27" cy="9" rx="4.5" ry="5.5" transform="rotate(10 27 9)" />
        <ellipse cx="33" cy="17" rx="4" ry="5" transform="rotate(25 33 17)" />
      </svg>
    </div>
  );
}

// ---- Paw-trail tuning (temporary dev overlay — see #hiw-paw-tuning-panel) ----
const PAW_TUNING_STORAGE_KEY = 'ntr-hiw-paw-trail-settings-v1';

type PawSettings = {
  opacity: number; size: number; baseRotation: number; rotationVariance: number;
  startX: number; spreadX: number; rowTop: number; rowBottom: number;
};
type RevealSettings = {
  pawDuration: number; pawStagger: number; pawEase: string; pawDistanceX: number;
  copyDelay: number; copyDuration: number; copyStagger: number; copyEase: string; copyDistanceY: number;
};
type HideSettings = { pawDuration: number; copyDuration: number; ease: string };

const DEFAULT_PAW_SETTINGS: PawSettings = {
  opacity: 0.4, size: 140, baseRotation: 90, rotationVariance: 6,
  startX: 4, spreadX: 79, rowTop: 12, rowBottom: 56,
};
const DEFAULT_REVEAL_SETTINGS: RevealSettings = {
  pawDuration: 0.7, pawStagger: 0.32, pawEase: 'power2.out', pawDistanceX: 36,
  copyDelay: 0.2, copyDuration: 0.5, copyStagger: 0.22, copyEase: 'power3.out', copyDistanceY: 16,
};
const DEFAULT_HIDE_SETTINGS: HideSettings = { pawDuration: 0.4, copyDuration: 0.35, ease: 'power3.out' };

const EASE_OPTIONS = [
  { value: 'power1.out', label: 'power1.out' },
  { value: 'power2.out', label: 'power2.out' },
  { value: 'power3.out', label: 'power3.out' },
  { value: 'sine.out', label: 'sine.out' },
  { value: 'back.out(1.4)', label: 'back.out(1.4)' },
];

function pawPosition(paw: PawSettings, i: number) {
  const left = paw.startX + (paw.spreadX * i) / 3;
  const top = i % 2 === 0 ? paw.rowTop : paw.rowBottom;
  const rotate = paw.baseRotation + (i % 2 === 0 ? -paw.rotationVariance : paw.rotationVariance);
  return { left, top, rotate };
}

function TuneSlider({ id, label, value, min, max, step, unit, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--charcoal)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--mid-gray)' }}>{value}{unit}</span>
      </span>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--sage-dark)' }} />
    </label>
  );
}

function TuneSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--charcoal)' }}>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(36,35,33,0.2)', fontSize: 13, width: '100%' }}>
        {EASE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}

function TuneSectionLabel({ children }: { children: string }) {
  return <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--charcoal)', marginTop: 4 }}>{children}</div>;
}

export default function Home() {
  const [pawSettings, setPawSettings] = useState<PawSettings>(DEFAULT_PAW_SETTINGS);
  const [revealSettings, setRevealSettings] = useState<RevealSettings>(DEFAULT_REVEAL_SETTINGS);
  const [hideSettings, setHideSettings] = useState<HideSettings>(DEFAULT_HIDE_SETTINGS);
  const [showPawTuning, setShowPawTuning] = useState(false);
  const revealSettingsRef = useRef(revealSettings);
  const hideSettingsRef = useRef(hideSettings);

  useEffect(() => { revealSettingsRef.current = revealSettings; }, [revealSettings]);
  useEffect(() => { hideSettingsRef.current = hideSettings; }, [hideSettings]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PAW_TUNING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPawSettings({ ...DEFAULT_PAW_SETTINGS, ...parsed.paw });
        setRevealSettings({ ...DEFAULT_REVEAL_SETTINGS, ...parsed.reveal });
        setHideSettings({ ...DEFAULT_HIDE_SETTINGS, ...parsed.hide });
      }
    } catch {
      /* ignore malformed saved settings */
    }
  }, []);

  // Reveal/hide timing changes take effect on the next play()/hide() call (read
  // from the refs above). Distance changes also need the *resting* hidden state
  // refreshed immediately, or the next reveal would start from a stale offset.
  useEffect(() => {
    (window as any).resetHowItWorksPawsHidden?.();
  }, [revealSettings.pawDistanceX, revealSettings.copyDistanceY]);

  const updatePaw = (field: keyof PawSettings, value: number) =>
    setPawSettings((prev) => ({ ...prev, [field]: value }));
  const updateReveal = (field: keyof RevealSettings, value: number | string) =>
    setRevealSettings((prev) => ({ ...prev, [field]: value }));
  const updateHide = (field: keyof HideSettings, value: number | string) =>
    setHideSettings((prev) => ({ ...prev, [field]: value }));

  const savePawTuningAsDefault = () =>
    window.localStorage.setItem(PAW_TUNING_STORAGE_KEY, JSON.stringify({ paw: pawSettings, reveal: revealSettings, hide: hideSettings }));
  const resetPawTuning = () => {
    setPawSettings(DEFAULT_PAW_SETTINGS);
    setRevealSettings(DEFAULT_REVEAL_SETTINGS);
    setHideSettings(DEFAULT_HIDE_SETTINGS);
    window.localStorage.removeItem(PAW_TUNING_STORAGE_KEY);
  };

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
          .to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' }, '-=0.4')
          .to(words,          { y: '0%', duration: 0.88, stagger: 0.065 }, '-=0.35')
          .addLabel('afterHeadline')
          .to('.hero-p',      { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.65')
          .to('.hero-actions',{ autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.5')
          .to('.hero-stats',  { autoAlpha: 1, y: 0, duration: 0.7 }, 'afterHeadline+=0.25');
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
      let careScrollMM: ReturnType<typeof gsap.matchMedia> | null = null;

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
          onEnter:     () => { gsap.to('#main-nav', { boxShadow: '0 2px 32px rgba(0,0,0,0.09)', duration: 0.3 }); document.getElementById('main-nav')?.classList.add('nav-scrolled'); },
          onLeaveBack: () => { gsap.to('#main-nav', { boxShadow: '0 0 0 rgba(0,0,0,0)',          duration: 0.3 }); document.getElementById('main-nav')?.classList.remove('nav-scrolled'); }
        });
      }

      function initSectionReveals(pageEl: HTMLElement) {
        if (prefersReducedMotion || !pageEl) return;

        const cardSel = [
          // :not() excludes the restored simple cards inside the personalized-
          // care product row — that row has its own dedicated horizontal-scrub
          // reveal (initPersonalizedCareScroll); this generic vertical
          // fade-up would otherwise double up on top of it.
          '.service-card:not(#home-animated-products-grid .service-card)', '.review-card', '.hood-card',
          '.trust-card', '.pricing-card', '.team-card', '.value-cell',
          '.process-step', '.cta-band', '.contact-card', '.package-tier',
          '.booking-form', '.phase-callout'
        ].join(',');

        const headingSel = [
          // :not() — card labels (h3 inside .service-card) must not get their
          // own reveal; they'd animate separately on top of the card reveal.
          '.section h2', '.section h3:not(.service-card h3)', '.section .label',
          '.page-hero h1', '.page-hero p', '.book-hero h1', '.book-hero p'
        ].join(',');

        const headings = Array.from(pageEl.querySelectorAll(headingSel));
        const cards    = Array.from(pageEl.querySelectorAll(cardSel));

        if (headings.length) {
          gsap.set(headings, { autoAlpha: 0, y: 26 });
          ScrollTrigger.batch(headings, {
            onEnter:     batch => gsap.to(batch, { autoAlpha: 1, y: 0,  duration: 0.7, stagger: 0.06, ease: 'power3.out', overwrite: true }),
            onEnterBack: batch => gsap.to(batch, { autoAlpha: 1, y: 0,  duration: 0.7, stagger: 0.06, ease: 'power3.out', overwrite: true }),
            onLeave:     batch => gsap.to(batch, { autoAlpha: 0, y: 26, duration: 0.4, stagger: 0.04, ease: 'power3.out', overwrite: true }),
            onLeaveBack: batch => gsap.to(batch, { autoAlpha: 0, y: 26, duration: 0.4, stagger: 0.04, ease: 'power3.out', overwrite: true }),
            start: 'top 90%',
            end: 'bottom top'
          });
        }

        if (cards.length) {
          gsap.set(cards, { autoAlpha: 0, y: 52 });
          ScrollTrigger.batch(cards, {
            onEnter:     batch => gsap.to(batch, { autoAlpha: 1, y: 0,  duration: 0.85, stagger: 0.085, ease: 'power3.out', overwrite: true }),
            onEnterBack: batch => gsap.to(batch, { autoAlpha: 1, y: 0,  duration: 0.85, stagger: 0.085, ease: 'power3.out', overwrite: true }),
            onLeave:     batch => gsap.to(batch, { autoAlpha: 0, y: 52, duration: 0.4,  stagger: 0.05,  ease: 'power3.out', overwrite: true }),
            onLeaveBack: batch => gsap.to(batch, { autoAlpha: 0, y: 52, duration: 0.4,  stagger: 0.05,  ease: 'power3.out', overwrite: true }),
            start: 'top 88%',
            end: 'bottom top'
          });
        }
      }

      // Paw-print trail: the four large background watermark prints (left to
      // right, in DOM/left% order) fade + drift in from the left as if an
      // unseen dog walked across the section; each step's description follows
      // shortly after the print nearest it. Reverses the same way scrolling away.
      function initHowItWorksSteps() {
        if (prefersReducedMotion) return;
        const paws   = Array.from(document.querySelectorAll('#home-how-it-works-paw-trail .hiw-paw-print'));
        const copies = Array.from(document.querySelectorAll('#home-how-it-works-steps .hiw-step-copy'));
        if (!paws.length && !copies.length) return;

        // Timing/ease read from the refs (kept fresh by the tuning sliders) on
        // every call, not just at setup — so a slider drag affects the very
        // next Replay/scroll-trigger without needing to recreate the trigger.
        function resetHidden() {
          const r = revealSettingsRef.current;
          gsap.set(paws, { autoAlpha: 0, x: -r.pawDistanceX });
          gsap.set(copies, { autoAlpha: 0, y: r.copyDistanceY });
        }
        resetHidden();

        function play() {
          const r = revealSettingsRef.current;
          gsap.timeline({ defaults: { overwrite: true } })
            .to(paws,   { autoAlpha: 1, x: 0, duration: r.pawDuration, ease: r.pawEase, stagger: r.pawStagger }, 0)
            .to(copies, { autoAlpha: 1, y: 0, duration: r.copyDuration, ease: r.copyEase, stagger: r.copyStagger }, r.copyDelay);
        }
        function hide() {
          const r = revealSettingsRef.current;
          const h = hideSettingsRef.current;
          gsap.to(paws,   { autoAlpha: 0, x: -r.pawDistanceX, duration: h.pawDuration, ease: h.ease, overwrite: true });
          gsap.to(copies, { autoAlpha: 0, y: r.copyDistanceY,  duration: h.copyDuration, ease: h.ease, overwrite: true });
        }

        ScrollTrigger.create({
          trigger: '#home-how-it-works-steps',
          start: 'top 85%',
          end: 'bottom top',
          onEnter: play,
          onEnterBack: play,
          onLeave: hide,
          onLeaveBack: hide
        });

        (window as any).replayHowItWorksPaws = () => { hide(); setTimeout(play, 120); };
        (window as any).resetHowItWorksPawsHidden = resetHidden;
      }

      // Horizontal product row — a direct port of GSAP's own reference
      // implementation (codepen.io/GreenSock/pen/dydpJzY, "Horizontal
      // scrolling gallery - ScrollTrigger"), minus its ScrollSmoother (a paid
      // Club plugin this project doesn't license). The reference's core is
      // exactly four things, and this keeps all four:
      //
      //   1. pin the gallery wrapper (here: the clipping scroll-window),
      //   2. tween the strip inside it to x: -horizontalScrollLength,
      //   3. ease:'none' + scrub:true so scroll px map 1:1 to horizontal px,
      //   4. recompute that length on every ScrollTrigger refreshInit.
      //
      // The pinned element is #home-personalized-care-pin-stage: a wrapper
      // that is exactly one viewport tall and carries this section's
      // background. Pinning the element that owns the background is what makes
      // the background sit perfectly still for the whole pin — pin an inner
      // wrapper instead and the section keeps scrolling behind the frozen row,
      // so the background drifts. Being a full viewport tall matters just as
      // much: while pinned it covers the entire screen, so there is no
      // unpinned strip of section visible above or below it to give the
      // freeze away.
      //
      // This section has no heading of its own by design — it flows straight
      // out of the Williamsburg trust section above into the carousel — so the
      // stage holds nothing but the clipped row, and there's no reveal-driven
      // element trapped inside the pin. (That matters: a scroll reveal whose
      // trigger sits inside a pinned element fades out mid-pin, because its
      // start/end are measured from its unpinned position.)
      //
      // `end` is horizontalScrollLength (the actual overflow), not the
      // reference's full track width: a 1:1 ratio means the pin reserves
      // exactly as much extra page height as there is row to travel, so
      // nothing below the section gets pushed down by invented dead space.
      //
      // Scroll position is the single source of truth for the row's x. The
      // ScrollTrigger instance is exposed on window so AnimatedServiceCards'
      // arrows/dots/drag can scrollTo the matching position rather than
      // animating x themselves — two systems writing the same transform was
      // what broke earlier versions.
      //
      // Desktop only: mobile keeps the plain single-column .services-grid
      // stack (globals.css, max-width:768px), no pin or carousel there.
      function initPersonalizedCareScroll() {
        careScrollMM?.revert();
        careScrollMM = gsap.matchMedia();

        careScrollMM.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
          const stage = document.getElementById('home-personalized-care-pin-stage');
          const clipWin = document.getElementById('home-personalized-care-scroll-window');
          const track = document.getElementById('home-animated-products-grid');
          if (!stage || !clipWin || !track) return;

          gsap.set(track, { x: 0 });

          let horizontalScrollLength = 0;
          function refresh() {
            horizontalScrollLength = Math.max(0, track!.scrollWidth - clipWin!.clientWidth);
          }
          refresh();

          // Row already fits — pinning would freeze the page for zero payoff.
          if (horizontalScrollLength <= 0) return;

          const tween = gsap.to(track, {
            x: () => -horizontalScrollLength,
            ease: 'none',
            scrollTrigger: {
              trigger: stage,
              pin: stage,
              // The stage is exactly one viewport tall, so pinning it at the
              // very top of the viewport makes it cover the screen edge to
              // edge for the whole pin — that's what keeps its background
              // looking locked, with no unpinned strip visible above or below.
              start: 'top top',
              end: () => `+=${horizontalScrollLength}`,
              scrub: true,
              invalidateOnRefresh: true,
              // No anticipatePin: it engages the pin early based on scroll
              // velocity, which shifts the stage (and so its background) by a
              // few px right at the hand-off. The reference doesn't use it and
              // the background has to look dead still from the first frame.
              // HIGHER refreshPriority = refreshed EARLIER (verified against
              // this GSAP build, not assumed). This pin adds ~1061px of page
              // height, so its spacer has to be in place before
              // initSectionReveals' batch triggers (default priority 0)
              // measure the sections below it. Without this, every reveal
              // below the carousel — the whole reviews section, the CTA band,
              // the footer cards — computed a start ~1061px too early and sat
              // invisible while its section was plainly on screen.
              refreshPriority: 1,
            }
          });

          ScrollTrigger.addEventListener('refreshInit', refresh);
          (window as any).personalizedCareScrollTrigger = tween.scrollTrigger;

          return () => {
            ScrollTrigger.removeEventListener('refreshInit', refresh);
            delete (window as any).personalizedCareScrollTrigger;
            gsap.set(track, { clearProps: 'transform' });
          };
        });

        // Everything on the page has been created by now; this re-measures
        // them all in refreshPriority order with the pin spacer in place.
        ScrollTrigger.refresh();

        // …and once more after the last image lands. The simple cards' icons
        // carry no intrinsic size, so a late decode can still change the row's
        // width — which is exactly the number the pin distance is derived
        // from. Refreshing on load keeps the pin, and every trigger below it,
        // measured against the final layout instead of a mid-load one.
        if (document.readyState === 'complete') {
          ScrollTrigger.refresh();
        } else {
          window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
        }
      }

      function pageTransitionIn(pageEl: HTMLElement) {
        if (prefersReducedMotion) return;
        gsap.fromTo(pageEl,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out',
            // y settles to 0 but the transform property itself stays on the
            // element — a transformed ancestor makes position:fixed/absolute
            // descendants (ScrollTrigger pins, portal-toggle buttons) resolve
            // against IT instead of the viewport. Clear it once the tween lands.
            onComplete: () => { gsap.set(pageEl, { clearProps: 'transform' }); },
          }
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
            setTimeout(() => initHowItWorksSteps(), 420);
            setTimeout(() => initPersonalizedCareScroll(), 420);
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
              <a href="/book" class="btn btn-primary">Book a Walk in ${data.name}</a>
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

      const params = new URLSearchParams(window.location.search);
      const hoodParam = params.get('hood');
      const pageParam = params.get('page');
      if (hoodParam && hoodData[hoodParam]) {
        showNeighborhood(hoodParam);
      } else if (pageParam && pages.includes(pageParam)) {
        showPage(pageParam);
      } else {
        showPage('home');
      }
    })();
  }, []);

  return (
    <>
      {/* NAVIGATION */}
      <nav id="main-nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => (window as any).showPage('home')}>
            <img id="nav-logo-img" src="/img/horiz_logo_off_white.png" alt="Not The Rug" />
          </div>
          <div className="nav-links">
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }} data-page="services">Services &amp; Rates</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('how-it-works'); }} data-page="how-it-works">How It Works</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('about'); }} data-page="about">About Us</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('safety'); }} data-page="safety">Safety &amp; Trust</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('williamsburg'); }} data-page="neighborhoods">Williamsburg</a>
            <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('reviews'); }} data-page="reviews">Reviews</a>
            <a href="/admin" id="nav-admin-login-link">Login</a>
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.href='/book'; }} className="nav-cta" data-page="book">Book a Walk</a>
          </div>
          <div className="nav-hamburger" onClick={() => (window as any).toggleMobileMenu()}>
            <span></span><span></span><span></span>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className="mobile-menu" id="mobile-menu">
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('services'); }}>Services &amp; Rates</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('how-it-works'); }}>How It Works</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('about'); }}>About Us</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('safety'); }}>Safety &amp; Trust</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('williamsburg'); }}>Williamsburg</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('reviews'); }}>Reviews</a>
        <a href="#" onClick={(e) => { e.preventDefault(); (window as any).showPage('contact'); }}>Contact</a>
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.href='/book'; }} className="mobile-cta">Book a Walk</a>
        <a href="/admin" id="mobile-menu-login-link">Login</a>
      </div>

      {/* Fixed circular brand seal, bottom-right of the viewport. Deliberately
          a sibling of #page-home (like <nav> above), NOT nested inside it:
          #page-home carries a leftover inline transform from the page-transition
          tween (clears async, on a timer — see pageTransitionIn) which,
          for as long as it's non-none, makes it the containing block for any
          position:fixed descendant instead of the viewport. Siblings of
          #page-home aren't affected by that at all, so this never depends on
          the clear having already run. Visibility (home only) is handled in
          CSS via #home-floating-logo-badge's :has() selector instead of DOM
          nesting. Same asset as the hero polaroid's badge. */}
      <img id="home-floating-logo-badge" src="/logos/notRugGreen.png" alt="Not The Rug NYC dog walking" />

      {/* PAGE: HOME */}
      <div id="page-home" className="page active">

        {/* Hero */}
        <section className="hero">
          <div className="hero-visual" id="hero-visual-video-shell">
            <figure className="polaroid polaroid-tilt-right taped taped-center" id="hero-polaroid-frame">
              <div className="polaroid-window" id="hero-polaroid-window">
                <video id="hero-bg-video" autoPlay muted loop playsInline preload="auto">
                  <source src="logos/Not_The_Rug_2023_clipped_web.webm" type="video/webm" />
                  <source src="logos/Not_The_Rug_2023_clipped_web.mp4" type="video/mp4" />
                </video>
              </div>
              <figcaption className="polaroid-caption" id="hero-polaroid-caption"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> McCarren Park, Williamsburg</figcaption>
              <img className="polaroid-badge" id="hero-polaroid-badge" src="/logos/notRugGreen.png" alt="Not The Rug NYC dog walking badge" />
            </figure>
          </div>
          <div className="hero-content" id="hero-content-shell">
            <div className="hero-eyebrow" id="hero-eyebrow-stamp-row">
              <span className="stamp-label" id="hero-stamp-label">Williamsburg, Brooklyn &middot; Est. 2011</span>
            </div>
            <h1 className="hero-h1">Your dog deserves<br /><em>someone they know.</em></h1>
            <p className="hero-p">Not The Rug is Williamsburg&apos;s most trusted dog walking service. No strangers. No first-time handlers. Just experienced professionals who show up consistently. Because peace of mind starts with knowing exactly who&apos;s holding the leash.</p>
            <div className="hero-actions" id="hero-actions-row">
              <button className="btn btn-primary" id="hero-cta-primary" onClick={() => window.location.href='/book'}>Book Luis, for a Meet &amp; Greet</button>
              <button className="btn btn-ghost" id="hero-cta-secondary" onClick={() => (window as any).showPage('services')}>View Services</button>
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

        {/* Scrolling social proof — full-width marquee between hero and trust bar */}
        <div className="social-proof-strip" id="home-proof-marquee">
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

        {/* How it works strip */}
        <section className="section" id="home-how-it-works-section">
          {/* Background watermark trail — large, faint, right-pointing paw prints
              scattered in a two-row zigzag (not one straight inline row), as if an
              unseen dog walked across the section from left to right. */}
          <div id="home-how-it-works-paw-trail" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => {
              const pos = pawPosition(pawSettings, i);
              return (
                <PawTrailPrint key={i} left={`${pos.left}%`} top={`${pos.top}%`} rotate={pos.rotate}
                  size={pawSettings.size} opacity={pawSettings.opacity} />
              );
            })}
          </div>
          <div className="container">
            <div id="home-how-it-works-header" style={{textAlign:'center', marginBottom:'64px'}}>
              <h2>From the first hello to your dog&apos;s <em style={{fontStyle:'normal'}}>daily routine</em></h2>
            </div>
            <div className="hiw-steps" id="home-how-it-works-steps">
              <div className="hiw-step">
                <div className="hiw-step-copy">
                  <div className="hiw-step-number" aria-hidden="true">1</div>
                  <h4>Phone Call &amp; Meet &amp; Greet</h4>
                  <p>A free in-home consultation so you and your dog can meet your walker before the first walk.</p>
                </div>
              </div>
              <div className="hiw-step">
                <div className="hiw-step-copy">
                  <div className="hiw-step-number" aria-hidden="true">2</div>
                  <h4>Set Your Schedule</h4>
                  <p>Choose your walking frequency, preferred times, and any special instructions.</p>
                </div>
              </div>
              <div className="hiw-step">
                <div className="hiw-step-copy">
                  <div className="hiw-step-number" aria-hidden="true">3</div>
                  <h4>First Walk</h4>
                  <p>GPS-tracked 45-minute adventure with post-walk photo report sent to your phone.</p>
                </div>
              </div>
              <div className="hiw-step">
                <div className="hiw-step-copy">
                  <div className="hiw-step-number" aria-hidden="true">4</div>
                  <h4>Ongoing Care</h4>
                  <p>Same walker, same routine. Your dog knows the drill and so do we.</p>
                </div>
              </div>
            </div>
            <div style={{textAlign:'center', marginTop:'56px'}}>
              <button className="btn btn-outline-white" onClick={() => (window as any).showPage('how-it-works')}>Learn More About Our Process</button>
            </div>
          </div>
        </section>

        {/* Trust bar — moved off the fold, now sits on the border between
            How It Works and the Williamsburg trust section. */}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Max 3 Dogs Per Walk
            </div>
          </div>
        </div>

        {/* Services preview. Only the closing disclaimer sits in the normal
            centered .container; the carousel renders outside it so the product
            row stretches the full page width, edge to edge. Moved above the
            Williamsburg trust section (below) — that section's own background
            stays untouched, only page order changed. */}
        <section className="section" id="home-personalized-care-section">
          {/* The pin stage is the element ScrollTrigger pins AND the element
              that carries this section's background (paper grain + cream veil
              + product_background.png). Those two have to be the same element:
              if the background lived on the <section> while only an inner
              wrapper were pinned, the section would keep scrolling behind the
              frozen row and the background would visibly drift during the pin.
              The stage is also a full viewport tall on desktop, so while it's
              pinned it covers the whole screen — nothing unpinned shows around
              it, and the background reads as completely locked. */}
          {/* Animated product carousel — disabled per current direction; the
              static rate cards below replace it. Left in place (not deleted)
              in case it comes back. */}
          {false && (
            <div id="home-personalized-care-pin-stage">
              <div id="home-personalized-care-scroll-window">
                <AnimatedServiceCards />
              </div>
            </div>
          )}
          <div className="container" id="home-rates-preview-row">
            <div id="home-williamsburg-trust-panel" style={{maxWidth:'720px', margin:'0 auto 40px', textAlign:'center'}}>
              <div className="label">Our Home Neighborhood</div>
              <h2 id="home-rates-preview-headline">A Williamsburg <em style={{fontStyle:'normal', color:'var(--sage-dark)'}}>service</em>, not a platform</h2>
            </div>
            <div className="grid-3" id="home-rates-preview-cards" style={{gap:'20px'}}>
              <div className="service-card">
                <h3>Solo Walk</h3>
                <p>A private 60-minute walk.</p>
                <div className="svc-price">$60<span>per walk</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>
              <div className="service-card">
                <h3>Group Walk</h3>
                <p>45-minute walk with up to three dogs max.</p>
                <div className="svc-price">$33<span>per walk</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>
              <div className="service-card">
                <h3>Senior Dog Visits</h3>
                <p>Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs.</p>
                <div className="svc-price">$35<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>
            </div>

            {/* Remaining services, same .service-card style as the top row. */}
            <div className="grid-3" id="home-rates-preview-more-cards" style={{gap:'20px', marginTop:'20px'}}>
              <div className="service-card">
                <h3>Puppy Walk</h3>
                <p>Designed for puppies still learning.</p>
                <div className="svc-price">$35<span>per walk</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>
              <div className="service-card">
                <h3>Boarding &amp; Overnight Sitting</h3>
                <p>Loving overnight care in your dog&apos;s own home, where they can stick to their routine and sleep in familiar surroundings while you&apos;re away.</p>
                <div className="svc-price">$100<span>/night</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>
              <div className="service-card">
                <h3>Cat Visits</h3>
                <p>Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We&apos;ll also water plants, bring in the mail, and keep an eye on your home while you&apos;re away.</p>
                <div className="svc-price">$35<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>
            </div>

            <div style={{textAlign:'center', marginTop:'40px'}}>
              <p style={{color:'var(--mid-gray)', fontSize:'15px'}}>No contracts. No hidden fees. Just dependable neighborhood care from a team your dog knows and trusts.</p>
            </div>
          </div>
        </section>

        {/* Closing trust recap — safety credentials + Williamsburg-specific
            proof combined into one section, positioned right before Reviews
            as the site's final "why us" push before the ask. Reuses copy
            verbatim from #page-safety and #page-neighborhoods (source of
            truth for these claims) rather than inventing new copy; reuses
            existing .trust-icon-box / .cert-strip / .btn classes so nothing
            new had to be styled from scratch. */}
        <section className="section" id="home-closing-trust-section">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'56px'}}>
              <div className="label">Why Williamsburg Trusts Us</div>
              <h2>Insured, background-checked, and <em style={{fontStyle:'normal', color:'var(--sage-light)'}}>local since 2011</em></h2>
            </div>
            <div className="grid-2" id="home-closing-trust-grid" style={{gap:'56px', alignItems:'start'}}>
              <div id="home-closing-safety-list">
                <div style={{display:'flex', gap:'16px', padding:'20px 0', borderBottom:'1px solid var(--light-gray)'}}>
                  <div className="trust-icon-box" style={{flexShrink:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                  <div>
                    <h4>Fully Insured &amp; Bonded</h4>
                    <p>Comprehensive pet care liability insurance, fully bonded. Proof shared on request.</p>
                  </div>
                </div>
                <div style={{display:'flex', gap:'16px', padding:'20px 0', borderBottom:'1px solid var(--light-gray)'}}>
                  <div className="trust-icon-box" style={{flexShrink:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                  <div>
                    <h4>Background-Checked Team</h4>
                    <p>Every walker vetted before their first walk — the same way you&apos;d vet anyone holding a key to your home.</p>
                  </div>
                </div>
                <div style={{display:'flex', gap:'16px', padding:'20px 0', borderBottom:'1px solid var(--light-gray)'}}>
                  <div className="trust-icon-box" style={{flexShrink:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                  <div>
                    <h4>GPS Tracking on Every Walk</h4>
                    <p>A post-walk route map showing exactly where your dog went and how long they were out. No guessing.</p>
                  </div>
                </div>
                <div style={{display:'flex', gap:'16px', padding:'20px 0'}}>
                  <div className="trust-icon-box" style={{flexShrink:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                  <div>
                    <h4>Double-Leash Safety Method</h4>
                    <p>Secure collar-and-harness plus a leash belt — two points of contact on every walk, every dog.</p>
                  </div>
                </div>
              </div>
              <div id="home-closing-williamsburg-pitch">
                <h3>We&apos;re a Williamsburg service, through and through</h3>
                <p style={{fontSize:'16px', lineHeight:'1.8', marginTop:'12px'}}>We know every park, shortcut, and puddle to avoid — because we&apos;ve been walking these blocks since 2011. Not a citywide app dispatching whoever&apos;s nearest: the same local team, every time.</p>
                <div className="divider" style={{margin:'28px 0'}}></div>
                <div style={{display:'flex', gap:'14px', flexWrap:'wrap'}}>
                  <button className="btn btn-primary" onClick={() => (window as any).showPage('book')}>Book a Walk in Williamsburg</button>
                  <button className="btn btn-outline" onClick={() => (window as any).showPage('contact')}>Ask About Williamsburg Coverage</button>
                </div>
              </div>
            </div>
            <div className="cert-strip" id="home-closing-cert-strip" style={{justifyContent:'center', marginTop:'56px'}}>
              <div className="cert-item">
                <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></div>
                <div className="cert-label">NAPPS Member</div>
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
          </div>
        </section>

        {/* Featured reviews — poster treatment (globals.css: POSTER TREATMENT).
            Flat paper, hairline rules, page type system, inked .stamp-label
            marks as the accent. .review-card / .booking-form class names are
            kept on purpose: the GSAP reveal batch in initSectionReveals
            selects on them. */}
        <section className="section" id="home-featured-reviews-section">
          <div className="container">
            <div id="home-featured-reviews-header-row">
              <div id="home-featured-reviews-header">
                <div className="stamp-label stamp-label-heading">File 01 · Voices</div>
                <h2>What our <em style={{fontStyle:'normal', color:'var(--sage-dark)'}}>clients</em> say</h2>
              </div>
              <button className="btn btn-ghost" onClick={() => (window as any).showPage('reviews')}>Read All Reviews</button>
            </div>
            <div className="grid-2" id="home-featured-reviews-grid">
              <figure className="review-card" id="home-featured-review-card">
                <div className="stamp-label zine-quote-stamp">Verified · Yelp</div>
                <div className="stars">★★★★★</div>
                <blockquote className="review-text">Luis and team are truly the best of the best. It&apos;s not easy to trust just anyone with our fur baby, but Luis&apos;s professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.</blockquote>
                <figcaption className="review-author">
                  <div>
                    <div className="review-name">Jessica Y.</div>
                    <div className="review-meta">Rev. 01 · Williamsburg · Yelp</div>
                  </div>
                </figcaption>
              </figure>
              <div id="home-featured-reviews-secondary">
                <figure className="review-card">
                  <div className="stars">★★★★★</div>
                  <blockquote className="review-text">We&apos;ve been with Not The Rug for over two years and couldn&apos;t be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.</blockquote>
                  <figcaption className="review-author">
                    <div>
                      <div className="review-name">Jayne A.</div>
                      <div className="review-meta">Rev. 02 · Williamsburg · Yelp</div>
                    </div>
                  </figcaption>
                </figure>
                <figure className="review-card">
                  <div className="stars">★★★★★</div>
                  <blockquote className="review-text">Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own — flexible with schedule changes and always reliable. Your dogs will be in great hands!</blockquote>
                  <figcaption className="review-author">
                    <div>
                      <div className="review-name">Kassie T.</div>
                      <div className="review-meta">Rev. 03 · Williamsburg · Yelp</div>
                    </div>
                  </figcaption>
                </figure>
                <div id="home-featured-reviews-stat-strip">
                  <a className="hero-stat-item hero-stat-link" data-variant="star" href="https://www.yelp.com/biz/not-the-rug-brooklyn-8" target="_blank" rel="noopener">
                    <div className="hero-stat-num" style={{fontSize:'28px'}}>5★</div>
                    <div className="hero-stat-label">Yelp rating</div>
                  </a>
                  <div className="hero-stat-divider"></div>
                  <a className="hero-stat-item hero-stat-link" data-variant="star" href="https://share.google/xbrJjkZt4eoHUOxBl" target="_blank" rel="noopener">
                    <div className="hero-stat-num" style={{fontSize:'28px'}}>5★</div>
                    <div className="hero-stat-label">Google rating</div>
                  </a>
                  <div className="hero-stat-divider"></div>
                  <a className="hero-stat-item hero-stat-link" href="https://share.google/xbrJjkZt4eoHUOxBl" target="_blank" rel="noopener">
                    <div className="hero-stat-num" style={{fontSize:'28px'}}>79</div>
                    <div className="hero-stat-label">Verified reviews</div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {false && (
        /* Other services */
        <section className="section bg-warm" id="home-other-services-section">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'56px'}}>
              <div className="label">More Ways We Help</div>
              <h2>Additional services &amp; care</h2>
              <div className="divider divider-center"></div>
            </div>
            <div className="grid-3" id="home-other-services-grid" style={{gap:'32px'}}>

              {/* Senior Dog Visits */}
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-senior.svg" alt="" loading="lazy" /></div>
                <h3>Senior Dog Visits</h3>
                <p>Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs. We move at their pace, with patience, comfort, and plenty of care.</p>
                <div className="svc-price">$35<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>

              {/* Boarding & Overnight Sitting */}
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-boarding.svg" alt="" loading="lazy" /></div>
                <h3>Boarding &amp; Overnight Sitting</h3>
                <p>Loving overnight care in your dog&apos;s own home, where they can stick to their routine and sleep in familiar surroundings while you&apos;re away.</p>
                <div className="svc-price">$100<span>/night</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
                <div className="svc-badge">7+ day discounts</div>
              </div>

              {/* Cat Visits */}
              <div className="service-card" onClick={() => (window as any).showPage('services')}>
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-cat.svg" alt="" loading="lazy" /></div>
                <h3>Cat Visits</h3>
                <p>Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We&apos;ll also water plants, bring in the mail, and keep an eye on your home while you&apos;re away.</p>
                <div className="svc-price">$35<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>

            </div>
            <div style={{textAlign:'center', marginTop:'40px'}}>
              <button className="btn btn-outline" onClick={() => (window as any).showPage('services')}>See All Services &amp; Rates</button>
            </div>
          </div>
        </section>
        )}

        {/* Book CTA + Meet & Greet form (merged CTA band + contact sheet) */}
        <section className="section" id="home-contact-sheet-section">
          <div className="container">
            <div id="home-contact-sheet-header">
              <div className="stamp-label stamp-label-dark stamp-label-heading">Form 02 · Meet &amp; Greet</div>
              <h2>What We&apos;d Like to Know....</h2>
            </div>
            <div id="home-book-form-wrap" className="booking-form-wrap">
              <div className="booking-form" id="home-contact-sheet-form-sheet">
                <div className="booking-form-body">
                  <MeetGreetForm paneId="home-meetgreet" source="home" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {false && (
        /* Exclusive Benefits for Weekday Walking Clients */
        <section className="section bg-warm" id="home-weekday-benefits-section">
          <div className="container">
            <div style={{maxWidth:'720px', margin:'0 auto'}}>
              <div className="label label-tape" id="regular-clients-label-tape">For Regular Clients</div>
              <h2>Exclusive benefits for weekday walking clients</h2>
              <div className="divider"></div>
              <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8', marginBottom:'32px'}}>Our regular weekday clients receive priority access to services that are not available to the public.</p>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px', marginBottom:'32px'}}>
                {[
                  'Early morning and evening visits',
                  'Weekend walks',
                  'Last-minute requests',
                  'Longer visits when timing, weather, and your dog allow'
                ].map((benefit) => (
                  <div key={benefit} style={{display:'flex', alignItems:'flex-start', gap:'12px', background:'white', borderRadius:'var(--radius)', padding:'18px 20px', border:'1px solid var(--light-gray)'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0, marginTop:'1px', color:'var(--sage-dark)'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span style={{fontSize:'15px', color:'var(--charcoal)'}}>{benefit}</span>
                  </div>
                ))}
              </div>
              <p style={{color:'var(--mid-gray)', fontSize:'15px', lineHeight:'1.7'}}>These services are reserved for families in our regular weekday walking program, helping us provide the consistent, dependable care we&apos;re known for.</p>
            </div>
          </div>
        </section>
        )}

        {false && (
        /* Every Visit Includes */
        <section className="section bg-warm" id="home-visit-includes-section">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'56px'}}>
              <div className="label">Standard of Care</div>
              <h2>Every visit includes</h2>
              <div className="divider divider-center"></div>
            </div>
            <div className="grid-3" id="standard-of-care-grid" style={{gap:'28px'}}>
              {[
                {title:'Professionally Trained Team', desc:'Every team member is trained in dog body language, safety, and positive reinforcement. We make it look easy because experience, patience, and consistency matter.', icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
                {title:'GPS Tracking', desc:"Follow your dog's adventure with GPS tracking and receive a personalized visit summary after every outing.", icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>},
                {title:'Photo & Visit Report', desc:"Receive photos, potty updates, and notes about your dog's walk, mood, and adventure.", icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>},
                {title:'Safety-First Equipment', desc:'Every dog is walked using our secure leash belt, collar, and harness system for added safety and peace of mind.', icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>},
                {title:'Healthy Treats', desc:'Every visit includes a high-value, grain- and chicken-free treat, or your own treats if you prefer.', icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 10c.7-.7 1-1.6 1-2.5a3.5 3.5 0 0 0-3.5-3.5C13.6 4 12.7 4.3 12 5L5 12c-.7.7-1 1.6-1 2.5a3.5 3.5 0 0 0 3.5 3.5c.9 0 1.8-.3 2.5-1l7-7z"/></svg>},
                {title:'Clean Paws & Fresh Water', desc:'We wipe paws with unscented wipes, refresh water bowls, and help keep your home clean.', icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>},
                {title:'Meals & Medication', desc:"Need us to feed your dog or administer medication? We're happy to help at no additional charge.", icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>},
                {title:'Temperature & Packages', desc:"We'll bring in packages, check your home's temperature, and adjust blinds, shades, or the AC to help keep your pup comfortable.", icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>},
                {title:'Direct Communication', desc:'Need us? Reach your walker or the owner directly. No bots. No call centers. Just real people who know your dog.', icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
              ].map((item) => (
                <div key={item.title} style={{background:'white', borderRadius:'var(--radius-lg)', padding:'32px 28px', border:'1px solid var(--light-gray)'}}>
                  <div style={{marginBottom:'16px', color:'var(--sage-dark)'}}>{item.icon}</div>
                  <h4 style={{fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'10px'}}>{item.title}</h4>
                  <p style={{fontSize:'14px', color:'var(--mid-gray)', lineHeight:'1.7', marginBottom:0}}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {false && (
        /* Owner pull quote */
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
        )}

        {false && (
        /* Neighborhood teaser */
        <section className="section bg-warm">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'48px'}}>
              <div className="label">Service Areas</div>
              <h2>We know Williamsburg street by street</h2>
              <p style={{color:'var(--mid-gray)', maxWidth:'440px', margin:'16px auto 0', fontSize:'16px'}}>Fifteen years of daily walks in one neighborhood. This is the block we know best.</p>
            </div>
            <div className="hood-cards-grid">
              <div id="home-williamsburg-hood-card" className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('williamsburg')}>
                <div className="hood-card-img img-placeholder img-ph-1" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Williamsburg</div><div className="hood-card-desc">Our home neighborhood since 2011</div></div></div>
              </div>
            </div>
          </div>
        </section>
        )}

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

              {/* Small Group Visit */}
              <div className="service-card">
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-small-group.svg" alt="" loading="lazy" /></div>
                <h3>Small Group Visit</h3>
                <p>45-minute visit with up to three dogs max. GPS tracked, personalized report card included, and paws cleaned before returning home.</p>
                <div className="svc-price">$33<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
                <div className="svc-badge">Most Popular</div>
              </div>

              {/* Solo Visit */}
              <div className="service-card">
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-solo.svg" alt="" loading="lazy" /></div>
                <h3>Solo Visit</h3>
                <p>A private 60-minute visit for nervous, anxious, or reactive dogs, or pups who simply do better with one-on-one attention. Built around patience, consistency, and positive reinforcement.</p>
                <div className="svc-price">$60<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
                <div className="svc-badge">Premium</div>
              </div>

              {/* Puppy Visits */}
              <div className="service-card">
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-puppy.svg" alt="" loading="lazy" /></div>
                <h3>Puppy Visits</h3>
                <p>Designed for puppies still learning the ropes. Visits focus on potty breaks, enrichment, socialization, and positive reinforcement. Discounts available for multiple daily visits.</p>
                <div className="svc-price">$35<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>

              {/* Senior Dog Visits */}
              <div className="service-card">
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-senior.svg" alt="" loading="lazy" /></div>
                <h3>Senior Dog Visits</h3>
                <p>Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs. We move at their pace, with patience, comfort, and plenty of care.</p>
                <div className="svc-price">$35<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
              </div>

              {/* Boarding & Overnight Sitting */}
              <div className="service-card">
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-boarding.svg" alt="" loading="lazy" /></div>
                <h3>Boarding &amp; Overnight Sitting</h3>
                <p>Loving overnight care in your dog&apos;s own home, where they can stick to their routine and sleep in familiar surroundings while you&apos;re away.</p>
                <div className="svc-price">$100<span>/night</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
                <div className="svc-badge">7+ day discounts</div>
              </div>

              {/* Cat Visits */}
              <div className="service-card">
                <div className="service-icon-badge" aria-hidden="true"><img src="/img/icons/service-cat.svg" alt="" loading="lazy" /></div>
                <h3>Cat Visits</h3>
                <p>Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We&apos;ll also water plants, bring in the mail, and keep an eye on your home while you&apos;re away.</p>
                <div className="svc-price">$35<span>/visit</span></div>
                <div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>
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
                  <MeetGreetForm paneId="svc-tab-meetgreet" source="services" />

                  {/* Service Booking Tab */}
                  <div id="svc-tab-service" style={{display:'none'}}>
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Book a service</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Existing clients can book below. New clients — please start with a Meet &amp; Greet.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Service Type</label>
                        <select className="form-control form-select">
                          <option>Small Group Visit ($33/visit)</option>
                          <option>Solo Visit ($60/visit)</option>
                          <option>Puppy Visit ($35/visit)</option>
                          <option>Senior Dog Visit ($35/visit)</option>
                          <option>Boarding &amp; Overnight Sitting ($100/night)</option>
                          <option>Cat Visit ($35/visit)</option>
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
                    <p>Fill out our simple intake form or give us a call. Tell us where you&apos;re located in Williamsburg and a little about your dog, including breed, age, weight, personality, quirks, or allergies. We respond within 2 hours on weekdays.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">02</div>
                  <div className="process-content">
                    <h3>Free Meet &amp; Greet</h3>
                    <p>We come to your home so your dog can meet their future walker in their own space, on their own terms. We&apos;ll review your routine, key handling notes, and answer any questions. No charge, no commitment.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">03</div>
                  <div className="process-content">
                    <h3>Set Up Your Profile</h3>
                    <p>Add schedules, vet contacts and records, birthdays, emergency protocols, door codes, and behavioral notes. Your dog&apos;s profile travels with their walker on every visit.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">04</div>
                  <div className="process-content">
                    <h3>First Walk</h3>
                    <p>Your assigned walker arrives within a 15/30-minute window, starts GPS tracking, and gives your dog a walk. You&apos;ll receive a photo report once they&apos;re home safe.</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="process-num-big">05</div>
                  <div className="process-content">
                    <h3>Ongoing &amp; Recurring</h3>
                    <p>Same walker, same time, and a familiar routine built around your dog&apos;s preferences. Monthly invoicing, a simple 24-hour cancellation policy, and an open line to us whenever you need it.</p>
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
                <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8', marginBottom:'20px'}}>Not The Rug was founded in 2011 by Luis, a Williamsburg resident since 2006. Before dog walking, Luis spent years in broadcasting and music, including work as a Program Director at SiriusXM Radio and consulting for Red Bull on music strategy and cultural programming.</p>
                <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8', marginBottom:'20px'}}>In 2008, the pace of that world pushed him to step away. He took a job walking dogs on the Upper West Side, and the work changed everything. It started with two dogs, Suzy and Oliver, and daily walks rooted in patience, observation, and trust. What began as a reset became a calling.</p>
                <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8', marginBottom:'20px'}}>The name is a promise: your dog won&apos;t ruin your rug because they&apos;ll be properly walked, genuinely cared for, and returned home happy. It&apos;s also a nod to the neighborhood&apos;s sense of humor. We don&apos;t take ourselves too seriously, but we take your dog very seriously.</p>
                <p style={{color:'var(--mid-gray)', fontSize:'16px', lineHeight:'1.8'}}>We&apos;ve never expanded beyond what we can do well. We don&apos;t dispatch strangers. Every walker on our team is trained, trusted, and familiar with the neighborhood. Most importantly, they know your dog by name.</p>
              </div>
              <div>
                <div style={{aspectRatio:'4/5', borderRadius:'var(--radius-lg)', overflow:'hidden', marginBottom:'20px'}}>
                  <div id="about-founder-image" style={{height:'100%', backgroundImage:"url('/img/team/luis-action.jpg')", backgroundSize:'cover', backgroundPosition:'center'}}></div>
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
                <div className="team-photo" style={{height:'280px', backgroundImage:"url('/img/team/luis.jpg')", backgroundSize:'150%', backgroundPosition:'48% 40%'}} role="img" aria-label="Luis, Not The Rug dog walker"></div>
                <div className="team-info">
                  <div className="team-name">Luis</div>
                  <div className="team-role">Founder &amp; Lead Walker</div>
                  <p className="team-bio">A former SiriusXM Program Director and Red Bull music strategist, Luis traded the broadcast world for Brooklyn sidewalks. He founded Not The Rug in 2011 after discovering dog walking on the Upper West Side. A Williamsburg resident since 2006, he knows the blocks, the parks, and most of the dogs by name.</p>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo" style={{height:'280px', backgroundImage:"url('/img/team/lincoln.jpg')", backgroundSize:'275%', backgroundPosition:'46% 48%'}} role="img" aria-label="Lincoln, Not The Rug dog walker"></div>
                <div className="team-info">
                  <div className="team-name">Lincoln</div>
                  <div className="team-role">Manager &amp; Senior Walker</div>
                  <p className="team-bio">Originally from South Louisiana, with roots in DownEast Maine, Lincoln grew up surrounded by animals, including dogs, miniature donkeys, and even emus. If it had four legs or feathers, she likely helped care for it. Four years ago, Lincoln moved to Brooklyn with her three Southern pups, bringing her deep respect for animals with her. Her understanding of animal behavior, along with her steady and generous approach, makes her a trusted presence on the team. Now a Williamsburg local, Lincoln feels lucky to do this work every day.</p>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo" style={{height:'280px', backgroundImage:"url('/img/team/marcus.jpg')", backgroundSize:'275%', backgroundPosition:'48% 3%'}} role="img" aria-label="Marcus, Not The Rug dog walker"></div>
                <div className="team-info">
                  <div className="team-name">Marcus</div>
                  <div className="team-role">Senior Walker</div>
                  <p className="team-bio">Marcus has spent his life around animals, from growing up with pets to working as a dog trainer at Petco. He brings a thoughtful understanding of how dogs communicate, learn, and respond. A theater kid, video gamer, curious thinker, and devoted animal lover, Marcus sees every walk as a chance to build trust and connection. Say hello when you see him in the neighborhood — he&apos;s always happy to meet pups and their people.</p>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo" style={{height:'280px', backgroundImage:"url('/img/team/christian.jpg')", backgroundSize:'170%', backgroundPosition:'60% 42%'}} role="img" aria-label="Christian, Not The Rug dog walker"></div>
                <div className="team-info">
                  <div className="team-name">Christian</div>
                  <div className="team-role">Senior Walker</div>
                  <p className="team-bio">Christian spent more than six years working as a chef and kitchen manager, where he developed discipline, focus, and strong attention to detail. Over time, he realized he wanted work that felt more grounded and connected. With a lifelong love for animals, Christian chose a new path that brought more balance into his life. He brings patience, care, and a steady presence to every walk, treating each dog with the same respect he would give his own.</p>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo" style={{height:'280px', backgroundImage:"url('/img/team/shawn.jpg')", backgroundSize:'290%', backgroundPosition:'53% 3%'}} role="img" aria-label="Shawn, Not The Rug dog walker"></div>
                <div className="team-info">
                  <div className="team-name">Shawn</div>
                  <div className="team-role">Walker</div>
                  <p className="team-bio">Shawn brings care, precision, and a calm presence to every walk. An artist, musician, and visual creator, he approaches dog care with patience and intention. Before joining Not The Rug, Shawn spent two years with another service and came to us wanting a more thoughtful approach to the work. He has been a strong addition to the team, and we&apos;re glad to have him.</p>
                </div>
              </div>
              <div className="team-card card-hover">
                <div className="team-photo" style={{height:'280px', backgroundImage:"url('/img/team/yenny.jpg')", backgroundSize:'265%', backgroundPosition:'47% 9%'}} role="img" aria-label="Yenny, Not The Rug dog walker"></div>
                <div className="team-info">
                  <div className="team-name">Yenny</div>
                  <div className="team-role">Walker</div>
                  <p className="team-bio">Yenny is an experienced dog walker and a returning member of the Not The Rug team. Before joining us, she spent three years managing a doggy daycare in Long Island City, working with dogs of all personalities and energy levels. After stepping away to have her baby, Yenny is back with us and already reconnecting with the neighborhood pups. We&apos;re excited to have her back.</p>
                </div>
              </div>
              <div id="join-team-card" className="team-card" style={{gridColumn:'1 / -1', border:'2px dashed var(--sage-light)', background:'var(--cream)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px', textAlign:'center'}}>
                <div style={{marginBottom:'16px'}}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></div>
                <h4 style={{fontFamily:'var(--font-display)', fontSize:'22px', marginBottom:'10px'}}>Join the team</h4>
                <p style={{fontSize:'14px', color:'var(--mid-gray)', marginBottom:'20px'}}>We hire experienced, passionate walkers who want to build real relationships — not just fill shifts.</p>
                <button className="btn btn-outline btn-sm" onClick={() => (window as any).showPage('contact')}>Learn More</button>
              </div>
            </div>
          </div>
        </section>

        {/* How We Work */}
        <section className="section bg-warm">
          <div className="container">
            <div style={{textAlign:'center', marginBottom:'48px'}}>
              <div className="label">How We Work</div>
              <h2>The principles behind every walk</h2>
            </div>
            <p style={{textAlign:'center', color:'var(--mid-gray)', maxWidth:'620px', margin:'0 auto 48px', fontSize:'16px', lineHeight:'1.8'}}>Our walks are structured, consistent, and responsive. From pickup to drop-off, we give each dog a familiar rhythm while staying present to their pace, mood, leash cues, and body language. That repetition builds trust, helping dogs move with more ease and settle calmly when they return home.</p>
            <div className="values-grid">
              <div className="value-cell">
                <div className="value-num">01</div>
                <h4>Consistency Over Convenience</h4>
                <p>We don&apos;t take on every client — not to be exclusive, but to protect the quality of care. We only accept new dogs when we can assign a consistent walker with the time and capacity to do the job well. Your dog deserves a familiar person, not a different face every week.</p>
              </div>
              <div className="value-cell" style={{background:'var(--cream)'}}>
                <div className="value-num">02</div>
                <h4>Small Groups, Real Attention</h4>
                <p>Three dogs maximum per walk. Always. It&apos;s not a marketing line. It&apos;s how we keep walks safe, calm, and attentive. Your dog gets real exercise and engagement, not crowd management.</p>
              </div>
              <div className="value-cell" style={{background:'var(--cream)'}}>
                <div className="value-num">03</div>
                <h4>Neighborhood Expertise</h4>
                <p>We know the Williamsburg details that only come from years of daily walks: which areas of the park flood after rain, which blocks to avoid, which routes help reactive dogs feel calmer, and where to find shade in summer heat. Fifteen years builds that kind of knowledge.</p>
              </div>
              <div className="value-cell">
                <div className="value-num">04</div>
                <h4>Real People, Always Reachable</h4>
                <p>Luis&apos;s personal number is on the website, and you can text or call your walker directly. No support tickets. No call centers. Just real people who know your dog and respond when you need them.</p>
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
                  <p>Every dog is walked with our secure collar-and-harness system, supported by a leash belt for added protection. Two points of contact help keep your dog safe, and every walker follows our no-phone-while-walking policy, completes hands-on safety training, and receives regular gear checks.</p>
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
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>We contact you immediately, provide basic first aid if needed, and take your dog to your designated vet or the nearest emergency clinic. We document everything clearly and stay with your dog until you can be there. Our insurance covers veterinary costs related to walker negligence.</p>
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
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>For individual walks, we ask for 24 hours&apos; notice to avoid a charge. For boarding, we ask for 72 hours&apos; notice. We understand life happens and handle special circumstances with flexibility.</p>
                </details>
                <details style={{borderTop:'1px solid var(--light-gray)', padding:'18px 0', cursor:'pointer'}}>
                  <summary style={{fontWeight:600, fontSize:'15px', listStyle:'none', display:'flex', justifyContent:'space-between'}}>Why do you clean dogs&apos; paws after every walk? <span style={{color:'var(--sage)'}}>+</span></summary>
                  <p style={{color:'var(--mid-gray)', fontSize:'14px', marginTop:'12px', lineHeight:'1.7'}}>We clean paws after every walk to help remove dirt, debris, and anything harmful your dog may have stepped in outside. It&apos;s a simple step that supports your dog&apos;s health and helps keep your home clean.</p>
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
            <h1>Williamsburg is our<br />backyard</h1>
            <p>We&apos;re a Williamsburg service through and through — we know every park, shortcut, and puddle to avoid.</p>
          </div>
          <a href="https://instagram.com/placeholder" target="_blank" rel="noopener" className="page-hero-label" id="page-hero-label-neighborhoods"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Pepper · @pepper_bklyn</a>
        </div>

        <section className="section">
          <div className="container">
            <div className="grid-3" style={{gap:'24px'}}>
              <div id="neighborhoods-williamsburg-hood-card" className="hood-card card-hover" onClick={() => (window as any).showNeighborhood('williamsburg')} style={{aspectRatio:'1', position:'relative'}}>
                <div className="hood-card-img img-placeholder img-ph-1" style={{height:'100%', position:'absolute', inset:0}}></div>
                <div className="hood-card-overlay"><div className="hood-card-label"><div className="hood-card-name">Williamsburg</div><div className="hood-card-desc">Our home since 2011</div></div></div>
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
                  <MeetGreetForm paneId="tab-meetgreet" source="book" />

                  {/* Service Booking Tab */}
                  <div id="tab-service" style={{display:'none'}}>
                    <h3 style={{fontFamily:'var(--font-display)', marginBottom:'6px'}}>Book a service</h3>
                    <p style={{color:'var(--mid-gray)', fontSize:'14px', marginBottom:'28px'}}>Existing clients can book below. New clients — please start with a Meet &amp; Greet.</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Service Type</label>
                        <select className="form-control form-select">
                          <option>Small Group Visit ($33/visit)</option>
                          <option>Solo Visit ($60/visit)</option>
                          <option>Puppy Visit ($35/visit)</option>
                          <option>Senior Dog Visit ($35/visit)</option>
                          <option>Boarding &amp; Overnight Sitting ($100/night)</option>
                          <option>Cat Visit ($35/visit)</option>
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
                      <p>For new client intake, less urgent inquiries, or detailed questions.</p>
                      <a href="mailto:luis@nottherug.com" style={{display:'block', marginTop:'10px'}}>luis@nottherug.com</a>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                    <div>
                      <h4>Service Area</h4>
                      <p>We&apos;re based in Williamsburg and serve North Williamsburg and much of South Williamsburg. We do our best to cover as much of the neighborhood as possible, but some areas may depend on staff availability.</p>
                      <p style={{marginTop:'8px', fontSize:'13px', color:'var(--mid-gray)'}}>281 N 7th St, Ste 13, Brooklyn, NY 11211<br />b/t Havemeyer St &amp; Meeker Ave · Williamsburg North Side</p>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                    <div>
                      <h4>Response Hours</h4>
                      <p>Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM</p>
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
          <div id="footer-content-zone">
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
              </ul>
            </div>
            <div className="footer-col">
              <h4>Service Area</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('williamsburg'); }}>Williamsburg</a></li>
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
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.location.href='/book'; }}>Book a Walk</a></li>
              </ul>
            </div>
          </div>
          <div id="footer-cta-shell" style={{display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'24px', borderTop:'1px solid rgba(255,255,255,0.15)', paddingTop:'28px', marginBottom:'28px'}}>
            <div id="footer-cta-copy" style={{maxWidth:'440px'}}>
              <h4 style={{fontFamily:'var(--font-body)', fontSize:'14px', fontWeight:500, color:'rgba(255,255,255,0.6)', marginBottom:'6px'}}>Ready to get started?</h4>
              <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', margin:0}}>Book a free meet &amp; greet and tell us about your dog. No commitment — just a chance to connect.</p>
            </div>
            <button className="btn btn-primary btn-sm" style={{whiteSpace:'nowrap'}} onClick={() => window.location.href='/book'}>Book Luis, for a Meet &amp; Greet</button>
          </div>
          <div className="divider-word divider-word-dark" id="footer-est-divider" aria-hidden="true">Brooklyn &middot; Est. 2011</div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St &amp; Meeker Ave · All rights reserved</div>
            <div style={{display:'flex', gap:'24px'}}>
              <a href="#" style={{fontSize:'13px', color:'rgba(255,255,255,0.5)'}}>Privacy</a>
              <a href="#" style={{fontSize:'13px', color:'rgba(255,255,255,0.5)'}}>Terms</a>
            </div>
          </div>
          </div>{/* /footer-content-zone */}
        </div>
      </footer>

      {/* Temporary dev overlay for dialing in the how-it-works paw trail —
          remove once the animation is finalized. */}
      {showPawTuning ? (
        <aside
          id="hiw-paw-tuning-panel"
          style={{
            position: 'fixed', top: 0, right: 0, width: 340, height: '100vh', overflowY: 'auto',
            background: 'var(--warm-white)', borderLeft: '1px solid rgba(36,35,33,0.12)',
            padding: 24, zIndex: 9999, boxShadow: '-2px 0 10px rgba(35,31,24,0.06)',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--charcoal)' }}>Paw Trail Tuning</div>
            <button type="button" onClick={() => setShowPawTuning(false)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(36,35,33,0.2)', background: 'transparent', color: 'var(--charcoal)', fontSize: 12, cursor: 'pointer' }}>
              Hide
            </button>
          </div>

          <button type="button" onClick={() => (window as any).replayHowItWorksPaws?.()}
            style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--sage-dark)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ▶ Replay
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={savePawTuningAsDefault}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', background: 'var(--sage-dark)', color: 'var(--warm-white)', fontSize: 13, cursor: 'pointer' }}>
              Save as Default
            </button>
            <button type="button" onClick={resetPawTuning}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(36,35,33,0.2)', background: 'transparent', color: 'var(--charcoal)', fontSize: 13, cursor: 'pointer' }}>
              Reset
            </button>
          </div>

          <TuneSectionLabel>Paw Print</TuneSectionLabel>
          <TuneSlider id="paw-opacity" label="Opacity" value={pawSettings.opacity} min={0.05} max={1} step={0.01} unit="" onChange={(v) => updatePaw('opacity', v)} />
          <TuneSlider id="paw-size" label="Size" value={pawSettings.size} min={40} max={260} step={2} unit="px" onChange={(v) => updatePaw('size', v)} />
          <TuneSlider id="paw-base-rotation" label="Base rotation (0=up, 90=right)" value={pawSettings.baseRotation} min={-180} max={180} step={1} unit="°" onChange={(v) => updatePaw('baseRotation', v)} />
          <TuneSlider id="paw-rotation-variance" label="Rotation variance" value={pawSettings.rotationVariance} min={0} max={30} step={1} unit="°" onChange={(v) => updatePaw('rotationVariance', v)} />
          <TuneSlider id="paw-start-x" label="Start X (leftmost print)" value={pawSettings.startX} min={0} max={40} step={1} unit="%" onChange={(v) => updatePaw('startX', v)} />
          <TuneSlider id="paw-spread-x" label="Spread X (across all 4)" value={pawSettings.spreadX} min={20} max={95} step={1} unit="%" onChange={(v) => updatePaw('spreadX', v)} />
          <TuneSlider id="paw-row-top" label="Top row Y" value={pawSettings.rowTop} min={0} max={90} step={1} unit="%" onChange={(v) => updatePaw('rowTop', v)} />
          <TuneSlider id="paw-row-bottom" label="Bottom row Y" value={pawSettings.rowBottom} min={0} max={90} step={1} unit="%" onChange={(v) => updatePaw('rowBottom', v)} />

          <div style={{ height: 1, background: 'rgba(36,35,33,0.12)' }} />
          <TuneSectionLabel>Walk-in Reveal (paws)</TuneSectionLabel>
          <TuneSlider id="reveal-paw-duration" label="Duration" value={revealSettings.pawDuration} min={0.1} max={2} step={0.05} unit="s" onChange={(v) => updateReveal('pawDuration', v)} />
          <TuneSlider id="reveal-paw-stagger" label="Stagger between prints" value={revealSettings.pawStagger} min={0} max={1} step={0.02} unit="s" onChange={(v) => updateReveal('pawStagger', v)} />
          <TuneSlider id="reveal-paw-distance" label="Start distance (walk-in X)" value={revealSettings.pawDistanceX} min={0} max={150} step={2} unit="px" onChange={(v) => updateReveal('pawDistanceX', v)} />
          <TuneSelect id="reveal-paw-ease" label="Ease" value={revealSettings.pawEase} onChange={(v) => updateReveal('pawEase', v)} />

          <div style={{ height: 1, background: 'rgba(36,35,33,0.12)' }} />
          <TuneSectionLabel>Description Reveal (copy)</TuneSectionLabel>
          <TuneSlider id="reveal-copy-delay" label="Delay after paws start" value={revealSettings.copyDelay} min={0} max={1} step={0.02} unit="s" onChange={(v) => updateReveal('copyDelay', v)} />
          <TuneSlider id="reveal-copy-duration" label="Duration" value={revealSettings.copyDuration} min={0.1} max={2} step={0.05} unit="s" onChange={(v) => updateReveal('copyDuration', v)} />
          <TuneSlider id="reveal-copy-stagger" label="Stagger between steps" value={revealSettings.copyStagger} min={0} max={1} step={0.02} unit="s" onChange={(v) => updateReveal('copyStagger', v)} />
          <TuneSlider id="reveal-copy-distance" label="Start distance (Y)" value={revealSettings.copyDistanceY} min={0} max={80} step={2} unit="px" onChange={(v) => updateReveal('copyDistanceY', v)} />
          <TuneSelect id="reveal-copy-ease" label="Ease" value={revealSettings.copyEase} onChange={(v) => updateReveal('copyEase', v)} />

          <div style={{ height: 1, background: 'rgba(36,35,33,0.12)' }} />
          <TuneSectionLabel>Hide (scroll away)</TuneSectionLabel>
          <TuneSlider id="hide-paw-duration" label="Paw duration" value={hideSettings.pawDuration} min={0.1} max={1.5} step={0.05} unit="s" onChange={(v) => updateHide('pawDuration', v)} />
          <TuneSlider id="hide-copy-duration" label="Copy duration" value={hideSettings.copyDuration} min={0.1} max={1.5} step={0.05} unit="s" onChange={(v) => updateHide('copyDuration', v)} />
          <TuneSelect id="hide-ease" label="Ease" value={hideSettings.ease} onChange={(v) => updateHide('ease', v)} />
        </aside>
      ) : (
        <button
          type="button" id="hiw-paw-tuning-toggle" onClick={() => setShowPawTuning(true)}
          style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 9998,
            padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(36,35,33,0.2)',
            background: 'var(--warm-white)', color: 'var(--charcoal)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(35,31,24,0.16)',
          }}
        >
          🐾 Tune Paws
        </button>
      )}
    </>
  );
}
