'use client';

import { useEffect } from 'react';

interface MarqueeHoverBoostProps {
  /** id of the element whose hover triggers the boost (the marquee strip). */
  stripId: string;
  /** id of the track running the `scrollTrack` CSS animation. */
  trackId: string;
  /** Playback-rate multiplier while hovered. */
  boost?: number;
}

/**
 * Speeds a CSS marquee up while the pointer is over it. Changes the running
 * animation's playbackRate (updatePlaybackRate keeps the current position), so
 * there is no jump or restart the way changing animation-duration would cause,
 * and eases between rates over a few frames. Hover-capable pointers only; with
 * reduced motion the track has no animation and this does nothing.
 */
export default function MarqueeHoverBoost({ stripId, trackId, boost = 2 }: MarqueeHoverBoostProps) {
  useEffect(() => {
    const strip = document.getElementById(stripId);
    const track = document.getElementById(trackId);
    if (!strip || !track) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    const findAnimation = () =>
      track.getAnimations().find((a) => (a as CSSAnimation).animationName === 'scrollTrack');

    let rate = 1;
    let target = 1;
    let frame = 0;

    const step = () => {
      const animation = findAnimation();
      if (!animation) return;
      rate += (target - rate) * 0.18;
      if (Math.abs(target - rate) < 0.01) rate = target;
      animation.updatePlaybackRate(rate);
      if (rate !== target) frame = requestAnimationFrame(step);
    };
    const setTarget = (next: number) => {
      target = next;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    };

    const onEnter = () => setTarget(boost);
    const onLeave = () => setTarget(1);
    strip.addEventListener('mouseenter', onEnter);
    strip.addEventListener('mouseleave', onLeave);

    return () => {
      strip.removeEventListener('mouseenter', onEnter);
      strip.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(frame);
      findAnimation()?.updatePlaybackRate(1);
    };
  }, [stripId, trackId, boost]);

  return null;
}
