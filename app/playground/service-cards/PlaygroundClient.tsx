"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import "../../globals.css";

const STORAGE_KEY = "ntr-service-card-anim-settings-v5";

type LayerKey = "top" | "bottom";

type LayerFeel = {
  enabled: boolean;
  restX: number;
  restY: number;
  restScale: number;
  hoverX: number;
  hoverY: number;
  hoverScale: number;
  hoverRotation: number;
  duration: number;
  loop: boolean;
  bouncy: boolean;
  resetDuration: number;
  resetBouncy: boolean;
};

type CardMode = "hinge" | "scale";

type CardFeel = {
  enabled: boolean;
  mode: CardMode;
  hingeX: number;
  hingeY: number;
  liftAngle: number;
  liftZ: number;
  perspective: number;
  hoverScale: number;
  hoverRotation: number;
  duration: number;
  bouncy: boolean;
  resetDuration: number;
  resetBouncy: boolean;
};

type CardBgFeel = {
  enabled: boolean;
  opacity: number;
  scale: number;
  rotation: number;
};

type PawFeel = {
  enabled: boolean;
  stagger: number;
  stepDuration: number;
  size: number;
  maxOpacity: number;
  rotationOffset: number;
  containerRotation: number;
  riseDistance: number;
  offsetX: number;
  offsetY: number;
};

type CardStyleFeel = {
  cardGap: number;
  restBorderWidth: number;
  restBorderOpacity: number;
  restShadowY: number;
  restShadowBlur: number;
  restShadowOpacity: number;
  hoverBorderWidth: number;
  hoverBorderOpacity: number;
  hoverShadowY: number;
  hoverShadowBlur: number;
  hoverShadowOpacity: number;
  priceRestScale: number;
  priceHoverScale: number;
  ctaRestScale: number;
  ctaHoverScale: number;
};

type PageBgFeel = {
  enabled: boolean;
  opacity: number;
  offsetX: number;
  offsetY: number;
};

type Settings = {
  globalIntensity: number;
  card: CardFeel;
  cardBg: CardBgFeel;
  cardStyle: CardStyleFeel;
  pageBg: PageBgFeel;
  paws: PawFeel;
  top: LayerFeel;
  bottom: LayerFeel;
};

type LayerSettings = {
  restX: number;
  restY: number;
  hoverX: number;
  hoverY: number;
  restScale: number;
  hoverScale: number;
  restRotation: number;
  hoverRotation: number;
  duration: number;
  ease: string;
  bounceStrength: number;
  loop: boolean;
};

const LAYER_WIDTH: Record<LayerKey, number> = { top: 240, bottom: 640 };

const LAYER_EASE_PRESETS: Record<LayerKey, { smoothEase: string; bounceEase: string; bounceStrength: number }> = {
  top: { smoothEase: "power2.out", bounceEase: "back.out", bounceStrength: 1.4 },
  bottom: { smoothEase: "sine.inOut", bounceEase: "back.out", bounceStrength: 1.4 },
};

const CARD_EASE_PRESET = { smoothEase: "power2.out", bounceEase: "back.out", bounceStrength: 1.6 };

// Diagonal walking-gait trail across the card's text zone, traced from the reference mock (top-right, heading down-left).
const PAW_SPOTS = [
  { left: 69, top: 15, rotate: -8 },
  { left: 77, top: 32, rotate: 10 },
  { left: 62, top: 39, rotate: -12 },
  { left: 69, top: 53, rotate: 8 },
  { left: 51, top: 61, rotate: -10 },
  { left: 58, top: 67, rotate: 12 },
];

const PAW_CENTROID = {
  left: PAW_SPOTS.reduce((sum, s) => sum + s.left, 0) / PAW_SPOTS.length,
  top: PAW_SPOTS.reduce((sum, s) => sum + s.top, 0) / PAW_SPOTS.length,
};

const PAW_BASE_PX = 22;

const DEFAULT_SETTINGS: Settings = {
  globalIntensity: 1,
  card: {
    enabled: true,
    mode: "hinge",
    hingeX: 25, hingeY: -20,
    liftAngle: -8, liftZ: 6, perspective: 800,
    hoverScale: 1.03, hoverRotation: 1.5,
    duration: 0.4, bouncy: false,
    resetDuration: 0.35, resetBouncy: false,
  },
  cardBg: {
    enabled: true,
    opacity: 0.35, scale: 1.4, rotation: 0,
  },
  cardStyle: {
    cardGap: 20,
    restBorderWidth: 1, restBorderOpacity: 0.12,
    restShadowY: 2, restShadowBlur: 10, restShadowOpacity: 0.06,
    hoverBorderWidth: 1, hoverBorderOpacity: 0.12,
    hoverShadowY: 2, hoverShadowBlur: 10, hoverShadowOpacity: 0.06,
    priceRestScale: 1, priceHoverScale: 1.15,
    ctaRestScale: 1, ctaHoverScale: 1.08,
  },
  pageBg: {
    enabled: true,
    opacity: 0.2, offsetX: 0, offsetY: 0,
  },
  paws: {
    enabled: true,
    stagger: 0.08, stepDuration: 0.35,
    size: 1, maxOpacity: 0.55,
    rotationOffset: 0, containerRotation: 0, riseDistance: 24, offsetX: 0, offsetY: 0,
  },
  top: {
    enabled: true,
    restX: 24, restY: 46, restScale: 1,
    hoverX: 24, hoverY: 46, hoverScale: 1,
    hoverRotation: 0, duration: 0.6, loop: false, bouncy: false,
    resetDuration: 0.6, resetBouncy: false,
  },
  bottom: {
    enabled: true,
    restX: 0, restY: -39, restScale: 1,
    hoverX: -140, hoverY: -39, hoverScale: 1,
    hoverRotation: 0, duration: 1.2, loop: false, bouncy: false,
    resetDuration: 1.2, resetBouncy: false,
  },
};

