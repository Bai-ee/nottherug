'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { loadGsap, prefersReducedMotion, type GsapBundle } from './gsapLoader';
import {
  DARK_SECTION_SELECTOR,
  PAW_WALK_UNITS,
  PAW_WALK_WINDOWS,
  pawStepsForRouteLength,
} from '@/lib/marketing/paw-walk-path';
import {
  clearStoredPath,
  PAW_WALK_DEFAULTS,
  pawWalkDevFlags,
  readStoredPath,
  writeStoredPath,
  type PawWalkTuning,
} from '@/lib/marketing/paw-walk-tuning';

type GsapContext = ReturnType<GsapBundle['gsap']['context']>;

/** Fixed character of the gait. Everything a designer dials lives in
    PawWalkTuning (lib/marketing/paw-walk-tuning.ts) instead. */
const GAIT = {
  /** Per-print rotation and along-route jitter, so the gait isn't mechanical. */
  rotationJitter: 4,
  strideJitter: 0.14,
  /** Samples taken along the path before walking it at a fixed stride. The
      normalised box is stretched anisotropically over the page, so even steps
      in path space are uneven in pixels — this is what evens them back out. */
  samples: 1400,
  ease: 'power2.out',
  enterScale: 0.86,
  enterRise: 7,
};

/** Deterministic -1..1 wobble: organic, but identical on every re-layout. */
function wobble(i: number, seed: number): number {
  const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

interface PlacedPrint {
  el: HTMLElement;
  /** 0..1 position down the page's scroll range where this print lands. */
  land: number;
  /** Resting opacity from the window this print sits in, if it sets one. */
  opacity?: number;
}

/**
 * Puts a route dragged in a previous session back on the element before it is
 * measured. Without this a reload silently threw the drag away.
 */
function applyStoredPath(layer: HTMLElement): void {
  const stored = readStoredPath();
  if (!stored) return;
  layer.querySelector<SVGPathElement>('#home-paw-walk-path')?.setAttribute('d', stored);
}

/**
 * Walks the SVG route at a fixed on-screen stride and positions one print per
 * step, alternating sides of the line. Pure DOM + geometry, no gsap, so the
 * reduced-motion branch and the live path editor can both reuse it.
 */
function layoutPawWalk(layer: HTMLElement, tuning: PawWalkTuning): PlacedPrint[] {
  const page = layer.parentElement;
  const path = layer.querySelector<SVGPathElement>('#home-paw-walk-path');
  const prints = Array.from(layer.querySelectorAll<HTMLElement>('.home-paw-step'));
  if (!page || !path || !prints.length) return [];

  const pageW = page.offsetWidth;
  const pageH = page.offsetHeight;
  // Read the box off the SVG rather than assuming PAW_WALK_UNITS, so a changed
  // viewBox is honoured rather than silently ignored.
  const box = (path.ownerSVGElement ?? path.closest('svg'))?.viewBox.baseVal;
  const sx = pageW / (box?.width || PAW_WALK_UNITS);
  const sy = pageH / (box?.height || PAW_WALK_UNITS);

  // Sample the route in path space, map each sample into page pixels, and
  // keep a running pixel length so the stride below is a real on-screen
  // distance rather than a path-space one.
  const total = path.getTotalLength();
  const xs = new Float64Array(GAIT.samples + 1);
  const ys = new Float64Array(GAIT.samples + 1);
  const cum = new Float64Array(GAIT.samples + 1);
  for (let k = 0; k <= GAIT.samples; k++) {
    const p = path.getPointAtLength((total * k) / GAIT.samples);
    xs[k] = p.x * sx;
    ys[k] = p.y * sy;
    cum[k] = k === 0 ? 0 : cum[k - 1] + Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]);
  }
  const routeLength = cum[GAIT.samples];

  // Top of the section the walk is gated on: anything above it is laid out
  // (so the gait downstream is unchanged) but never handed to the timeline.


  // Dark bands, used to decide which prints need inverting to stay visible.
  const pageTop = page.getBoundingClientRect().top + window.scrollY;
  // Visible stretches, resolved to page-relative pixels. A window whose
  // elements are missing from the page is skipped rather than swallowing the
  // whole trail.
  const windows = PAW_WALK_WINDOWS.flatMap((w) => {
    const from = page.querySelector<HTMLElement>(w.from);
    const to = page.querySelector<HTMLElement>(w.to);
    if (!from || !to) return [];
    return [
      {
        top: from.getBoundingClientRect().top + window.scrollY - pageTop,
        // Bottom edge, so the last prints finish underneath the closing element
        // rather than stopping short of it.
        bottom: to.getBoundingClientRect().bottom + window.scrollY - pageTop,
        opacity: w.opacity,
      },
    ];
  });
  const bands = Array.from(page.children)
    .filter((el): el is HTMLElement => el instanceof HTMLElement && el.matches(DARK_SECTION_SELECTOR))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY - pageTop;
      return { top, bottom: top + r.height };
    });

  // A tuned size wins over the CSS clamp; 0 means "leave the clamp alone".
  if (tuning.size > 0) layer.style.setProperty('--home-paw-size', `${tuning.size}px`);
  else layer.style.removeProperty('--home-paw-size');
  const pawSize = prints[0].offsetWidth || 44;
  const stride = pawSize * tuning.strideRatio;
  const scrollRange = Math.max(pageH - window.innerHeight, 1);
  const placed: PlacedPrint[] = [];

  let cursor = 0;
  let sample = 0;
  for (let i = 0; i < prints.length; i++) {
    const print = prints[i];
    if (cursor > routeLength) {
      print.style.display = 'none';
      continue;
    }

    while (sample < GAIT.samples && cum[sample + 1] < cursor) sample++;
    const next = Math.min(sample + 1, GAIT.samples);

    // Heading, in page pixels, taken across the current sample pair.
    let hx = xs[next] - xs[sample];
    let hy = ys[next] - ys[sample];
    const mag = Math.hypot(hx, hy) || 1;
    hx /= mag;
    hy /= mag;

    // Left/right track: offset perpendicular to the heading, alternating.
    const side = i % 2 === 0 ? 1 : -1;
    const x = xs[sample] + -hy * tuning.trackHalfWidth * side;
    const y = ys[sample] + hx * tuning.trackHalfWidth * side;

    const visibleIn = windows.find((w) => y >= w.top && y <= w.bottom);
    if (!visibleIn) {
      // Between windows the route is still walked but nothing shows: the stride
      // keeps advancing, so the prints inside a window land exactly where they
      // would if the whole route were visible.
      print.style.display = 'none';
    } else {
      print.style.display = '';
      print.style.left = `${x - pawSize / 2}px`;
      print.style.top = `${y - pawSize / 2}px`;
      // The paw art points toes-up at 0deg, so this turns it to face the heading.
      print.dataset.pawRotation = String(
        (Math.atan2(hx, -hy) * 180) / Math.PI + wobble(i, 2) * GAIT.rotationJitter
      );
      if (bands.some((b) => y >= b.top && y < b.bottom)) print.dataset.pawTone = 'dark';
      else delete print.dataset.pawTone;

      placed.push({
        el: print,
        land: Math.min(Math.max((y - tuning.lead * window.innerHeight) / scrollRange, 0), 1),
        opacity: visibleIn.opacity,
      });
    }

    cursor += stride * (1 + wobble(i, 3) * GAIT.strideJitter);
  }

  return placed;
}

