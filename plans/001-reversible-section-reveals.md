# 001 — Make section reveal animations reverse on scroll-up (play in, play out)

- **Status**: DONE
- **Commit**: 2561785
- **Severity**: MEDIUM
- **Category**: Missed opportunity / Interruptibility (AUDIT.md §4, §8)
- **Estimated scope**: 1 file (`app/page.tsx`), one function (~40 lines changed)

## Problem

`initSectionReveals()` in `app/page.tsx:146-187` reveals section headings and
cards once, the first time they scroll into view, and never hides them again.
The request is for entrances to reverse (play out) when the user scrolls back
up past a section, and replay when scrolling back down into it — a toggle,
not a one-shot.

Current code, verbatim:

```tsx
// app/page.tsx:144-187 — current
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
```

Two things block reversal:

1. `once: true` destroys each `ScrollTrigger.batch` instance after its first
   `onEnter` fires, so there is nothing left to fire `onLeave` /
   `onEnterBack` / `onLeaveBack`.
2. The `revealedEls` `WeakSet` permanently excludes an element from every
   future `initSectionReveals()` call once it has been revealed once — the
   opposite of "replay every time it scrolls into view."

This selector set (`.section h2`, `.service-card`, etc.) is shared by every
page in the SPA (`app/page.tsx`'s `#page-home`, `#page-services`,
`#page-about`, …), not just the homepage — `initSectionReveals()` is called
once per `showPage()` invocation for whichever page just became active. This
plan changes the shared mechanism, so the reveal-reverse behavior will apply
to every SPA page's sections, not only the four homepage sections. That is
intentional and consistent with "apply animations to each section" rather
than a special home-only carve-out — flag it in review if a home-only scope
was actually intended.

## Target

Both directions animate with `ease-out` (AUDIT.md §2: "Entering or exiting →
`ease-out`"; `ease-in` on UI is always a finding — do not use it for the
hide/exit leg even though it's the "reverse"). The reveal leg keeps its
existing marketing-page durations (700ms / 850ms — fine per AUDIT.md's
duration table, marketing/explanatory motion can exceed the 300ms UI budget).
The hide leg is quicker (400ms) since it is a passive consequence of
scrolling away, not something the user is meant to watch:

```tsx
// target — app/page.tsx, replacing lines 144-187
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
```

Notes on the target:

- `revealedEls` (the `WeakSet`) is removed entirely, along with both
  `.filter(el => !revealedEls.has(el))` calls and both
  `batch.forEach((el: Element) => revealedEls.add(el))` lines — nothing else
  in the file reads `revealedEls`, so removing it is a clean deletion, not a
  partial one. Confirm with `grep -n "revealedEls" app/page.tsx` before and
  after — expect 5 hits before, 0 after.
- `once: true` is deleted from both batches.
- `end: 'bottom top'` is added to both batches so `onLeave` fires when the
  batch's own bottom edge passes the viewport top (i.e., the section has
  fully scrolled past overhead) — without an explicit `end`, `ScrollTrigger`
  defaults to `end: 'bottom bottom'` on the trigger's own height, which is
  fine for card/heading-sized elements already, but stating it explicitly
  avoids relying on the default when triggers are small text elements.
- `overwrite: true` is added to every `gsap.to` so rapid scroll direction
  changes (user flicks up then down fast) retarget the in-flight tween
  instead of queuing a conflicting one — this is the transitions-not-keyframes
  requirement from AUDIT.md §4 (Interruptibility), satisfied here by letting
  each new `gsap.to` call cleanly override the previous one on the same
  targets rather than stacking.
- The hide-leg stagger is intentionally smaller (0.04/0.05 vs 0.06/0.085) —
  a fast, tight exit reads as "leaving together," while the slower reveal
  stagger reads as "arriving one at a time." This is a judgment call, not an
  AUDIT.md-cited value; treat the exact number as adjustable at feel-check
  time, not as a hard requirement.

## Repo conventions to follow

- Keep using `ScrollTrigger.batch` (not per-element `scrollTrigger` configs)
  — this file already uses `.batch()` for exactly this reveal pattern
  (`app/page.tsx:166`, `:178`), and batching keeps the existing
  performance characteristic (one callback per intersecting group instead of
  one per element) rather than introducing a second, parallel pattern.