// Reads localStorage into the same shape as DEFAULT_SETTINGS, falling back to
// it wherever a field is missing or malformed. Used as the useSyncExternalStore
// snapshot below rather than an effect: this keeps the first client render
// (hydration) matching the server's — both use getServerSettingsSnapshot — and
// React itself schedules the swap to the real stored value right after, with
// no setState-in-effect involved.
function readStoredSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      globalIntensity: typeof parsed.globalIntensity === "number" ? parsed.globalIntensity : DEFAULT_SETTINGS.globalIntensity,
      card: { ...DEFAULT_SETTINGS.card, ...parsed.card },
      cardBg: { ...DEFAULT_SETTINGS.cardBg, ...parsed.cardBg },
      cardStyle: { ...DEFAULT_SETTINGS.cardStyle, ...parsed.cardStyle },
      pageBg: { ...DEFAULT_SETTINGS.pageBg, ...parsed.pageBg },
      paws: { ...DEFAULT_SETTINGS.paws, ...parsed.paws },
      top: { ...DEFAULT_SETTINGS.top, ...parsed.top },
      bottom: { ...DEFAULT_SETTINGS.bottom, ...parsed.bottom },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Computed at most once per page load (localStorage doesn't change under us —
// the only writer is this same component's "Save as Default" button, which
// also updates React state directly) so the snapshot reference stays stable
// across repeated getSnapshot() calls, as useSyncExternalStore requires.
let cachedStoredSettings: Settings | null = null;
function getStoredSettingsSnapshot(): Settings {
  if (cachedStoredSettings === null) cachedStoredSettings = readStoredSettings();
  return cachedStoredSettings;
}
function getServerSettingsSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}
// Nothing to subscribe to — a stable no-op avoids resubscribing every render.
function subscribeNever() {
  return () => {};
}

const BOTTOM_LAYER_RATIO = 203 / 547;
const STANDARD_TOP_RATIO = 238 / 499;

const CARDS = [
  {
    title: "Puppy Walk",
    copy: "Designed for puppies still learning.",
    price: "$35", priceUnit: "per walk", badge: { text: "Effective", className: "badge-terra" },
    topLayer: { src: "/img/Puppy Top Layer.png", ratio: 651 / 1292 },
    bottomLayerSrc: "/img/Bottom Layer 3.png",
    tape: "/img/tape/tape-pricing.webp",
    tapeColor: "#aec193",
    tapeSide: "right",
  },
  {
    title: "Solo Walk",
    copy: "A private 60-minute walk.",
    price: "$60", priceUnit: "per walk", badge: { text: "Premium", className: "badge-gold" },
    topLayer: { src: "/img/DogTop.png", ratio: STANDARD_TOP_RATIO },
    bottomLayerSrc: "/img/Bottom Layer.png",
    tape: "/img/tape/tape-service.webp",
    tapeColor: "#c9b591",
    tapeSide: "right",
  },
  {
    title: "Group Walk",
    copy: "45-minute walk with up to three dogs max.",
    price: "$33", priceUnit: "per walk", badge: { text: "Most Popular", className: "badge-sage" },
    topLayer: { src: "/img/3Top.png", ratio: STANDARD_TOP_RATIO },
    bottomLayerSrc: "/img/Bottom Layer 2.png",
    tape: "/img/tape/tape-hero.webp",
    tapeColor: "#b3b3b3",
    tapeSide: "left",
  },
];

function tapeBaseRotationFor(i: number): number {
  return CARDS[i].tapeSide === "right" ? 3 : -2.5;
}

// Global Intensity scales only the HOVER EFFECT amount (the delta away from each layer's
// rest/idle state) — rest appearance, timing, easing, and structural placement are untouched,
// so dialing intensity to 1 always reproduces exactly what's set in the individual sliders.
function scaledCardFeel(card: CardFeel, intensity: number): CardFeel {
  return {
    ...card,
    liftAngle: card.liftAngle * intensity,
    liftZ: card.liftZ * intensity,
    hoverScale: 1 + (card.hoverScale - 1) * intensity,
    hoverRotation: card.hoverRotation * intensity,
  };
}

function scaledLayerFeel(layer: LayerFeel, intensity: number): LayerFeel {
  return {
    ...layer,
    hoverX: layer.restX + (layer.hoverX - layer.restX) * intensity,
    hoverY: layer.restY + (layer.hoverY - layer.restY) * intensity,
    hoverScale: layer.restScale + (layer.hoverScale - layer.restScale) * intensity,
    hoverRotation: layer.hoverRotation * intensity,
  };
}

function scaledPawFeel(paws: PawFeel, intensity: number): PawFeel {
  return {
    ...paws,
    size: 1 + (paws.size - 1) * intensity,
    maxOpacity: Math.min(1, Math.max(0, paws.maxOpacity * intensity)),
    rotationOffset: paws.rotationOffset * intensity,
    containerRotation: paws.containerRotation * intensity,
    riseDistance: paws.riseDistance * intensity,
  };
}

function buildEase(name: string, strength: number): string {
  if (name === "back.out" || name === "back.in") return `${name}(${strength})`;
  if (name === "elastic.out" || name === "elastic.in") return `${name}(${strength}, 0.35)`;
  return name;
}

function toLayerSettings(feel: LayerFeel, easePreset: { smoothEase: string; bounceEase: string; bounceStrength: number }): LayerSettings {
  return {
    restX: feel.restX, restY: feel.restY,
    hoverX: feel.hoverX, hoverY: feel.hoverY,
    restScale: feel.restScale, hoverScale: feel.hoverScale,
    restRotation: 0, hoverRotation: feel.hoverRotation,
    duration: feel.duration,
    ease: feel.bouncy ? easePreset.bounceEase : easePreset.smoothEase,
    bounceStrength: easePreset.bounceStrength,
    loop: feel.loop,
  };
}

function toResetSettings(feel: LayerFeel, easePreset: { smoothEase: string; bounceEase: string; bounceStrength: number }): LayerSettings {
  return {
    restX: feel.restX, restY: feel.restY,
    hoverX: feel.restX, hoverY: feel.restY,
    restScale: feel.restScale, hoverScale: feel.restScale,
    restRotation: 0, hoverRotation: 0,
    duration: feel.resetDuration,
    ease: feel.resetBouncy ? easePreset.bounceEase : easePreset.smoothEase,
    bounceStrength: easePreset.bounceStrength,
    loop: false,
  };
}

