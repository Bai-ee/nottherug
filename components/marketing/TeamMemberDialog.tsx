'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TeamMember } from '@/lib/content/team';
import { useScrollLock } from './hooks/useScrollLock';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  /** The walker to show; null keeps the dialog closed. */
  member: TeamMember | null;
  onClose: () => void;
};

/**
 * One walker, larger: the whole portrait in a paper frame, name and role,
 * and their short bio when they have one (`shortBio` in lib/content/team.ts).
 * Opened by a tap or click on a homepage team chip (TeamScroller).
 *
 * Portalled to <body>: on phones #home-team-scroller is a sideways scroll
 * container in its own stacking layer, which would clip a fixed overlay
 * rendered inside it. Focus, Escape and the page scroll lock follow
 * ServiceDetailDialog.
 */
export default function TeamMemberDialog({ member, onClose }: Props) {
  if (!member || typeof document === 'undefined') return null;
  return createPortal(<TeamMemberSheet member={member} onClose={onClose} />, document.body);
}

function TeamMemberSheet({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useScrollLock(true);

  // Focus goes to the close button on open and back to the chip on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        frameRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      ).filter((el) => el.offsetParent !== null);
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
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      id="home-team-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-team-preview-caption"
      data-has-bio={member.shortBio ? 'true' : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div id="home-team-preview-frame" ref={frameRef}>
        <button
          ref={closeButtonRef}
          type="button"
          id="home-team-preview-close-btn"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        {/* Decorative: the caption names the walker. The intrinsic size must
            match this member's own photo (they are cropped to different
            aspect ratios, see lib/content/team.ts). */}
        <Image src={member.photo} alt="" width={member.photoWidth} height={member.photoHeight} />
        <p id="home-team-preview-caption">{member.name} &middot; {member.role}</p>
        {member.shortBio?.map((paragraph) => (
          <p key={paragraph} className="home-team-preview-bio">{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