- `gsap.defaults({ ease: 'power3.out', duration: 0.8 })` is already set at
  `app/page.tsx:14` — the reveal legs above already match this default ease;
  the plan keeps `ease: 'power3.out'` explicit on every call anyway (matching
  the existing code's style of always stating it) rather than relying on the
  default silently applying to the new hide-leg calls too.
- `prefersReducedMotion` is already checked at the top of the function
  (`app/page.tsx:147`) and short-circuits the whole thing — no change needed
  there; reduced-motion users get the current no-animation (static, fully
  visible via the CSS beneath, not the `gsap.set` hidden state) behavior
  unchanged, which matches the existing convention for this component.

## Steps

1. Open `app/page.tsx`. Confirm lines 144-187 match the "Problem" block
   above exactly (`grep -n "revealedEls\|initSectionReveals" app/page.tsx`
   should show the same 8 hits listed under Problem). If they don't match,
   STOP and report the drift instead of improvising around it.
2. Replace lines 144-187 with the "Target" block above. Do not change
   anything above line 144 or below line 187 in this step.
3. Run `grep -n "revealedEls" app/page.tsx` — expect zero output.
4. Run `grep -n "once: true" app/page.tsx` — confirm the two hits that were
   inside `initSectionReveals` are gone (other `once: true` usages elsewhere
   in the file, e.g. `ScrollTrigger.create({ ..., once: true })` in
   `initStatCounters()` at `app/page.tsx:113-116`, are out of scope — do not
   touch them).

## Boundaries

- Do NOT touch `initStatCounters()`, `initHeroEntrance()`,
  `initHeroParallax()`, or `initNavScroll()` — the hero already has its own
  entrance animation and is explicitly out of scope per the request.
- Do NOT touch `pageTransitionIn()` or `showPage()` — the kill-all-triggers-
  then-rebuild flow on page switch (`app/page.tsx:210-222`) is unrelated
  plumbing and must keep working exactly as-is; `initSectionReveals()` is
  still called the same way, with the same signature.
- Do NOT add a new dependency. GSAP + ScrollTrigger are already imported and
  registered (`app/page.tsx:10-13`).
- Do NOT scope this to `#page-home` only — see the Problem section's note on
  why this intentionally applies sitewide via the shared selector set.
- If the line numbers or code shape have drifted from the "Problem" excerpt
  (this file has had concurrent edits this session), STOP and report instead
  of guessing which version is current.

## Verification

- **Mechanical**: `npx tsc --noEmit -p .` from the repo root — expect no new
  errors (the file is `.tsx` under `"use client"`, no type changes are
  introduced by this plan since `batch: { onEnter, onEnterBack, onLeave,
  onLeaveBack }` are all part of GSAP's `ScrollTrigger.batch` types already).
- **Feel check** (open `/` in a browser, scroll slowly):
  - Scrolling down: each section's heading fades/slides up into place
    exactly as it does today (no visible regression in the reveal itself).
  - Scrolling down further, past a section: that section's heading and cards
    fade back down and out (`autoAlpha: 0, y: 26/52`) shortly after their
    bottom edge clears the viewport top — they should not be visible again
    until scrolled back to.
  - Scrolling back up into a previously-passed section: it replays the same
    reveal motion (not a hard cut back to visible).
  - Scrolling back up past a section near the top: it hides again the same
    way scrolling down past it does.
  - Flick the scroll wheel/trackpad rapidly up and down across a section
    boundary 4-5 times: elements should never freeze mid-transform or flicker
    between two conflicting tweens — `overwrite: true` should keep the
    visible state always tracking scroll direction smoothly.
  - In DevTools' Animations panel, set playback to 10% on one reveal and one
    hide tween and confirm both ease out (fast start, slow settle) — neither
    should look like it eases in (slow start).
  - Toggle `prefers-reduced-motion` (Rendering panel) and reload: sections
    should render immediately visible with no reveal/hide motion at all,
    same as before this plan (unchanged early-return behavior).
- **Done when**: scrolling up and down repeatedly across every section on
  `/` shows each section's heading/cards reversibly fade+slide in and out in
  sync with scroll direction, with no console errors and no stuck/invisible
  content after rapid scroll direction changes.