function tweenToHover(el: HTMLElement | null, layer: LayerSettings) {
  if (!el) return;
  gsap.killTweensOf(el);
  const ease = buildEase(layer.ease, layer.bounceStrength);
  const target = { x: layer.hoverX, y: layer.hoverY, scale: layer.hoverScale, rotation: layer.hoverRotation };
  if (layer.loop) {
    gsap.to(el, { ...target, duration: layer.duration, ease, yoyo: true, repeat: -1 });
  } else {
    gsap.to(el, { ...target, duration: layer.duration, ease });
  }
}

function tweenToRest(el: HTMLElement | null, layer: LayerSettings) {
  if (!el) return;
  gsap.killTweensOf(el);
  const ease = buildEase(layer.ease, layer.bounceStrength);
  gsap.to(el, { x: layer.restX, y: layer.restY, scale: layer.restScale, rotation: layer.restRotation, duration: layer.duration, ease });
}

function tweenCardHover(el: HTMLElement | null, tapeEl: HTMLElement | null, card: CardFeel, rotationSign: number, tapeBaseRotation: number) {
  if (!el || !card.enabled) return;
  gsap.killTweensOf(el);
  const ease = buildEase(card.bouncy ? CARD_EASE_PRESET.bounceEase : CARD_EASE_PRESET.smoothEase, CARD_EASE_PRESET.bounceStrength);
  if (card.mode === "hinge") {
    gsap.to(el, {
      rotationX: card.liftAngle, z: card.liftZ, transformPerspective: card.perspective,
      rotation: card.hoverRotation * rotationSign,
      duration: card.duration, ease,
    });
  } else {
    gsap.to(el, {
      scale: card.hoverScale, rotation: card.hoverRotation * rotationSign,
      duration: card.duration, ease,
    });
    // In scale mode the tape is part of the same growing/shrinking/rotating "object" (unlike the flap, where it stays pinned to the wall).
    if (tapeEl) {
      gsap.killTweensOf(tapeEl);
      gsap.to(tapeEl, { scale: card.hoverScale, rotation: tapeBaseRotation + card.hoverRotation * rotationSign, duration: card.duration, ease });
    }
  }
}

function tweenCardRest(el: HTMLElement | null, tapeEl: HTMLElement | null, card: CardFeel, tapeBaseRotation: number) {
  if (!el) return;
  gsap.killTweensOf(el);
  const ease = buildEase(card.resetBouncy ? CARD_EASE_PRESET.bounceEase : CARD_EASE_PRESET.smoothEase, CARD_EASE_PRESET.bounceStrength);
  gsap.to(el, { rotationX: 0, z: 0, scale: 1, rotation: 0, duration: card.resetDuration, ease });
  if (tapeEl) {
    gsap.killTweensOf(tapeEl);
    gsap.to(tapeEl, { scale: 1, rotation: tapeBaseRotation, duration: card.resetDuration, ease });
  }
}

function tweenPawsIn(paws: (HTMLDivElement | null)[], feel: PawFeel) {
  if (!feel.enabled) return;
  const n = paws.length;
  paws.forEach((el, idx) => {
    if (!el) return;
    gsap.killTweensOf(el);
    const stepOrder = n - 1 - idx; // bottom of the trail (last spot) steps in first, walking up toward the top
    gsap.to(el, {
      x: feel.offsetX, y: feel.offsetY, opacity: feel.maxOpacity, scale: 1,
      duration: feel.stepDuration, delay: stepOrder * feel.stagger, ease: "back.out(1.4)",
    });
  });
}

function tweenPawsOut(paws: (HTMLDivElement | null)[], feel: PawFeel) {
  paws.forEach((el, idx) => {
    if (!el) return;
    gsap.killTweensOf(el);
    // Reverses the "in" order: the top of the trail (last to step in) lifts off first.
    gsap.to(el, {
      x: feel.offsetX, y: feel.offsetY + feel.riseDistance, opacity: 0, scale: 0.4,
      duration: feel.stepDuration * 0.8, delay: idx * feel.stagger, ease: "power1.in",
    });
  });
}

function PawPrint({ style, ref }: { style: React.CSSProperties; ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} style={style}>
      <svg viewBox="0 0 40 40" width="100%" height="100%" fill="var(--sage-dark)">
        <ellipse cx="20" cy="27" rx="10" ry="8" />
        <ellipse cx="10" cy="14" rx="4" ry="5" transform="rotate(-15 10 14)" />
        <ellipse cx="18" cy="8" rx="4.5" ry="5.5" />
        <ellipse cx="27" cy="9" rx="4.5" ry="5.5" transform="rotate(10 27 9)" />
        <ellipse cx="33" cy="17" rx="4" ry="5" transform="rotate(25 33 17)" />
      </svg>
    </div>
  );
}

function ToggleField({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div id={`${id}-field`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{label}</span>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", flexShrink: 0,
          background: checked ? "var(--sage-dark)" : "rgba(36,35,33,0.18)",
          position: "relative", transition: "background 0.15s ease",
        }}
      >
        <span
          style={{
            position: "absolute", top: 2, left: checked ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "var(--warm-white)",
            transition: "left 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        />
      </button>
    </div>
  );
}

function SliderField({ id, label, value, min, max, step, unit, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label htmlFor={id} id={`${id}-field`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--charcoal)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--mid-gray)" }}>{value}{unit}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--sage-dark)" }}
      />
    </label>
  );
}

function SelectField({ id, label, value, options, onChange }: {
  id: string; label: string; value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label htmlFor={id} id={`${id}-field`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, color: "var(--charcoal)" }}>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(36,35,33,0.2)", fontSize: 13, width: "100%" }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mid-gray)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
      {children}
    </div>
  );
}