/**
 * DOM-measuring half of the print-count estimate (see `pawStepsForRouteLength`
 * for the arithmetic half). Samples the route the same way `layoutPawWalk`
 * does — same GAIT.samples, same page-box scaling — but only needs the total
 * pixel length, not a per-print placement, so it can run before the real
 * print count is known. `fallbackPawSize` is used only when the tuning has no
 * fixed size (0 = "use the CSS clamp"); the shipped default has a fixed size,
 * so this DOM read is skipped in production.
 */
export function estimateRequiredPawSteps(
  layer: HTMLElement,
  tuning: PawWalkTuning,
  fallbackPawSize: number
): number {
  const page = layer.parentElement;
  const path = layer.querySelector<SVGPathElement>('#home-paw-walk-path');
  if (!page || !path) return 0;

  const pageW = page.offsetWidth;
  const pageH = page.offsetHeight;
  const box = (path.ownerSVGElement ?? path.closest('svg'))?.viewBox.baseVal;
  const sx = pageW / (box?.width || PAW_WALK_UNITS);
  const sy = pageH / (box?.height || PAW_WALK_UNITS);

  const total = path.getTotalLength();
  let routeLength = 0;
  let prevX = 0;
  let prevY = 0;
  for (let k = 0; k <= GAIT.samples; k++) {
    const p = path.getPointAtLength((total * k) / GAIT.samples);
    const x = p.x * sx;
    const y = p.y * sy;
    if (k > 0) routeLength += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
  }

  const pawSize = tuning.size > 0 ? tuning.size : fallbackPawSize;
  return pawStepsForRouteLength(routeLength, pawSize, tuning.strideRatio);
}

