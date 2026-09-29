'use client';

import { useEffect } from 'react';

/**
 * Locks the page behind a modal so it cannot scroll — wheel, trackpad, keys
 * or touch — and puts the visitor back where they were on close.
 *
 * `overflow: hidden` on <body> alone is not enough on this site: globals.css
 * sets `html { overflow-x: hidden }`, which makes <html> the scrolling element
 * in some browsers, and touch scrolling ignores it either way. So the body is
 * pinned at its current offset (the same technique WelcomeWalkModal uses).
 *
 * Counted, so if two modals using this hook are ever open at once, closing
 * one never unlocks the page underneath the other.
 */
let lockCount = 0;
let restore: (() => void) | null = null;

function lock() {
  lockCount += 1;
  if (lockCount > 1) return;

  const { body, documentElement: html } = document;
  const scrollY = window.scrollY;
  const previous = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
  };

  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';

  restore = () => {
    html.style.overflow = previous.htmlOverflow;
    body.style.overflow = previous.bodyOverflow;
    body.style.position = previous.position;
    body.style.top = previous.top;
    body.style.width = previous.width;
    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
  };
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  restore?.();
  restore = null;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
