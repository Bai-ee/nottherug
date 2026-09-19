'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { TEAM } from '@/lib/content/team';

/** Same alternation the Instagram tiles use (InstagramGrid). */
const TILT_CLASSES = ['polaroid-tilt-left', 'polaroid-tilt-right'];

/**
 * Compact team roster for the homepage green band.
 *
 * One horizontal track instead of the /about page's full grid: photo, name
 * and role only, no bios — the roster is proof that the team is real and
 * local, and the bios live on /about.
 *
 * Two layouts, one markup. Above 900px the roster is a grid that fits the
 * band edge to edge and never scrolls. Below it the row becomes a swipe strip
 * (globals.css), matching the Instagram tiles at the same breakpoint: the
 * first chip sits flush with the heading, the rest run off the right edge.
 *
 * That strip is hand-scrolled, deliberately. It used to be driven from the
 * page's own vertical scroll via ScrollTrigger, which was inert once the
 * desktop row became a wrapping grid with nothing to scroll — and on the
 * strip it would have fought the viewer's thumb, snapping the row back on
 * every page scroll. The scrub is gone rather than gated.
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
            {/* Decorative: the trigger already names the walker.
                #home-team-preview-frame img (globals.css) is width:100%,
                height:auto, object-fit:contain, so the intrinsic
                width/height below must match this member's own photo (they
                are cropped to different aspect ratios per person, see
                lib/content/team.ts) rather than one shared guess. */}
            <Image src={active.photo} alt="" width={active.photoWidth} height={active.photoHeight} />
            <p id="home-team-preview-caption">{active.name} &middot; {active.role}</p>
          </div>
        </div>
      )}
    </div>
  );
}