function CardFeelGroup({ feel, onUpdate }: {
  feel: CardFeel;
  onUpdate: (field: keyof CardFeel, value: number | boolean | string) => void;
}) {
  return (
    <div id="card-animation-whole-card-controls" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Whole Card</div>
        <ToggleField id="card-layer-enabled" label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>

      <SelectField
        id="card-mode"
        label="Effect"
        value={feel.mode}
        options={[{ value: "hinge", label: "Flap (tape hinge)" }, { value: "scale", label: "Scale & rotate" }]}
        onChange={(v) => onUpdate("mode", v)}
      />

      <SectionLabel>Hinge (pinned at tape) — used when Effect = Flap</SectionLabel>
      <SliderField id="card-hinge-x" label="Hinge X" value={feel.hingeX} min={0} max={100} step={1} unit="%" onChange={(v) => onUpdate("hingeX", v)} />
      <SliderField id="card-hinge-y" label="Hinge Y" value={feel.hingeY} min={-60} max={20} step={1} unit="px" onChange={(v) => onUpdate("hingeY", v)} />
      <SliderField id="card-lift-angle" label="Lift angle" value={feel.liftAngle} min={-30} max={30} step={0.5} unit="°" onChange={(v) => onUpdate("liftAngle", v)} />
      <SliderField id="card-lift-z" label="Lift forward" value={feel.liftZ} min={-40} max={40} step={1} unit="px" onChange={(v) => onUpdate("liftZ", v)} />
      <SliderField id="card-perspective" label="Perspective" value={feel.perspective} min={200} max={2000} step={10} unit="px" onChange={(v) => onUpdate("perspective", v)} />

      <SectionLabel>Scale &amp; angle — Scale used only when Effect = Scale &amp; rotate; Angle applies to both effects (left card tilts left, right tilts right, center stays upright)</SectionLabel>
      <SliderField id="card-hover-scale" label="Scale" value={feel.hoverScale} min={0.5} max={2} step={0.01} unit="x" onChange={(v) => onUpdate("hoverScale", v)} />
      <SliderField id="card-hover-rotation" label="Angle" value={feel.hoverRotation} min={-30} max={30} step={0.5} unit="°" onChange={(v) => onUpdate("hoverRotation", v)} />

      <SectionLabel>Motion</SectionLabel>
      <SliderField id="card-duration" label="Speed (duration)" value={feel.duration} min={0.1} max={10} step={0.05} unit="s" onChange={(v) => onUpdate("duration", v)} />
      <ToggleField id="card-bouncy" label="Bouncy ease" checked={feel.bouncy} onChange={(v) => onUpdate("bouncy", v)} />

      <SectionLabel>Reset (hover off)</SectionLabel>
      <SliderField id="card-reset-duration" label="Reset speed (duration)" value={feel.resetDuration} min={0.1} max={10} step={0.05} unit="s" onChange={(v) => onUpdate("resetDuration", v)} />
      <ToggleField id="card-reset-bouncy" label="Bouncy ease on reset" checked={feel.resetBouncy} onChange={(v) => onUpdate("resetBouncy", v)} />
    </div>
  );
}

function CardBgFeelGroup({ feel, onUpdate }: {
  feel: CardBgFeel;
  onUpdate: (field: keyof CardBgFeel, value: number | boolean) => void;
}) {
  return (
    <div id="card-animation-bg-controls" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Card Background</div>
        <ToggleField id="card-bg-enabled" label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>
      <SliderField id="card-bg-opacity" label="Opacity" value={feel.opacity} min={0} max={1} step={0.01} unit="" onChange={(v) => onUpdate("opacity", v)} />
      <SliderField id="card-bg-scale" label="Size" value={feel.scale} min={0.5} max={4} step={0.05} unit="x" onChange={(v) => onUpdate("scale", v)} />
      <SliderField id="card-bg-rotation" label="Rotation" value={feel.rotation} min={-180} max={180} step={1} unit="°" onChange={(v) => onUpdate("rotation", v)} />
    </div>
  );
}

function CardStyleFeelGroup({ feel, onUpdate }: {
  feel: CardStyleFeel;
  onUpdate: (field: keyof CardStyleFeel, value: number) => void;
}) {
  return (
    <div id="card-animation-style-controls" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Card Style</div>
      <SliderField id="card-style-gap" label="Spacing between cards" value={feel.cardGap} min={0} max={80} step={1} unit="px" onChange={(v) => onUpdate("cardGap", v)} />

      <SectionLabel>Hover off (rest)</SectionLabel>
      <SliderField id="card-style-rest-border-width" label="Border width" value={feel.restBorderWidth} min={0} max={6} step={0.5} unit="px" onChange={(v) => onUpdate("restBorderWidth", v)} />
      <SliderField id="card-style-rest-border-opacity" label="Border opacity" value={feel.restBorderOpacity} min={0} max={1} step={0.01} unit="" onChange={(v) => onUpdate("restBorderOpacity", v)} />
      <SliderField id="card-style-rest-shadow-y" label="Drop shadow Y" value={feel.restShadowY} min={0} max={40} step={1} unit="px" onChange={(v) => onUpdate("restShadowY", v)} />
      <SliderField id="card-style-rest-shadow-blur" label="Drop shadow blur" value={feel.restShadowBlur} min={0} max={80} step={1} unit="px" onChange={(v) => onUpdate("restShadowBlur", v)} />
      <SliderField id="card-style-rest-shadow-opacity" label="Drop shadow opacity" value={feel.restShadowOpacity} min={0} max={0.6} step={0.01} unit="" onChange={(v) => onUpdate("restShadowOpacity", v)} />
      <SliderField id="card-style-rest-price-scale" label="Price size" value={feel.priceRestScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("priceRestScale", v)} />
      <SliderField id="card-style-rest-cta-scale" label="Details button size" value={feel.ctaRestScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("ctaRestScale", v)} />

      <SectionLabel>Hover on</SectionLabel>
      <SliderField id="card-style-hover-border-width" label="Border width" value={feel.hoverBorderWidth} min={0} max={6} step={0.5} unit="px" onChange={(v) => onUpdate("hoverBorderWidth", v)} />
      <SliderField id="card-style-hover-border-opacity" label="Border opacity" value={feel.hoverBorderOpacity} min={0} max={1} step={0.01} unit="" onChange={(v) => onUpdate("hoverBorderOpacity", v)} />
      <SliderField id="card-style-hover-shadow-y" label="Drop shadow Y" value={feel.hoverShadowY} min={0} max={40} step={1} unit="px" onChange={(v) => onUpdate("hoverShadowY", v)} />
      <SliderField id="card-style-hover-shadow-blur" label="Drop shadow blur" value={feel.hoverShadowBlur} min={0} max={80} step={1} unit="px" onChange={(v) => onUpdate("hoverShadowBlur", v)} />
      <SliderField id="card-style-hover-shadow-opacity" label="Drop shadow opacity" value={feel.hoverShadowOpacity} min={0} max={0.6} step={0.01} unit="" onChange={(v) => onUpdate("hoverShadowOpacity", v)} />
      <SliderField id="card-style-hover-price-scale" label="Price size" value={feel.priceHoverScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("priceHoverScale", v)} />
      <SliderField id="card-style-hover-cta-scale" label="Details button size" value={feel.ctaHoverScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("ctaHoverScale", v)} />
    </div>
  );
}

