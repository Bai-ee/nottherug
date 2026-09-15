'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useHowItWorksPawTrail } from './hooks/useHowItWorksPawTrail';

// Baked-in values from the former dev "Tune Paws" overlay (removed per R16).
const PAW_OPACITY = 0.4;
const PAW_SIZE = 140;

// Large, washed-out background watermark print — points right (base rotate
// 90deg turns the glyph's toes-up orientation into toes-right), scattered in
// a loose two-row zigzag rather than one straight inline row.
function PawTrailPrint({ left, top, rotate }: { left: string; top: string; rotate: number }) {
  return (
    <div className="hiw-paw-print" style={{ left, top }}>
      <svg className="hiw-paw" viewBox="0 0 40 40" width={PAW_SIZE} height={PAW_SIZE} fill="currentColor"
        style={{ transform: `rotate(${rotate}deg)`, opacity: PAW_OPACITY }} aria-hidden="true">
        <ellipse cx="20" cy="27" rx="10" ry="8" />
        <ellipse cx="10" cy="14" rx="4" ry="5" transform="rotate(-15 10 14)" />
        <ellipse cx="18" cy="8" rx="4.5" ry="5.5" />
        <ellipse cx="27" cy="9" rx="4.5" ry="5.5" transform="rotate(10 27 9)" />
        <ellipse cx="33" cy="17" rx="4" ry="5" transform="rotate(25 33 17)" />
      </svg>
    </div>
  );
}

// left%/top%/rotate for the 4 watermark prints, computed once from the
// tuned defaults (startX 4, spreadX 79, rowTop 12, rowBottom 56,
// baseRotation 90, rotationVariance 6) — see useHowItWorksPawTrail.
const PAW_POSITIONS = [0, 1, 2, 3].map((i) => ({
  left: `${4 + (79 * i) / 3}%`,
  top: `${i % 2 === 0 ? 12 : 56}%`,
  rotate: 90 + (i % 2 === 0 ? -6 : 6),
}));

const STEPS: Array<{ number: string; title: string; copy: string }> = [
  { number: '1', title: 'Phone Call & Meet & Greet', copy: 'A free in-home consultation so you and your dog can meet your walker before the first walk.' },
  { number: '2', title: 'Set Your Schedule', copy: 'Choose your walking frequency, preferred times, and any special instructions.' },
  { number: '3', title: 'First Walk', copy: 'GPS-tracked 45-minute adventure with post-walk photo report sent to your phone.' },
  { number: '4', title: 'Ongoing Care', copy: 'Same walker, same routine. Your dog knows the drill and so do we.' },
];

export default function HowItWorksStrip() {
  const sectionRef = useRef<HTMLElement | null>(null);
  useHowItWorksPawTrail(sectionRef);

  return (
    <section className="section" id="home-how-it-works-section" ref={sectionRef}>
      <div id="home-how-it-works-paw-trail" aria-hidden="true">
        {PAW_POSITIONS.map((pos, i) => (
          <PawTrailPrint key={i} left={pos.left} top={pos.top} rotate={pos.rotate} />
        ))}
      </div>
      <div className="container">
        <div id="home-how-it-works-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2>From the first hello to your dog&apos;s <em style={{ fontStyle: 'normal' }}>daily routine</em></h2>
        </div>
        <div className="hiw-steps" id="home-how-it-works-steps">
          {STEPS.map((step) => (
            <div className="hiw-step" key={step.number}>
              <div className="hiw-step-copy">
                <div className="hiw-step-number" aria-hidden="true">{step.number}</div>
                <h4>{step.title}</h4>
                <p>{step.copy}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '56px' }}>
          <Link href="/how-it-works" className="btn btn-outline-white">Learn More About Our Process</Link>
        </div>
      </div>
    </section>
  );
}
