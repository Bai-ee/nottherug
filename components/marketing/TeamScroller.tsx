'use client';

import { useEffect, useRef, useState } from 'react';
import { TEAM } from '@/lib/content/team';

/** Same alternation the Instagram tiles use (InstagramGrid). */
const TILT_CLASSES = ['polaroid-tilt-left', 'polaroid-tilt-right'];
import { loadGsap, prefersReducedMotion } from './hooks/gsapLoader';

/**
 * Compact team roster for the homepage green band.
 *
 * One horizontal track instead of the /about page's full grid: photo, name
 * and role only, no bios — the roster is proof that the team is real and
 * local, and the bios live on /about.
 *
 * The track scrolls itself horizontally from the page's own vertical scroll,
 * forward on the way down and back on the way up, so the row reads as part of
 * the page's motion rather than a carousel asking to be operated. It is a
 * real overflow container, not a transform, so a trackpad swipe, a drag or a
 * keyboard focus still moves it, and it degrades to an ordinary scrollable
 * row with no JS and under prefers-reduced-motion.
 *
 * Hovering a face opens a centred preview of that photo at full size — the
 * same interaction the "Always Included" icons use (see AlwaysIncluded:
 * #home-included-preview), down to the paper frame, the dimmed backdrop and
 * the hover/focus/tap triggers, so the two read as one behaviour rather than
 * two. The chips are cropped squares; the preview is the whole frame.
 */
export default function TeamScroller() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const active = TEAM.find((member) => member.name === activeName) ?? null;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion()) return;

    let cancelled = false;
    let ctx: ReturnType<typeof import('gsap').gsap.context> | undefined;

    loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;
        ctx = gsap.context(() => {
          ScrollTrigger.create({
            trigger: track,
            // Travel starts as the row enters and finishes as it leaves, so
            // the whole roster has passed by the time the block is read.
            start: 'top 92%',
            end: 'bottom 8%',
            scrub: 0.6,
            onUpdate: (self) => {
              const distance = track.scrollWidth - track.clientWidth;
              if (distance <= 0) return; // row already fits: nothing to travel
              track.scrollLeft = distance * self.progress;
            },
          });
        }, track);
      })
      .catch(() => {
        // Motion is an enhancement; the row stays scrollable by hand.
      });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div id="home-team-scroller" ref={trackRef}>
      <ul id="home-team-scroller-track">
        {TEAM.map((member, i) => (
          <li className={`home-team-chip polaroid ${TILT_CLASSES[i % TILT_CLASSES.length]}`} key={member.name}>
            {/* Only the photo is the button; the caption under it stays plain
                text, as on the included callouts. */}
            <button
              type="button"
              className="home-team-chip-trigger"
              data-active={active?.name === member.name}
              aria-expanded={active?.name === member.name}
              aria-label={`Preview ${member.name}, Not The Rug dog walker`}
              onMouseEnter={() => setActiveName(member.name)}
              onMouseLeave={() => setActiveName((current) => (current === member.name ? null : current))}
              onFocus={() => setActiveName(member.name)}
              onBlur={() => setActiveName((current) => (current === member.name ? null : current))}
              onClick={() => setActiveName((current) => (current === member.name ? null : member.name))}
            >
              <div className="polaroid-window">
                <div
                  className="home-team-chip-photo"
                  aria-hidden="true"
                  style={{
                    backgroundImage: `url('${member.photo}')`,
                    backgroundSize: member.photoSize,
                    backgroundPosition: member.photoPosition,
                  }}
                />
              </div>
            </button>
            <div className="polaroid-caption" id={`home-team-chip-caption-${member.name.toLowerCase()}`}>
              <div className="home-team-chip-name">{member.name}</div>
              <div className="home-team-chip-role">{member.role}</div>
            </div>
          </li>
        ))}
      </ul>

      {active && (
        <div id="home-team-preview" role="presentation">
          <div id="home-team-preview-frame">
            {/* Decorative: the trigger already names the walker. */}
            <img src={active.photo} alt="" />
            <p id="home-team-preview-caption">{active.name} &middot; {active.role}</p>
          </div>
        </div>
      )}
    </div>
  );
}