function PageBgFeelGroup({ feel, onUpdate }: {
  feel: PageBgFeel;
  onUpdate: (field: keyof PageBgFeel, value: number | boolean) => void;
}) {
  return (
    <div id="page-background-controls" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Page Background</div>
        <ToggleField id="page-bg-enabled" label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>
      <SliderField id="page-bg-opacity" label="Opacity" value={feel.opacity} min={0} max={1} step={0.01} unit="" onChange={(v) => onUpdate("opacity", v)} />
      <SliderField id="page-bg-offset-x" label="Position X" value={feel.offsetX} min={-400} max={400} step={1} unit="px" onChange={(v) => onUpdate("offsetX", v)} />
      <SliderField id="page-bg-offset-y" label="Position Y (from bottom)" value={feel.offsetY} min={-300} max={300} step={1} unit="px" onChange={(v) => onUpdate("offsetY", v)} />
    </div>
  );
}

function PawFeelGroup({ feel, onUpdate }: {
  feel: PawFeel;
  onUpdate: (field: keyof PawFeel, value: number | boolean) => void;
}) {
  return (
    <div id="card-animation-paws-controls" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Paw Prints</div>
        <ToggleField id="paws-enabled" label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>
      <SliderField id="paws-stagger" label="Stagger between steps" value={feel.stagger} min={0} max={0.5} step={0.01} unit="s" onChange={(v) => onUpdate("stagger", v)} />
      <SliderField id="paws-step-duration" label="Step fade duration" value={feel.stepDuration} min={0.05} max={2} step={0.05} unit="s" onChange={(v) => onUpdate("stepDuration", v)} />
      <SliderField id="paws-size" label="Size (scales trail spacing too)" value={feel.size} min={0.3} max={4} step={0.05} unit="x" onChange={(v) => onUpdate("size", v)} />
      <SliderField id="paws-max-opacity" label="Transparency (max opacity)" value={feel.maxOpacity} min={0.1} max={1} step={0.01} unit="" onChange={(v) => onUpdate("maxOpacity", v)} />
      <SliderField id="paws-rotation-offset" label="Paw rotation (each print)" value={feel.rotationOffset} min={-180} max={180} step={1} unit="°" onChange={(v) => onUpdate("rotationOffset", v)} />
      <SliderField id="paws-container-rotation" label="Trail rotation (whole footprint)" value={feel.containerRotation} min={-180} max={180} step={1} unit="°" onChange={(v) => onUpdate("containerRotation", v)} />
      <SliderField id="paws-rise-distance" label="Reveal rise distance" value={feel.riseDistance} min={0} max={120} step={1} unit="px" onChange={(v) => onUpdate("riseDistance", v)} />
      <SliderField id="paws-offset-x" label="Trail offset X" value={feel.offsetX} min={-150} max={150} step={1} unit="px" onChange={(v) => onUpdate("offsetX", v)} />
      <SliderField id="paws-offset-y" label="Trail offset Y (negative = up over photo)" value={feel.offsetY} min={-220} max={150} step={1} unit="px" onChange={(v) => onUpdate("offsetY", v)} />
    </div>
  );
}