/**
 * Scroll-scrubbed paw walk down the home page, starting at the gate section
 * (PAW_WALK_GATE_SELECTOR) so the hero scrolls clean. Each print is pinned to
 * the point on the route where it sits, so it lands as that point passes the
 * walking line and lifts back off when you scroll up — the trail always ends
 * where you are on the page.
 *
 * Degrades to a static trail under prefers-reduced-motion, and to nothing if
 * gsap fails to load (prints are hidden in CSS until something reveals them).
 *
 * In dev, `?pawpath` makes the route visible and editable via MotionPathHelper
 * and `?pawtune` opens the slider panel that drives `tuning`.
 */
export function useHomePawWalk(
  layerRef: RefObject<HTMLElement | null>,
  tuning: PawWalkTuning = PAW_WALK_DEFAULTS,
  /** How many `.home-paw-step` prints are currently mounted. Passed back in
      (rather than read from the DOM) so this effect re-runs — and rebuilds
      against the bigger set — the moment the caller mounts more of them. */
  renderedStepCount: number,
  /** Reports the print size the CSS clamp resolved to, so the tuner's size
      slider can start from what is actually on screen. */
  onMeasure?: (pawSize: number) => void,
  /** Called with the measured requirement when the route needs more prints
      than are currently mounted (first layout, or a resize that made the
      page taller). The caller owns the actual DOM count and re-renders with
      enough of a buffer that this rarely fires twice in a row. */
  onRequireSteps?: (required: number) => void
) {
  // Re-running on every slider move is what makes the tuner feel live: the
  // route is re-walked and the timeline rebuilt from the new numbers.
  const tuningKey = JSON.stringify(tuning);
  // Set by the effect below; the path editor calls through it so it survives
  // those rebuilds.
  const relayoutRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    applyStoredPath(layer);

    // The route may need more prints than are currently mounted (first paint
    // before the real count is known, or a resize that made the page taller).
    // Bail and let the caller re-render with enough of them — this effect
    // re-runs automatically once renderedStepCount changes.
    const measuredFallback = layer.querySelector<HTMLElement>('.home-paw-step')?.offsetWidth || 44;
    const required = estimateRequiredPawSteps(layer, tuning, measuredFallback);
    if (onRequireSteps && required > renderedStepCount) {
      onRequireSteps(required);
      return;
    }

    if (prefersReducedMotion()) {
      layoutPawWalk(layer, tuning);
      layer.dataset.pawWalkState = 'static';
      return;
    }

    let cancelled = false;
    let ctx: GsapContext | undefined;
    let relayout: (() => void) | undefined;
    let ScrollTriggerRef: GsapBundle['ScrollTrigger'] | undefined;

    loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;
        ScrollTriggerRef = ScrollTrigger;

        ctx = gsap.context(() => {
          const build = () => {
            // A resize can grow the route past what's mounted; same bail as
            // above, so the next ScrollTrigger refresh (or the effect re-run
            // below) lays out against the bigger set instead of leaving the
            // last stretch of a newly-taller page bare.
            const fallback = layer.querySelector<HTMLElement>('.home-paw-step')?.offsetWidth || 44;
            const stillRequired = estimateRequiredPawSteps(layer, tuning, fallback);
            if (onRequireSteps && stillRequired > renderedStepCount) {
              onRequireSteps(stillRequired);
              return null;
            }
            const placed = layoutPawWalk(layer, tuning);
            if (!placed.length) return null;
            onMeasure?.(placed[0].el.offsetWidth);

            gsap.set(
              placed.map((p) => p.el),
              {
                autoAlpha: 0,
                scale: GAIT.enterScale,
                y: -GAIT.enterRise,
                rotation: (_i: number, el: HTMLElement) => Number(el.dataset.pawRotation) || 180,
              }
            );

            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: layer.parentElement ?? layer,
                start: 'top top',
                end: 'bottom bottom',
                scrub: tuning.scrub,
                invalidateOnRefresh: true,
              },
            });
            // Each print is placed at its own point in the page's scroll range
            // rather than on a shared stagger, so horizontal runs of the route
            // don't drift out of step with the scroll.
            placed.forEach(({ el, land, opacity }) => {
              tl.to(
                el,
                {
                  autoAlpha: opacity ?? tuning.opacity,
                  scale: 1,
                  y: 0,
                  duration: tuning.stepDuration,
                  ease: GAIT.ease,
                },
                land * (1 - tuning.stepDuration)
              );
            });
            // Anchor the timeline's length to the full scroll range even when
            // the last print lands early.
            tl.to({}, { duration: 0.001 }, 1);
            return tl;
          };

          let timeline = build();

          relayout = () => {
            timeline?.scrollTrigger?.kill();
            timeline?.kill();
            timeline = build();
          };
          // The path editor lives in its own effect and re-walks the route
          // through this ref, so a slider move rebuilds the timeline without
          // tearing the editor down.
          relayoutRef.current = relayout;
          ScrollTrigger.addEventListener('refreshInit', relayout);
        }, layer);
      })
      .catch((err) => {
        console.warn('[useHomePawWalk] gsap unavailable; paw walk not rendered.', err);
      });

    return () => {
      cancelled = true;
      if (relayout && ScrollTriggerRef) ScrollTriggerRef.removeEventListener('refreshInit', relayout);
      relayoutRef.current = undefined;
      ctx?.revert();
    };
    // tuning is reconstructed on every change; tuningKey is its stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerRef, tuningKey, renderedStepCount, onMeasure, onRequireSteps]);

  // Dev path editor, mounted once. Deliberately NOT keyed on tuningKey: every
  // enable re-stretches the route into edit space, so rebuilding it per slider
  // move both dropped the handles and compounded that transform, which walked
  // the paws off the page.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || prefersReducedMotion() || !pawWalkDevFlags().path) return;

    let cancelled = false;
    let killEditor: (() => void) | undefined;

    void enablePathEditor(layer, () => relayoutRef.current?.()).then((kill) => {
      // The effect can be torn down before this resolves; without this the
      // editor leaks and its handles stack up on top of the live one.
      if (cancelled) {
        kill();
        return;
      }
      killEditor = kill;
    });

    return () => {
      cancelled = true;
      killEditor?.();
    };
  }, [layerRef]);
}

