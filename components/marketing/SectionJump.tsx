'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSectionLinks } from '@/lib/navigation/sections';
import { scrollToSectionId } from '@/lib/navigation/scrollToSection';
import { useActiveSection } from './hooks/useActiveSection';

// Same selector WelcomeWalkModal.tsx and SchedulingDialog.tsx use for their
// own focus traps (not centralized in this codebase; matching the existing
// duplication rather than introducing a new shared module for one line).
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile in-page section nav: a floating button pinned bottom-left that fans a
 * short stack of destination pills up and out of itself. Desktop gets the left
 * rail (SectionRail) instead — the two read the same SECTION_NAV contract, so
 * they never disagree about order or labels.
 *
 * Bottom-LEFT is not a style choice: #home-floating-logo-badge is fixed at
 * right/bottom 14px on the home route (globals.css), so the right corner is
 * already taken. This is also deliberately not a hamburger — #nav-hamburger-toggle
 * owns route navigation; this owns in-page navigation.
 *
 * Styles live in app/section-jump.css, imported by the marketing layout
 * alongside the rail's, which keeps both off the admin bundle.
 */

/** Share of the viewport that must scroll past before the button appears. */
const REVEAL_RATIO = 0.6;

export default function SectionJump() {
  const pathname = usePathname();
  const links = getSectionLinks(pathname);
  const activeId = useActiveSection(links);

  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  // Set on select, consumed after the menu has closed — see the scroll effect.
  const pendingTargetRef = useRef<string | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    // Focus always comes back to the trigger; preventScroll keeps that from
    // fighting the smooth scroll a selection kicks off.
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Hide the control over the hero: the first screen has its own CTAs and the
  // page hasn't earned a "jump" affordance yet. Plain passive scroll listener
  // coalesced into one rAF — cheaper than a ScrollTrigger for one boolean.
  useEffect(() => {
    if (links.length === 0) return; // routes with no section nav listen to nothing
    let frame = 0;
    const evaluate = () => {
      frame = 0;
      setRevealed(window.scrollY > window.innerHeight * REVEAL_RATIO);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(evaluate);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    evaluate(); // covers restored scroll positions on back/forward navigation
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [links.length]);

  // Scroll lock. It has to go on <html>, not <body>: globals.css sets
  // `html { overflow-x: hidden }`, which makes <html> the element that
  // propagates overflow to the viewport, so a body-level lock does nothing.
  // Clipping the scroll container preserves scroll position exactly, so the
  // fixed nav and the page underneath never jump on open or close.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const { body } = document;
    // Only classic (non-overlay) scrollbars leave a gutter to compensate for;
    // on touch devices this is 0 and nothing is touched.
    const gutter = window.innerWidth - html.clientWidth;
    const previousOverflow = html.style.overflow;
    const previousPadding = body.style.paddingRight;
    html.style.overflow = 'hidden';
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    return () => {
      html.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Escape closes, Tab is trapped inside the menu, and focus moves into it on
  // open so a keyboard or screen-reader user lands on the destinations rather
  // than behind them. The trap matters here specifically because this menu is
  // mounted in normal DOM order after the page content (see
  // app/(marketing)/layout.tsx), not portaled — without it, Shift+Tab from the
  // first item would walk focus backward into the dimmed-but-still-interactive
  // page behind the scrim.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const menu = menuRef.current;
      if (!menu) return;
      const focusable = Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const menu = menuRef.current;
    const target =
      menu?.querySelector<HTMLButtonElement>('.section-jump-item[aria-current="true"]') ??
      menu?.querySelector<HTMLButtonElement>('.section-jump-item');
    target?.focus({ preventScroll: true });
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeMenu]);

  // Deferred on purpose: while the menu is open the scroll container is
  // clipped, so a scroll issued from the click handler would be swallowed.
  // React runs the lock effect's cleanup before this effect body, so by the
  // time we get here scrolling is live again.
  useEffect(() => {
    if (open) return;
    const target = pendingTargetRef.current;
    if (!target) return;
    pendingTargetRef.current = null;
    scrollToSectionId(target);
  }, [open]);

  if (links.length === 0) return null;

  const handleSelect = (id: string) => {
    pendingTargetRef.current = id;
    closeMenu();
  };

  return (
    <div
      id="section-jump-root"
      data-open={open ? 'true' : 'false'}
      data-revealed={revealed ? 'true' : 'false'}
    >
      {/* Dimming layer. A div rather than a button: it is redundant with both
          the trigger and Escape, so it stays out of the tab order. */}
      <div id="section-jump-scrim" aria-hidden="true" onClick={closeMenu} />

      <nav id="section-jump-menu" aria-label="Page sections" ref={menuRef}>
        <ul id="section-jump-list">
          {links.map((link) => (
            <li key={link.id} className="section-jump-row">
              <button
                type="button"
                id={`section-jump-item-${link.id}`}
                className="section-jump-item"
                aria-current={activeId === link.id ? 'true' : undefined}
                // The closed menu is already unfocusable via visibility:hidden;
                // this keeps that true if the CSS ever changes.
                tabIndex={open ? 0 : -1}
                onClick={() => handleSelect(link.id)}
              >
                <span className="section-jump-item-marker" aria-hidden="true" />
                <span className="section-jump-item-label">{link.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        id="section-jump-trigger"
        ref={triggerRef}
        aria-label="Jump to a section"
        aria-expanded={open}
        aria-controls="section-jump-menu"
        onClick={() => (open ? closeMenu() : setOpen(true))}
      >
        {/* Both glyphs stay mounted and cross-fade, so the swap has no reflow.
            A map pin, not three bars: this is "where am I on the page", and the
            hamburger already means "go to another page". */}
        <svg
          id="section-jump-trigger-icon-pin"
          className="section-jump-trigger-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 21.5c4.2-4.6 6.3-8 6.3-10.7a6.3 6.3 0 1 0-12.6 0c0 2.7 2.1 6.1 6.3 10.7Z" />
          <circle cx="12" cy="10.6" r="2.4" />
        </svg>
        <svg
          id="section-jump-trigger-icon-close"
          className="section-jump-trigger-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m7 7 10 10M17 7 7 17" />
        </svg>
      </button>
    </div>
  );
}