function LayerFeelGroup({ layerKey, label, feel, onUpdate }: {
  layerKey: LayerKey; label: string; feel: LayerFeel;
  onUpdate: (field: keyof LayerFeel, value: number | boolean) => void;
}) {
  return (
    <div id={`card-animation-${layerKey}-layer-controls`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>{label}</div>
        <ToggleField id={`${layerKey}-layer-enabled`} label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>

      <SectionLabel>Hover off (rest)</SectionLabel>
      <SliderField id={`${layerKey}-rest-x`} label="Position X" value={feel.restX} min={-600} max={250} step={1} unit="px" onChange={(v) => onUpdate("restX", v)} />
      <SliderField id={`${layerKey}-rest-y`} label="Position Y" value={feel.restY} min={-250} max={250} step={1} unit="px" onChange={(v) => onUpdate("restY", v)} />
      <SliderField id={`${layerKey}-rest-scale`} label="Size" value={feel.restScale} min={0.2} max={5} step={0.05} unit="x" onChange={(v) => onUpdate("restScale", v)} />

      <SectionLabel>Hover on</SectionLabel>
      <SliderField id={`${layerKey}-hover-x`} label="Position X" value={feel.hoverX} min={-600} max={250} step={1} unit="px" onChange={(v) => onUpdate("hoverX", v)} />
      <SliderField id={`${layerKey}-hover-y`} label="Position Y" value={feel.hoverY} min={-250} max={250} step={1} unit="px" onChange={(v) => onUpdate("hoverY", v)} />
      <SliderField id={`${layerKey}-hover-scale`} label="Size" value={feel.hoverScale} min={0.2} max={5} step={0.05} unit="x" onChange={(v) => onUpdate("hoverScale", v)} />

      <SectionLabel>Motion</SectionLabel>
      <SliderField
        id={`${layerKey}-jiggle`}
        label={layerKey === "bottom" ? "Jiggle (rotation, mirrored left/right)" : "Jiggle (rotation)"}
        value={feel.hoverRotation}
        min={0} max={30} step={1} unit="°"
        onChange={(v) => onUpdate("hoverRotation", v)}
      />
      <SliderField id={`${layerKey}-duration`} label="Speed (duration)" value={feel.duration} min={0.1} max={10} step={0.05} unit="s" onChange={(v) => onUpdate("duration", v)} />
      <ToggleField id={`${layerKey}-layer-loop`} label="Loop jiggle while hovered" checked={feel.loop} onChange={(v) => onUpdate("loop", v)} />
      <ToggleField id={`${layerKey}-layer-bouncy`} label="Bouncy ease" checked={feel.bouncy} onChange={(v) => onUpdate("bouncy", v)} />

      <SectionLabel>Reset (hover off)</SectionLabel>
      <SliderField id={`${layerKey}-reset-duration`} label="Reset speed (duration)" value={feel.resetDuration} min={0.1} max={10} step={0.05} unit="s" onChange={(v) => onUpdate("resetDuration", v)} />
      <ToggleField id={`${layerKey}-layer-reset-bouncy`} label="Bouncy ease on reset" checked={feel.resetBouncy} onChange={(v) => onUpdate("resetBouncy", v)} />
    </div>
  );
}

export default function ServiceCardsPlayground() {
  // Seeded from localStorage via useSyncExternalStore (see
  // getStoredSettingsSnapshot/getServerSettingsSnapshot above): server and
  // first client render both use DEFAULT_SETTINGS, then React schedules the
  // swap to the real stored value once hydration is done. The "adjust state
  // during render" check below (React's documented pattern for resetting
  // state when an external value changes, not an effect) seeds the
  // locally-editable `settings` state from it exactly once.
  const storedSettings = useSyncExternalStore(subscribeNever, getStoredSettingsSnapshot, getServerSettingsSnapshot);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [appliedStoredSettings, setAppliedStoredSettings] = useState(storedSettings);
  if (storedSettings !== appliedStoredSettings) {
    setAppliedStoredSettings(storedSettings);
    setSettings(storedSettings);
  }
  const [showControls, setShowControls] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tapeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const priceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const detailsButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const topRefs = useRef<(HTMLImageElement | null)[]>([]);
  const bottomRefs = useRef<(HTMLImageElement | null)[]>([]);
  const pawRefs = useRef<(HTMLDivElement | null)[][]>([]);

  useEffect(() => {
    tapeRefs.current.forEach((el, i) => el && gsap.set(el, {
      rotation: tapeBaseRotationFor(i), scale: 1,
    }));
  }, []);

  useEffect(() => {
    topRefs.current.forEach((el) => el && gsap.set(el, {
      x: settings.top.restX, y: settings.top.restY, scale: settings.top.restScale, rotation: 0,
    }));
  }, [settings.top.restX, settings.top.restY, settings.top.restScale]);

  useEffect(() => {
    bottomRefs.current.forEach((el) => el && gsap.set(el, {
      x: settings.bottom.restX, y: settings.bottom.restY, scale: settings.bottom.restScale, rotation: 0,
    }));
  }, [settings.bottom.restX, settings.bottom.restY, settings.bottom.restScale]);

  useEffect(() => {
    if (hoveredIndex !== null) return;
    priceRefs.current.forEach((el) => el && gsap.set(el, { scale: settings.cardStyle.priceRestScale }));
  }, [settings.cardStyle.priceRestScale, hoveredIndex]);

  useEffect(() => {
    if (hoveredIndex !== null) return;
    detailsButtonRefs.current.forEach((el) => el && gsap.set(el, { scale: settings.cardStyle.ctaRestScale }));
  }, [settings.cardStyle.ctaRestScale, hoveredIndex]);

  useEffect(() => {
    pawRefs.current.forEach((cardPaws) => {
      (cardPaws || []).forEach((el, p) => {
        if (!el) return;
        gsap.set(el, {
          x: settings.paws.offsetX, y: settings.paws.offsetY + settings.paws.riseDistance,
          rotation: PAW_SPOTS[p].rotate + settings.paws.rotationOffset,
          opacity: 0, scale: 0.4,
        });
      });
    });
  }, [settings.paws.offsetX, settings.paws.offsetY, settings.paws.riseDistance, settings.paws.rotationOffset]);

  const updateFeel = (layerKey: LayerKey, field: keyof LayerFeel, value: number | boolean) => {
    setSettings((prev) => ({ ...prev, [layerKey]: { ...prev[layerKey], [field]: value } }));
  };

  const updateCard = (field: keyof CardFeel, value: number | boolean | string) => {
    setSettings((prev) => ({ ...prev, card: { ...prev.card, [field]: value } }));
  };

  const updateCardBg = (field: keyof CardBgFeel, value: number | boolean) => {
    setSettings((prev) => ({ ...prev, cardBg: { ...prev.cardBg, [field]: value } }));
  };

  const updateCardStyle = (field: keyof CardStyleFeel, value: number) => {
    setSettings((prev) => ({ ...prev, cardStyle: { ...prev.cardStyle, [field]: value } }));
  };

  const updatePageBg = (field: keyof PageBgFeel, value: number | boolean) => {
    setSettings((prev) => ({ ...prev, pageBg: { ...prev.pageBg, [field]: value } }));
  };

  const updateGlobalIntensity = (value: number) => {
    setSettings((prev) => ({ ...prev, globalIntensity: value }));
  };

  const updatePaws = (field: keyof PawFeel, value: number | boolean) => {
    setSettings((prev) => ({ ...prev, paws: { ...prev.paws, [field]: value } }));
  };

  const saveAsDefault = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  };

  const resetToDefault = () => {
    setSettings(DEFAULT_SETTINGS);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const handleEnter = (i: number) => {
    setHoveredIndex(i);
    const mid = (CARDS.length - 1) / 2;
    const rotationSign = i < mid ? -1 : i > mid ? 1 : 0;
    const tapeBaseRotation = tapeBaseRotationFor(i);
    const intensity = settings.globalIntensity;
    const effectiveCard = scaledCardFeel(settings.card, intensity);
    tweenCardHover(cardRefs.current[i], tapeRefs.current[i], effectiveCard, rotationSign, tapeBaseRotation);
    if (settings.top.enabled) tweenToHover(topRefs.current[i], toLayerSettings(scaledLayerFeel(settings.top, intensity), LAYER_EASE_PRESETS.top));
    if (settings.bottom.enabled) {
      const bottomLayerSettings = toLayerSettings(scaledLayerFeel(settings.bottom, intensity), LAYER_EASE_PRESETS.bottom);
      bottomLayerSettings.hoverRotation *= rotationSign;
      tweenToHover(bottomRefs.current[i], bottomLayerSettings);
    }
    tweenPawsIn(pawRefs.current[i] || [], scaledPawFeel(settings.paws, intensity));
    if (priceRefs.current[i]) {
      gsap.killTweensOf(priceRefs.current[i]);
      const restScale = settings.cardStyle.priceRestScale;
      const hoverScale = restScale + (settings.cardStyle.priceHoverScale - restScale) * intensity;
      gsap.to(priceRefs.current[i], { scale: hoverScale, duration: 0.3, ease: "back.out(1.7)" });
    }
    const detailsButton = detailsButtonRefs.current[i];
    if (detailsButton) {
      gsap.killTweensOf(detailsButton);
      const ctaRestScale = settings.cardStyle.ctaRestScale;
      const ctaHoverScale = ctaRestScale + (settings.cardStyle.ctaHoverScale - ctaRestScale) * intensity;
      gsap.to(detailsButton, { scale: ctaHoverScale, duration: 0.25, ease: "back.out(1.7)" });
    }
  };

  const handleLeave = (i: number) => {
    setHoveredIndex((prev) => (prev === i ? null : prev));
    const tapeBaseRotation = tapeBaseRotationFor(i);
    tweenCardRest(cardRefs.current[i], tapeRefs.current[i], settings.card, tapeBaseRotation);
    tweenToRest(topRefs.current[i], toResetSettings(settings.top, LAYER_EASE_PRESETS.top));
    tweenToRest(bottomRefs.current[i], toResetSettings(settings.bottom, LAYER_EASE_PRESETS.bottom));
    if (priceRefs.current[i]) {
      gsap.killTweensOf(priceRefs.current[i]);
      gsap.to(priceRefs.current[i], { scale: settings.cardStyle.priceRestScale, duration: 0.25, ease: "power2.out" });
    }
    tweenPawsOut(pawRefs.current[i] || [], settings.paws);
    const detailsButton = detailsButtonRefs.current[i];
    if (detailsButton) {
      gsap.killTweensOf(detailsButton);
      gsap.to(detailsButton, { scale: settings.cardStyle.ctaRestScale, duration: 0.2, ease: "power2.out" });
    }
  };

  return (
    <div id="page-home" style={{ position: "relative", zIndex: 0, minHeight: "100vh", display: "flex", flexDirection: "row", background: "var(--cream)" }}>
      {settings.pageBg.enabled && (
        // eslint-disable-next-line @next/next/no-img-element -- dev-only playground page, position controlled by tuner sliders
        <img
          id="service-cards-page-background"
          src="/img/product_background.png"
          alt=""
          style={{
            position: "fixed",
            left: 0,
            bottom: settings.pageBg.offsetY,
            transform: `translateX(${settings.pageBg.offsetX}px)`,
            width: "100%",
            height: "auto",
            opacity: settings.pageBg.opacity,
            zIndex: -1,
            pointerEvents: "none",
          }}
        />
      )}
      <div id="service-cards-playground-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div
          id="hover-strength-controls"
          style={{
            width: 260, marginBottom: 48,
            padding: "16px 20px",
            background: "var(--warm-white)",
            border: "1px solid rgba(36,35,33,0.12)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 4px 16px rgba(35,31,24,0.08)",
          }}
        >
          <label htmlFor="global-intensity" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Hover strength</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--sage-dark)" }}>{settings.globalIntensity}x</span>
            </span>
            <input
              id="global-intensity"
              type="range"
              min={0} max={2.5} step={0.05}
              value={settings.globalIntensity}
              onChange={(e) => updateGlobalIntensity(parseFloat(e.target.value))}
              style={{ width: "100%", height: 6, accentColor: "var(--sage-dark)" }}
            />
          </label>
        </div>
        <div id="service-cards-playground-row" className="services-grid" style={{ maxWidth: "1050px", width: "100%", margin: "0 auto", gridTemplateColumns: "repeat(3, 1fr)", gap: settings.cardStyle.cardGap }}>
          {CARDS.map((card, i) => (
            <div
              key={card.title}
              onMouseEnter={() => handleEnter(i)}
              onMouseLeave={() => handleLeave(i)}
              style={{ position: "relative", cursor: "pointer" }}
            >
              <div
                id={`service-card-tape-${i}`}
                aria-hidden="true"
                ref={(el) => { tapeRefs.current[i] = el; }}
                style={{
                  position: "absolute",
                  top: -13,
                  ...(card.tapeSide === "right" ? { right: 22 } : { left: 22 }),
                  width: 118,
                  height: 30,
                  backgroundImage: `url(${card.tape})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "100% 100%",
                  filter: "drop-shadow(0 2px 4px rgba(35, 31, 24, 0.16))",
                  opacity: 0.94,
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              />
              <div
                id={`service-card-body-${i}`}
                ref={(el) => { cardRefs.current[i] = el; }}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: "32px 28px",
                  borderRadius: "var(--radius-lg)",
                  border: hoveredIndex === i
                    ? `${settings.cardStyle.hoverBorderWidth}px solid rgba(36,35,33,${settings.cardStyle.hoverBorderOpacity})`
                    : `${settings.cardStyle.restBorderWidth}px solid rgba(36,35,33,${settings.cardStyle.restBorderOpacity})`,
                  background: "var(--warm-white) url('/textures/paper-grain.png')",
                  backgroundSize: "300px 300px",
                  boxShadow: hoveredIndex !== null && hoveredIndex !== i
                    ? "none"
                    : hoveredIndex === i
                      ? `0 ${settings.cardStyle.hoverShadowY}px ${settings.cardStyle.hoverShadowBlur}px rgba(35,31,24,${settings.cardStyle.hoverShadowOpacity})`
                      : `0 ${settings.cardStyle.restShadowY}px ${settings.cardStyle.restShadowBlur}px rgba(35,31,24,${settings.cardStyle.restShadowOpacity})`,
                  transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                  display: "flex",
                  flexDirection: "column",
                  transformOrigin: settings.card.mode === "hinge"
                    ? `${card.tapeSide === "right" ? 100 - settings.card.hingeX : settings.card.hingeX}% ${settings.card.hingeY}px`
                    : "50% 50%",
                  willChange: "transform",
                }}
              >
                {settings.cardBg.enabled && (
                  // eslint-disable-next-line @next/next/no-img-element -- dev-only playground page, animation-controlled (GSAP opacity/scale/rotation)
                  <img
                    id={`service-card-bg-${i}`}
                    src="/img/card-bg.webp"
                    alt=""
                    style={{
                      position: "absolute",
                      top: -32,
                      left: -28,
                      right: -28,
                      bottom: -32,
                      width: "calc(100% + 56px)",
                      height: "calc(100% + 64px)",
                      objectFit: "cover",
                      opacity: settings.cardBg.opacity,
                      transform: `scale(${settings.cardBg.scale}) rotate(${settings.cardBg.rotation}deg)`,
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                )}
                <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  id={`service-card-photo-stage-${i}`}
                  style={{
                    position: "relative",
                    width: "calc(100% + 56px)",
                    height: 160,
                    margin: "-32px -28px 14px",
                    overflow: "hidden",
                    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                    background: "var(--warm-white)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- dev-only playground page, animation-controlled (GSAP ref transform) */}
                  <img
                    id={`service-card-bottom-layer-${i}`}
                    ref={(el) => { bottomRefs.current[i] = el; }}
                    src={card.bottomLayerSrc}
                    alt=""
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: LAYER_WIDTH.bottom,
                      height: LAYER_WIDTH.bottom * BOTTOM_LAYER_RATIO,
                      willChange: "transform",
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element -- dev-only playground page, animation-controlled (GSAP ref transform) */}
                  <img
                    id={`service-card-top-layer-${i}`}
                    ref={(el) => { topRefs.current[i] = el; }}
                    src={card.topLayer.src}
                    alt=""
                    style={{
                      position: "absolute",
                      left: 0,
                      bottom: 0,
                      width: LAYER_WIDTH.top,
                      height: LAYER_WIDTH.top * card.topLayer.ratio,
                      transformOrigin: "left bottom",
                      willChange: "transform",
                    }}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: `rotate(${settings.paws.containerRotation}deg)`,
                      transformOrigin: `${PAW_CENTROID.left}% ${PAW_CENTROID.top}%`,
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  >
                    {PAW_SPOTS.map((spot, p) => {
                      const scaledLeft = PAW_CENTROID.left + (spot.left - PAW_CENTROID.left) * settings.paws.size;
                      const scaledTop = PAW_CENTROID.top + (spot.top - PAW_CENTROID.top) * settings.paws.size;
                      const glyphPx = PAW_BASE_PX * settings.paws.size;
                      return (
                        <PawPrint
                          key={p}
                          style={{
                            position: "absolute",
                            left: `${scaledLeft}%`,
                            top: `${scaledTop}%`,
                            width: glyphPx,
                            height: glyphPx,
                            marginLeft: -glyphPx / 2,
                            marginTop: -glyphPx / 2,
                            pointerEvents: "none",
                          }}
                          ref={(el: HTMLDivElement | null) => {
                            if (!pawRefs.current[i]) pawRefs.current[i] = [];
                            pawRefs.current[i][p] = el;
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--charcoal)", marginBottom: 6 }}>{card.title}</div>
                  <div
                    ref={(el) => { priceRefs.current[i] = el; }}
                    style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "var(--sage-dark)", lineHeight: 1, marginBottom: 6, transformOrigin: "left center", willChange: "transform" }}
                  >
                    {card.price}<span style={{ fontSize: 18, color: "var(--mid-gray)", fontFamily: "var(--font-body)" }}> {card.priceUnit}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--mid-gray)", marginBottom: 6 }}>+ sales tax</div>
                  <p style={{ color: "var(--mid-gray)", fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>{card.copy}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    {card.badge ? (
                      <span
                        className={`badge ${card.badge.className}`}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "2px 8px",
                          fontSize: 11,
                        }}
                      >
                        {card.badge.text}
                      </span>
                    ) : <span />}
                    <button
                      id={`service-card-details-button-${i}`}
                      ref={(el) => { detailsButtonRefs.current[i] = el; }}
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ background: card.tapeColor, borderColor: card.tapeColor, color: "var(--charcoal)" }}
                    >
                      Details
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showControls ? (
        <aside
          id="card-animation-sidebar"
          style={{
            width: 340, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto",
            background: "var(--warm-white)", borderLeft: "1px solid rgba(36,35,33,0.12)",
            padding: 24, display: "flex", flexDirection: "column", gap: 24,
            boxShadow: "-2px 0 10px rgba(35,31,24,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--charcoal)" }}>Card Animation</div>
            <button
              type="button"
              id="card-animation-sidebar-hide"
              onClick={() => setShowControls(false)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(36,35,33,0.2)", background: "transparent", color: "var(--charcoal)", fontSize: 12, cursor: "pointer" }}
            >
              Hide
            </button>
          </div>

          <div id="card-animation-save-default-row" style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={saveAsDefault}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "none", background: "var(--sage-dark)", color: "var(--warm-white)", fontSize: 13, cursor: "pointer" }}
            >
              Save as Default
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(36,35,33,0.2)", background: "transparent", color: "var(--charcoal)", fontSize: 13, cursor: "pointer" }}
            >
              Reset
            </button>
          </div>

          <CardFeelGroup feel={settings.card} onUpdate={(field, v) => updateCard(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <CardBgFeelGroup feel={settings.cardBg} onUpdate={(field, v) => updateCardBg(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <CardStyleFeelGroup feel={settings.cardStyle} onUpdate={(field, v) => updateCardStyle(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <PageBgFeelGroup feel={settings.pageBg} onUpdate={(field, v) => updatePageBg(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <PawFeelGroup feel={settings.paws} onUpdate={(field, v) => updatePaws(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <LayerFeelGroup layerKey="top" label="Top Layer (walker + dog)" feel={settings.top} onUpdate={(field, v) => updateFeel("top", field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <LayerFeelGroup layerKey="bottom" label="Bottom Layer (background)" feel={settings.bottom} onUpdate={(field, v) => updateFeel("bottom", field, v)} />
        </aside>
      ) : (
        <button
          type="button"
          id="card-animation-sidebar-show"
          onClick={() => setShowControls(true)}
          style={{
            position: "fixed", top: 16, right: 16, zIndex: 50,
            padding: "8px 16px", borderRadius: 6, border: "1px solid rgba(36,35,33,0.2)",
            background: "var(--warm-white)", color: "var(--charcoal)", fontSize: 13, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(35,31,24,0.12)",
          }}
        >
          Show Settings
        </button>
      )}
    </div>
  );
}