/** Increments per enable, so a teardown can tell whether it still owns the layer. */
let pathEditorGeneration = 0;

/**
 * MotionPathHelper draws its anchors as ~6 user-unit squares, and the route's
 * SVG is stretched over the page (a 1000-unit box on a ~9600px column), so they
 * render as 6x64px slivers that are almost impossible to click — the handles
 * never appear because the click misses.
 *
 * Each anchor is centred on its own origin ("translate(x,y) translate(0,0)"),
 * so a scale APPENDED to that transform resizes it in place: it corrects the
 * squash and makes the target big enough to hit, while the translates the
 * helper drives stay untouched and dragging maps exactly as before. An earlier
 * version set a CSS transform instead, which replaced the helper's positioning
 * and made the marks vanish on click.
 */
function enlargeEditorAnchors(svg: SVGSVGElement): () => void {
  const MARK = / scale\([^)]*\)$/;
  const GRAB = 2.3;

  const apply = () => {
    const rect = svg.getBoundingClientRect();
    const box = svg.viewBox.baseVal;
    if (!rect.width || !rect.height || !box.width || !box.height) return;
    const correction = (rect.width / box.width) / (rect.height / box.height);
    svg.querySelectorAll<SVGGraphicsElement>('.path-editor-selection path.path-editor').forEach((mark) => {
      const transform = mark.getAttribute('transform');
      // Anchors carry a translate; the route path itself has none.
      if (!transform || !transform.startsWith('translate(')) return;
      const next = `${transform.replace(MARK, '')} scale(${GRAB},${(correction * GRAB).toFixed(4)})`;
      // Writing an identical value still emits a mutation record, which would
      // feed this observer forever — only write when something changed.
      if (next !== transform) mark.setAttribute('transform', next);
    });
  };

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(svg, { subtree: true, childList: true, attributes: true, attributeFilter: ['transform'] });
  window.addEventListener('resize', apply);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', apply);
  };
}


