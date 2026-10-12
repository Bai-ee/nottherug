'use client';

import { useEffect, useRef, useState } from 'react';
import { TEAM, teamChipPhoto, type TeamMember } from '@/lib/content/team';
import TeamMemberDialog from './TeamMemberDialog';

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
 * A tap or click on a face, or on the name with its "›", opens that walker
 * in TeamMemberDialog: the whole photo larger, with their bio. Tap only, not
 * hover, so phones and desktops behave the same.
 * The chips are cropped squares; the dialog shows the whole frame.
 */
/** How far below the viewport the band may sit before its portraits start
    loading. Native `loading="lazy"` was tried first, but Chromium's own
    threshold is 1250-2500px and the band sits ~2400px down the page, so the
    browser fetched all six on load — an explicit observer keeps them back. */
const PORTRAIT_LOAD_MARGIN = '300px 0px';

/** DOM id fragment for a walker: "Beth Ann" -> "beth-ann". */
const slug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

/**
 * One chip portrait: an <img> (not a CSS background) so it can be withheld
 * until the band nears the viewport. teamChipPhoto() places it so the crop is
 * the old background-size/background-position, pixel for pixel. Until `load`
 * flips, the window shows its paper fill, as the background did while loading.
 */
function TeamChipImage({ member, load }: { member: TeamMember; load: boolean }) {
  if (!load) return null;
  const photo = teamChipPhoto(member);
  return (
    <picture>
      <source type="image/avif" srcSet={photo.avifSrcSet} sizes={photo.sizes} />
      <source type="image/webp" srcSet={photo.webpSrcSet} sizes={photo.sizes} />
      <img
        src={member.photo}
        alt=""
        width={member.photoWidth}
        height={member.photoHeight}
        decoding="async"
        style={photo.style}
      />
    </picture>
  );
}

export default function TeamScroller() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  // Portraits start loading once the band is within PORTRAIT_LOAD_MARGIN of
  // the viewport; without IntersectionObserver they load immediately.
  const [nearViewport, setNearViewport] = useState(false);
  const active = TEAM.find((member) => member.name === activeName) ?? null;

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: PORTRAIT_LOAD_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
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
              aria-haspopup="dialog"
              aria-label={`Open ${member.name}, Not The Rug dog walker`}
              onClick={() => setActiveName(member.name)}
            >
              <div className="polaroid-window">
                <div
                  className="home-team-chip-photo"
                  id={`home-team-chip-photo-${slug(member.name)}`}
                  aria-hidden="true"
                >
                  <TeamChipImage member={member} load={nearViewport} />
                </div>
              </div>
            </button>
            <div className="polaroid-caption" id={`home-team-chip-caption-${slug(member.name)}`}>
              {/* The name is a second way in, with the "›" saying it opens. */}
              <button
                type="button"
                className="home-team-chip-name-btn"
                id={`home-team-chip-open-${slug(member.name)}`}
                aria-haspopup="dialog"
                onClick={() => setActiveName(member.name)}
              >
                <span className="home-team-chip-name">{member.name}</span>
                <span className="home-team-chip-chevron" aria-hidden="true">›</span>
              </button>
              <div className="home-team-chip-role">{member.role}</div>
            </div>
          </li>
        ))}
      </ul>

      <TeamMemberDialog member={active} onClose={() => setActiveName(null)} />
    </div>
  );
}