/**
 * Dev-only: turns the route into a draggable SVG path (points + bezier
 * handles) and re-walks the paws on every drag. `__pawWalkPath()` returns the
 * current `d` for pasting back into lib/marketing/paw-walk-path.ts.
 */
async function enablePathEditor(layer: HTMLElement, relayout: () => void): Promise<() => void> {
  const path = layer.querySelector<SVGPathElement>('#home-paw-walk-path');
  if (!path) return () => {};

  const svg = path.ownerSVGElement;
  const page = layer.parentElement;
  if (!svg || !page) return () => {};

  const [{ MotionPathHelper }, { MotionPathPlugin }, { gsap }] = await Promise.all([
    import('gsap/MotionPathHelper'),
    import('gsap/MotionPathPlugin'),
    loadGsap(),
  ]);
  gsap.registerPlugin(MotionPathHelper, MotionPathPlugin);

  // React mounts effects twice in dev (StrictMode), so two editors can be in
  // flight at once. Only the editor that currently owns the layer is allowed to
  // restore it on teardown.
  const owner = String(++pathEditorGeneration);

  // MotionPathHelper draws its handles into this same SVG, so the route must
  // be left in the coordinate space the SVG already declares. An earlier
  // version re-stretched the box (and `d` with it) to keep the anchors from
  // being drawn as slivers; the helper then applied the page aspect a second
  // time and rendered its overlay ~10x too tall — the second, wrong-looking
  // stroke. Edit in the authored space instead.
  const originalViewBox = svg.getAttribute('viewBox') ?? `0 0 ${PAW_WALK_UNITS} ${PAW_WALK_UNITS}`;
  /** The path as authored — no conversion needed now that editing is in-space. */
  const toStoredSpace = () => MotionPathPlugin.rawPathToString(MotionPathPlugin.getRawPath(path));

  applyStoredPath(layer);

  /**
   * Clears editor graphics left in the SVG by a previous instance. A hot
   * reload, or an editor rebuilt after a point delete, can leave its group
   * behind — and a second group draws a second blue route over the first,
   * which reads as two paths.
   */
  const dropStaleEditorGraphics = () => {
    svg.querySelectorAll('.path-editor-g').forEach((group) => group.remove());
  };
  dropStaleEditorGraphics();

  if (document.querySelectorAll('#home-paw-walk-layer').length > 1) {
    console.warn('[paw walk] more than one paw layer is mounted; reload to clear the duplicate.');
  }

  layer.dataset.pawPathEdit = 'on';
  layer.dataset.pawPathEditOwner = owner;
  /** Persist first, then re-walk: a reload now keeps whatever was just dragged. */
  const save = () => {
    writeStoredPath(toStoredSpace());
    relayout();
  };
  let editor = MotionPathHelper.editPath(path, { onUpdate: save, onRelease: save });
  relayout();
  const stopAnchorSizing = enlargeEditorAnchors(svg);

  /**
   * Removes one anchor from the route. The helper has no delete of its own, so
   * this edits the raw path: each anchor owns the control point before it and
   * the one after it, and dropping all three joins its neighbours directly,
   * which keeps every other anchor's handles exactly as they were dragged.
   *
   * The helper caches the path it was given, so it is rebuilt afterwards.
   */
  const deleteAnchor = (index: number) => {
    const [data] = MotionPathPlugin.getRawPath(path) as unknown as number[][];
    const anchorCount = (data.length + 4) / 6;
    if (anchorCount <= 2) {
      console.warn('[paw walk] a route needs at least two points.');
      return false;
    }
    if (index < 0 || index >= anchorCount) return false;

    const next = data.slice();
    if (index === 0) next.splice(0, 6);
    else if (index === anchorCount - 1) next.splice(6 * index - 4, 6);
    else next.splice(6 * index - 2, 6);

    // Kill first: the helper writes its own cached copy of the path back to the
    // element on teardown, which silently undid the edit when this ran after.
    editor?.kill?.();
    dropStaleEditorGraphics();
    path.setAttribute('d', MotionPathPlugin.rawPathToString([next] as never));
    // gsap caches the parsed path on the element; without this the rebuilt
    // editor (and the paw layout) would re-read the old geometry.
    delete (path as unknown as { _gsRawPath?: unknown })._gsRawPath;
    editor = MotionPathHelper.editPath(path, { onUpdate: save, onRelease: save });
    save();
    console.info(`[paw walk] deleted point ${index}; ${anchorCount - 1} left.`);
    return true;
  };

  /** Anchor nearest a screen point, in page pixels, or -1 if nothing is close. */
  const anchorNear = (clientX: number, clientY: number, within = 26) => {
    const [data] = MotionPathPlugin.getRawPath(path) as unknown as number[][];
    const matrix = svg.getScreenCTM();
    if (!matrix) return -1;
    let best = -1;
    let bestDistance = within;
    for (let i = 0; i * 6 < data.length + 4; i++) {
      const x = data[6 * i];
      const y = data[6 * i + 1];
      if (x === undefined || y === undefined) break;
      const screen = new DOMPoint(x, y).matrixTransform(matrix);
      const distance = Math.hypot(screen.x - clientX, screen.y - clientY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  };

  // Alt-click an anchor to remove it. Alt is what keeps this clear of the
  // helper's own drag handling, which owns plain clicks and drags.
  const onAltClick = (event: PointerEvent) => {
    if (!event.altKey) return;
    const index = anchorNear(event.clientX, event.clientY);
    if (index < 0) return;
    event.preventDefault();
    event.stopPropagation();
    deleteAnchor(index);
  };
  svg.addEventListener('pointerdown', onAltClick, true);

  const win = window as unknown as Record<string, unknown>;
  win.__pawWalkPath = toStoredSpace;
  /** Delete a point by index, for when alt-clicking is fiddly. */
  win.__pawWalkDeletePoint = (index: number) => deleteAnchor(index);
  win.__pawWalkPathReset = () => {
    clearStoredPath();
    window.location.reload();
  };
  /** Writes the current route into lib/marketing/paw-walk-path.ts (dev only). */
  win.__pawWalkPathSave = async () => {
    const d = toStoredSpace();
    const res = await fetch('/api/dev/paw-walk-path', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ d }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('[paw walk] save failed:', body.error);
      return body;
    }
    // The file it just wrote is the authored route again, so the localStorage
    // copy would only shadow it.
    clearStoredPath();
    console.info('[paw walk] saved to lib/marketing/paw-walk-path.ts');
    return body;
  };
  console.info(
    '[paw walk] Path editing on. Drags survive a reload (localStorage).\n' +
      '  __pawWalkPathSave()     → write the current route into lib/marketing/paw-walk-path.ts\n' +
      '  copy(__pawWalkPath())   → the same route on the clipboard, to paste by hand\n' +
      '  alt-click a point       → delete it\n' +
      '  __pawWalkDeletePoint(i) → delete point i by index\n' +
      '  __pawWalkPathReset()    → discard the saved drag and reload on the authored route'
  );

  return () => {
    editor?.kill?.();
    // A newer editor took the layer while this one was being torn down; it owns
    // the stretched box now, so leave the geometry alone.
    if (layer.dataset.pawPathEditOwner !== owner) return;
    // Keep whatever was dragged, and put the declared viewBox back in case
    // something changed it while the editor was open.
    const exported = toStoredSpace();
    svg.setAttribute('viewBox', originalViewBox);
    path.setAttribute('d', exported);
    delete layer.dataset.pawPathEdit;
    delete layer.dataset.pawPathEditOwner;
    svg.removeEventListener('pointerdown', onAltClick, true);
    dropStaleEditorGraphics();
    stopAnchorSizing();
    delete win.__pawWalkPath;
    delete win.__pawWalkDeletePoint;
    delete win.__pawWalkPathReset;
    delete win.__pawWalkPathSave;
    relayout();
  };
}
