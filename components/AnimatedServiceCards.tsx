"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";

// Card "execution" ported from the /playground/service-cards sandbox, with a
// live tuning panel (same controls as the sandbox, minus the sandbox's own
// page-background group) built directly into this component instead of a
// separate route — toggle via the "Tune Cards" button, bottom-left.
// Defaults below reproduce today's baked-in look (globalIntensity 1 = identity).

const TUNING_STORAGE_KEY = "ntr-home-card-anim-settings-v1";

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

type Settings = {
  globalIntensity: number;
  card: CardFeel;
  cardBg: CardBgFeel;
  cardStyle: CardStyleFeel;
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

// Diagonal walking-gait trail across the card's text zone.
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

// Mirrors the values previously baked into this file directly (globalIntensity
// 1 makes the scaling functions a no-op, so this reproduces today's look exactly).
const DEFAULT_SETTINGS: Settings = {
  globalIntensity: 1,
  card: {
    enabled: true,
    mode: "scale",
    hingeX: 25, hingeY: -20,
    liftAngle: -8, liftZ: 6, perspective: 800,
    hoverScale: 1.0055, hoverRotation: 1.65,
    duration: 0.65, bouncy: true,
    resetDuration: 1.6, resetBouncy: true,
  },
  cardBg: {
    enabled: false,
    opacity: 0.35, scale: 1.4, rotation: 0,
  },
  cardStyle: {
    cardGap: 25,
    restBorderWidth: 1, restBorderOpacity: 1,
    restShadowY: 0, restShadowBlur: 0, restShadowOpacity: 0,
    hoverBorderWidth: 1, hoverBorderOpacity: 1,
    hoverShadowY: 3, hoverShadowBlur: 2, hoverShadowOpacity: 0.45,
    priceRestScale: 1, priceHoverScale: 1.055,
    ctaRestScale: 1, ctaHoverScale: 1.044,
  },
  paws: {
    enabled: true,
    stagger: 0.04, stepDuration: 0.45,
    size: 1.44, maxOpacity: 0.0935,
    rotationOffset: 12.65, containerRotation: -5.5, riseDistance: 13.2, offsetX: 56, offsetY: -62,
  },
  top: {
    enabled: true,
    restX: -195, restY: 14, restScale: 2.25,
    hoverX: -225.25, hoverY: 14, hoverScale: 2.4425,
    hoverRotation: 0, duration: 0.8, loop: false, bouncy: true,
    resetDuration: 0.65, resetBouncy: true,
  },
  bottom: {
    enabled: true,
    restX: -23, restY: -39, restScale: 1,
    hoverX: -95.05, hoverY: -39, hoverScale: 1,
    hoverRotation: 0, duration: 10, loop: false, bouncy: true,
    resetDuration: 0.65, resetBouncy: true,
  },
};

type IllustratedProductCard = {
  variant?: undefined;
  title: string;
  copy: string;
  price: string;
  priceUnit: string;
  badge?: { text: string; className: string };
  topLayer: { src: string; ratio: number };
  bottomLayerSrc: string;
  tape: string;
  tapeColor: string;
  tapeSide: "left" | "right";
};

// Simple cards have no matching hand-illustrated top/bottom-layer art (only
// elaborate cards get the GSAP hover choreography); they render as plain
// icon cards reusing the .service-card styling instead.
type SimpleProductCard = {
  variant: "simple";
  title: string;
  copy: string;
  price: string;
  priceUnit: string;
  badge?: { text: string; className: string };
  icon: string;
};

type ProductCard = IllustratedProductCard | SimpleProductCard;

const CARDS: ProductCard[] = [
  {
    title: "Puppy Walk",
    copy: "Designed for puppies still learning.",
    price: "$35", priceUnit: "per walk", badge: { text: "Effective", className: "badge-terra" },
    topLayer: { src: "/img/Puppy Top Layer.png", ratio: 651 / 1292 },
    bottomLayerSrc: "/img/Bottom Layer 3.png",
    tape: "/img/tape/tape-pricing.webp",
    tapeColor: "#aec193",
    tapeSide: "right" as const,
  },
  {
    title: "Solo Walk",
    copy: "A private 60-minute walk.",
    price: "$60", priceUnit: "per walk", badge: { text: "Premium", className: "badge-gold" },
    topLayer: { src: "/img/DogTop.png", ratio: 238 / 499 },
    bottomLayerSrc: "/img/Bottom Layer.png",
    tape: "/img/tape/tape-service.webp",
    tapeColor: "#c9b591",
    tapeSide: "right" as const,
  },
  {
    title: "Group Walk",
    copy: "45-minute walk with up to three dogs max.",
    price: "$33", priceUnit: "per walk", badge: { text: "Most Popular", className: "badge-sage" },
    topLayer: { src: "/img/3Top.png", ratio: 238 / 499 },
    bottomLayerSrc: "/img/Bottom Layer 2.png",
    tape: "/img/tape/tape-hero.webp",
    tapeColor: "#b3b3b3",
    tapeSide: "left" as const,
  },
  {
    variant: "simple",
    title: "Senior Dog Visits",
    copy: "Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs. We move at their pace, with patience, comfort, and plenty of care.",
    price: "$35", priceUnit: "/visit",
    icon: "/img/icons/service-senior.svg",
  },
  {
    variant: "simple",
    title: "Boarding & Overnight Sitting",
    copy: "Loving overnight care in your dog's own home, where they can stick to their routine and sleep in familiar surroundings while you're away.",
    price: "$100", priceUnit: "/night", badge: { text: "7+ day discounts", className: "badge-sage" },
    icon: "/img/icons/service-boarding.svg",
  },
  {
    variant: "simple",
    title: "Cat Visits",
    copy: "Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We'll also water plants, bring in the mail, and keep an eye on your home while you're away.",
    price: "$35", priceUnit: "/visit",
    icon: "/img/icons/service-cat.svg",
  },
];

const BOTTOM_LAYER_RATIO = 203 / 547;

function tapeBaseRotationFor(i: number): number {
  const card = CARDS[i];
  return "tapeSide" in card && card.tapeSide === "right" ? 3 : -2.5;
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
    const stepOrder = n - 1 - idx;
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

function goToServices() {
  (window as unknown as { showPage?: (page: string) => void }).showPage?.("services");
}

function ToggleField({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div id={`${id}-field`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{label}</span>
      <button
        type="button" id={id} role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", flexShrink: 0,
          background: checked ? "var(--sage-dark)" : "rgba(36,35,33,0.18)",
          position: "relative", transition: "background 0.15s ease",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%", background: "var(--warm-white)",
          transition: "left 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }} />
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
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--sage-dark)" }} />
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
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(36,35,33,0.2)", fontSize: 13, width: "100%" }}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Whole Card</div>
        <ToggleField id="hc-card-enabled" label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>
      <SelectField id="hc-card-mode" label="Effect" value={feel.mode}
        options={[{ value: "hinge", label: "Flap (tape hinge)" }, { value: "scale", label: "Scale & rotate" }]}
        onChange={(v) => onUpdate("mode", v)} />

      <SectionLabel>Hinge (pinned at tape) — used when Effect = Flap</SectionLabel>
      <SliderField id="hc-card-hinge-x" label="Hinge X" value={feel.hingeX} min={0} max={100} step={1} unit="%" onChange={(v) => onUpdate("hingeX", v)} />
      <SliderField id="hc-card-hinge-y" label="Hinge Y" value={feel.hingeY} min={-60} max={20} step={1} unit="px" onChange={(v) => onUpdate("hingeY", v)} />
      <SliderField id="hc-card-lift-angle" label="Lift angle" value={feel.liftAngle} min={-30} max={30} step={0.5} unit="°" onChange={(v) => onUpdate("liftAngle", v)} />
      <SliderField id="hc-card-lift-z" label="Lift forward" value={feel.liftZ} min={-40} max={40} step={1} unit="px" onChange={(v) => onUpdate("liftZ", v)} />
      <SliderField id="hc-card-perspective" label="Perspective" value={feel.perspective} min={200} max={2000} step={10} unit="px" onChange={(v) => onUpdate("perspective", v)} />

      <SectionLabel>Scale &amp; angle</SectionLabel>
      <SliderField id="hc-card-hover-scale" label="Scale" value={feel.hoverScale} min={0.5} max={2} step={0.001} unit="x" onChange={(v) => onUpdate("hoverScale", v)} />
      <SliderField id="hc-card-hover-rotation" label="Angle" value={feel.hoverRotation} min={-30} max={30} step={0.05} unit="°" onChange={(v) => onUpdate("hoverRotation", v)} />

      <SectionLabel>Motion</SectionLabel>
      <SliderField id="hc-card-duration" label="Speed (duration)" value={feel.duration} min={0.1} max={10} step={0.05} unit="s" onChange={(v) => onUpdate("duration", v)} />
      <ToggleField id="hc-card-bouncy" label="Bouncy ease" checked={feel.bouncy} onChange={(v) => onUpdate("bouncy", v)} />

      <SectionLabel>Reset (hover off)</SectionLabel>
      <SliderField id="hc-card-reset-duration" label="Reset speed (duration)" value={feel.resetDuration} min={0.1} max={10} step={0.05} unit="s" onChange={(v) => onUpdate("resetDuration", v)} />
      <ToggleField id="hc-card-reset-bouncy" label="Bouncy ease on reset" checked={feel.resetBouncy} onChange={(v) => onUpdate("resetBouncy", v)} />
    </div>
  );
}

function CardBgFeelGroup({ feel, onUpdate }: {
  feel: CardBgFeel;
  onUpdate: (field: keyof CardBgFeel, value: number | boolean) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Card Background</div>
        <ToggleField id="hc-cardbg-enabled" label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>
      <SliderField id="hc-cardbg-opacity" label="Opacity" value={feel.opacity} min={0} max={1} step={0.01} unit="" onChange={(v) => onUpdate("opacity", v)} />
      <SliderField id="hc-cardbg-scale" label="Size" value={feel.scale} min={0.5} max={4} step={0.05} unit="x" onChange={(v) => onUpdate("scale", v)} />
      <SliderField id="hc-cardbg-rotation" label="Rotation" value={feel.rotation} min={-180} max={180} step={1} unit="°" onChange={(v) => onUpdate("rotation", v)} />
    </div>
  );
}

function CardStyleFeelGroup({ feel, onUpdate }: {
  feel: CardStyleFeel;
  onUpdate: (field: keyof CardStyleFeel, value: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Card Style</div>
      <SliderField id="hc-style-gap" label="Spacing between cards" value={feel.cardGap} min={0} max={80} step={1} unit="px" onChange={(v) => onUpdate("cardGap", v)} />

      <SectionLabel>Hover off (rest)</SectionLabel>
      <SliderField id="hc-style-rest-border-width" label="Border width" value={feel.restBorderWidth} min={0} max={6} step={0.5} unit="px" onChange={(v) => onUpdate("restBorderWidth", v)} />
      <SliderField id="hc-style-rest-border-opacity" label="Border opacity" value={feel.restBorderOpacity} min={0} max={1} step={0.01} unit="" onChange={(v) => onUpdate("restBorderOpacity", v)} />
      <SliderField id="hc-style-rest-shadow-y" label="Drop shadow Y" value={feel.restShadowY} min={0} max={40} step={1} unit="px" onChange={(v) => onUpdate("restShadowY", v)} />
      <SliderField id="hc-style-rest-shadow-blur" label="Drop shadow blur" value={feel.restShadowBlur} min={0} max={80} step={1} unit="px" onChange={(v) => onUpdate("restShadowBlur", v)} />
      <SliderField id="hc-style-rest-shadow-opacity" label="Drop shadow opacity" value={feel.restShadowOpacity} min={0} max={0.6} step={0.01} unit="" onChange={(v) => onUpdate("restShadowOpacity", v)} />
      <SliderField id="hc-style-rest-price-scale" label="Price size" value={feel.priceRestScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("priceRestScale", v)} />
      <SliderField id="hc-style-rest-cta-scale" label="Details button size" value={feel.ctaRestScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("ctaRestScale", v)} />

      <SectionLabel>Hover on</SectionLabel>
      <SliderField id="hc-style-hover-border-width" label="Border width" value={feel.hoverBorderWidth} min={0} max={6} step={0.5} unit="px" onChange={(v) => onUpdate("hoverBorderWidth", v)} />
      <SliderField id="hc-style-hover-border-opacity" label="Border opacity" value={feel.hoverBorderOpacity} min={0} max={1} step={0.01} unit="" onChange={(v) => onUpdate("hoverBorderOpacity", v)} />
      <SliderField id="hc-style-hover-shadow-y" label="Drop shadow Y" value={feel.hoverShadowY} min={0} max={40} step={1} unit="px" onChange={(v) => onUpdate("hoverShadowY", v)} />
      <SliderField id="hc-style-hover-shadow-blur" label="Drop shadow blur" value={feel.hoverShadowBlur} min={0} max={80} step={1} unit="px" onChange={(v) => onUpdate("hoverShadowBlur", v)} />
      <SliderField id="hc-style-hover-shadow-opacity" label="Drop shadow opacity" value={feel.hoverShadowOpacity} min={0} max={0.6} step={0.01} unit="" onChange={(v) => onUpdate("hoverShadowOpacity", v)} />
      <SliderField id="hc-style-hover-price-scale" label="Price size" value={feel.priceHoverScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("priceHoverScale", v)} />
      <SliderField id="hc-style-hover-cta-scale" label="Details button size" value={feel.ctaHoverScale} min={0.5} max={2} step={0.05} unit="x" onChange={(v) => onUpdate("ctaHoverScale", v)} />
    </div>
  );
}

function PawFeelGroup({ feel, onUpdate }: {
  feel: PawFeel;
  onUpdate: (field: keyof PawFeel, value: number | boolean) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>Paw Prints (hover)</div>
        <ToggleField id="hc-paws-enabled" label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>
      <SliderField id="hc-paws-stagger" label="Stagger between steps" value={feel.stagger} min={0} max={0.5} step={0.01} unit="s" onChange={(v) => onUpdate("stagger", v)} />
      <SliderField id="hc-paws-step-duration" label="Step fade duration" value={feel.stepDuration} min={0.05} max={2} step={0.05} unit="s" onChange={(v) => onUpdate("stepDuration", v)} />
      <SliderField id="hc-paws-size" label="Size (scales trail spacing too)" value={feel.size} min={0.3} max={4} step={0.05} unit="x" onChange={(v) => onUpdate("size", v)} />
      <SliderField id="hc-paws-max-opacity" label="Transparency (max opacity)" value={feel.maxOpacity} min={0.02} max={1} step={0.005} unit="" onChange={(v) => onUpdate("maxOpacity", v)} />
      <SliderField id="hc-paws-rotation-offset" label="Paw rotation (each print)" value={feel.rotationOffset} min={-180} max={180} step={0.5} unit="°" onChange={(v) => onUpdate("rotationOffset", v)} />
      <SliderField id="hc-paws-container-rotation" label="Trail rotation (whole footprint)" value={feel.containerRotation} min={-180} max={180} step={0.5} unit="°" onChange={(v) => onUpdate("containerRotation", v)} />
      <SliderField id="hc-paws-rise-distance" label="Reveal rise distance" value={feel.riseDistance} min={0} max={120} step={0.5} unit="px" onChange={(v) => onUpdate("riseDistance", v)} />
      <SliderField id="hc-paws-offset-x" label="Trail offset X" value={feel.offsetX} min={-150} max={150} step={1} unit="px" onChange={(v) => onUpdate("offsetX", v)} />
      <SliderField id="hc-paws-offset-y" label="Trail offset Y (negative = up over photo)" value={feel.offsetY} min={-220} max={150} step={1} unit="px" onChange={(v) => onUpdate("offsetY", v)} />
    </div>
  );
}

function LayerFeelGroup({ layerKey, label, feel, onUpdate }: {
  layerKey: LayerKey; label: string; feel: LayerFeel;
  onUpdate: (field: keyof LayerFeel, value: number | boolean) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--charcoal)" }}>{label}</div>
        <ToggleField id={`hc-${layerKey}-enabled`} label="On" checked={feel.enabled} onChange={(v) => onUpdate("enabled", v)} />
      </div>

      <SectionLabel>Hover off (rest)</SectionLabel>
      <SliderField id={`hc-${layerKey}-rest-x`} label="Position X" value={feel.restX} min={-600} max={250} step={1} unit="px" onChange={(v) => onUpdate("restX", v)} />
      <SliderField id={`hc-${layerKey}-rest-y`} label="Position Y" value={feel.restY} min={-250} max={250} step={1} unit="px" onChange={(v) => onUpdate("restY", v)} />
      <SliderField id={`hc-${layerKey}-rest-scale`} label="Size" value={feel.restScale} min={0.2} max={5} step={0.0125} unit="x" onChange={(v) => onUpdate("restScale", v)} />

      <SectionLabel>Hover on</SectionLabel>
      <SliderField id={`hc-${layerKey}-hover-x`} label="Position X" value={feel.hoverX} min={-600} max={250} step={0.25} unit="px" onChange={(v) => onUpdate("hoverX", v)} />
      <SliderField id={`hc-${layerKey}-hover-y`} label="Position Y" value={feel.hoverY} min={-250} max={250} step={0.25} unit="px" onChange={(v) => onUpdate("hoverY", v)} />
      <SliderField id={`hc-${layerKey}-hover-scale`} label="Size" value={feel.hoverScale} min={0.2} max={5} step={0.0025} unit="x" onChange={(v) => onUpdate("hoverScale", v)} />

      <SectionLabel>Motion</SectionLabel>
      <SliderField id={`hc-${layerKey}-jiggle`} label={layerKey === "bottom" ? "Jiggle (rotation, mirrored)" : "Jiggle (rotation)"}
        value={feel.hoverRotation} min={0} max={30} step={1} unit="°" onChange={(v) => onUpdate("hoverRotation", v)} />
      <SliderField id={`hc-${layerKey}-duration`} label="Speed (duration)" value={feel.duration} min={0.1} max={12} step={0.05} unit="s" onChange={(v) => onUpdate("duration", v)} />
      <ToggleField id={`hc-${layerKey}-loop`} label="Loop jiggle while hovered" checked={feel.loop} onChange={(v) => onUpdate("loop", v)} />
      <ToggleField id={`hc-${layerKey}-bouncy`} label="Bouncy ease" checked={feel.bouncy} onChange={(v) => onUpdate("bouncy", v)} />

      <SectionLabel>Reset (hover off)</SectionLabel>
      <SliderField id={`hc-${layerKey}-reset-duration`} label="Reset speed (duration)" value={feel.resetDuration} min={0.1} max={10} step={0.05} unit="s" onChange={(v) => onUpdate("resetDuration", v)} />
      <ToggleField id={`hc-${layerKey}-reset-bouncy`} label="Bouncy ease on reset" checked={feel.resetBouncy} onChange={(v) => onUpdate("resetBouncy", v)} />
    </div>
  );
}

// The pin's ScrollTrigger, published by initPersonalizedCareScroll
// (app/page.tsx) once it exists. Only present on desktop with motion allowed;
// every control below no-ops without it, which is what keeps mobile a plain
// stacked list.
type CareScrollTrigger = { start: number; end: number };
function careScrollTrigger(): CareScrollTrigger | null {
  return (window as unknown as { personalizedCareScrollTrigger?: CareScrollTrigger })
    .personalizedCareScrollTrigger ?? null;
}

// Arrows and dots address evenly-spaced stops across the row's total travel,
// one stop per card, rather than "one card width per click". The row overflows
// by less than its own card count (6 cards, ~2.6 card-widths of travel), so
// stepping a literal card width made the last several dots all resolve to the
// same clamped end position and never light up. Spreading the stops across the
// travel keeps every dot reachable and keeps the active dot honest.
const STOP_COUNT = CARDS.length;

function stopScrollY(st: CareScrollTrigger, index: number): number {
  const clamped = Math.max(0, Math.min(index, STOP_COUNT - 1));
  return st.start + ((st.end - st.start) * clamped) / (STOP_COUNT - 1);
}

function stopIndexAt(st: CareScrollTrigger, scrollY: number): number {
  const span = st.end - st.start;
  if (span <= 0) return 0;
  const progress = Math.max(0, Math.min(1, (scrollY - st.start) / span));
  return Math.round(progress * (STOP_COUNT - 1));
}

export default function AnimatedServiceCards() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showTuning, setShowTuning] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  // Gates the dev-overlay portal below. `typeof document !== "undefined"` is
  // true on the very first client render too (hydration), which doesn't
  // match the server's null render for that branch and causes a hydration
  // mismatch; mounted only flips true in an effect, one render after
  // hydration, so the first client render matches the server.
  const [mounted, setMounted] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tapeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const priceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const detailsButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const topRefs = useRef<(HTMLImageElement | null)[]>([]);
  const bottomRefs = useRef<(HTMLImageElement | null)[]>([]);
  const pawRefs = useRef<(HTMLDivElement | null)[][]>([]);

  // Carousel nav (arrows + dots) — scrolls the page to the matching position
  // within the pin instead of animating the track's x directly. The track's
  // x is driven exclusively by initPersonalizedCareScroll's scroll-scrub
  // (app/page.tsx); window.scrollY is the single source of truth for it, so
  // navigation here just moves scrollY and lets that scrub follow — no
  // second system fighting over the same transform.
  const goToCarouselIndex = (i: number) => {
    const st = careScrollTrigger();
    if (!st) return;
    const clampedIndex = Math.max(0, Math.min(i, STOP_COUNT - 1));
    window.scrollTo({ top: stopScrollY(st, clampedIndex), behavior: "smooth" });
    setCarouselIndex(clampedIndex);
  };

  // Swipe/drag — same principle: translate horizontal pointer movement into
  // an equivalent window.scrollTo, never touch the track's transform
  // directly. Refs, not state, so pointermove doesn't re-render every frame.
  const dragStateRef = useRef<{ startX: number; startScrollY: number; startTime: number; moved: boolean } | null>(null);
  // Set true right as a drag-with-movement ends, so the click the browser
  // fires immediately after pointerup doesn't also trigger a card's onClick
  // (goToServices) — cleared the moment it's consumed or a new drag starts.
  const suppressClickRef = useRef(false);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = careScrollTrigger();
    if (!st) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    suppressClickRef.current = false;
    dragStateRef.current = { startX: e.clientX, startScrollY: window.scrollY, startTime: Date.now(), moved: false };
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    const st = careScrollTrigger();
    if (!state || !st) return;
    const delta = e.clientX - state.startX;
    if (Math.abs(delta) > 4) state.moved = true;
    if (!state.moved) return;
    // Dragging left reveals cards to the right, same as scrolling further
    // into the pin — so drag delta maps to an inverted scroll delta.
    let nextY = state.startScrollY - delta;
    // Rubber-band resistance past either end — things slow down instead of
    // hitting a hard wall (emil-design-eng: friction instead of hard stops).
    if (nextY < st.start) nextY = st.start - (st.start - nextY) * 0.35;
    else if (nextY > st.end) nextY = st.end + (nextY - st.end) * 0.35;
    window.scrollTo(0, nextY);
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    const st = careScrollTrigger();
    dragStateRef.current = null;
    if (!state || !st) return;
    if (!state.moved) return;
    suppressClickRef.current = true;
    const elapsed = Math.max(1, Date.now() - state.startTime);
    const delta = e.clientX - state.startX;
    const velocity = Math.abs(delta) / elapsed;
    // A quick flick advances one stop regardless of distance; a slow drag
    // settles on whichever stop it landed nearest.
    const targetIndex = velocity > 0.5
      ? stopIndexAt(st, window.scrollY) + (delta < 0 ? 1 : -1)
      : stopIndexAt(st, window.scrollY);
    goToCarouselIndex(targetIndex);
  };

  const handleTrackClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      e.stopPropagation();
      e.preventDefault();
      suppressClickRef.current = false;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the active dot in sync when the row is scrubbed by plain wheel/
  // trackpad scrolling rather than by the arrows and dots. Reads the same
  // window.scrollY the scrub itself reads, so the dots can never disagree
  // with where the row actually is.
  useEffect(() => {
    const onScroll = () => {
      const st = careScrollTrigger();
      if (!st) return;
      setCarouselIndex((prev) => {
        const next = stopIndexAt(st, window.scrollY);
        return next === prev ? prev : next;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TUNING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({
          globalIntensity: typeof parsed.globalIntensity === "number" ? parsed.globalIntensity : DEFAULT_SETTINGS.globalIntensity,
          card: { ...DEFAULT_SETTINGS.card, ...parsed.card },
          cardBg: { ...DEFAULT_SETTINGS.cardBg, ...parsed.cardBg },
          cardStyle: { ...DEFAULT_SETTINGS.cardStyle, ...parsed.cardStyle },
          paws: { ...DEFAULT_SETTINGS.paws, ...parsed.paws },
          top: { ...DEFAULT_SETTINGS.top, ...parsed.top },
          bottom: { ...DEFAULT_SETTINGS.bottom, ...parsed.bottom },
        });
      }
    } catch {
      /* ignore malformed saved settings */
    }
  }, []);

  useEffect(() => {
    tapeRefs.current.forEach((el, i) => el && gsap.set(el, { rotation: tapeBaseRotationFor(i), scale: 1 }));
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

  const updateFeel = (layerKey: LayerKey, field: keyof LayerFeel, value: number | boolean) =>
    setSettings((prev) => ({ ...prev, [layerKey]: { ...prev[layerKey], [field]: value } }));
  const updateCard = (field: keyof CardFeel, value: number | boolean | string) =>
    setSettings((prev) => ({ ...prev, card: { ...prev.card, [field]: value } }));
  const updateCardBg = (field: keyof CardBgFeel, value: number | boolean) =>
    setSettings((prev) => ({ ...prev, cardBg: { ...prev.cardBg, [field]: value } }));
  const updateCardStyle = (field: keyof CardStyleFeel, value: number) =>
    setSettings((prev) => ({ ...prev, cardStyle: { ...prev.cardStyle, [field]: value } }));
  const updateGlobalIntensity = (value: number) =>
    setSettings((prev) => ({ ...prev, globalIntensity: value }));
  const updatePaws = (field: keyof PawFeel, value: number | boolean) =>
    setSettings((prev) => ({ ...prev, paws: { ...prev.paws, [field]: value } }));

  const saveAsDefault = () => window.localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(settings));
  const resetToDefault = () => {
    setSettings(DEFAULT_SETTINGS);
    window.localStorage.removeItem(TUNING_STORAGE_KEY);
  };

  const handleEnter = (i: number) => {
    if (CARDS[i].variant === "simple") return;
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
    if (CARDS[i].variant === "simple") return;
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
    <>
      <div id="home-personalized-care-carousel">
        {/* Track's x is driven entirely by initPersonalizedCareScroll's
            scroll-scrub (app/page.tsx) — the carousel controls below
            (arrows/dots/drag) move window.scrollY instead of animating x
            directly, so nothing here ever fights that scrub. */}
        <div
          id="home-animated-products-grid"
          className="services-grid"
          style={{ gap: settings.cardStyle.cardGap, touchAction: "pan-y" }}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
          onClickCapture={handleTrackClickCapture}
        >
        {CARDS.map((card, i) => card.variant === "simple" ? (
          <div
            key={card.title}
            id={`home-product-card-${i}`}
            className="service-card"
            onClick={goToServices}
            style={{ cursor: "pointer" }}
          >
            <div className="service-icon-badge" aria-hidden="true"><img src={card.icon} alt="" loading="lazy" /></div>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
            <div className="svc-price">{card.price}<span>{card.priceUnit}</span></div>
            <div className="price-tax-note" style={{ fontSize: 12, color: "var(--mid-gray)", fontWeight: 400, marginTop: 2 }}>+ sales tax</div>
            {card.badge && (
              <span className={`badge ${card.badge.className}`} style={{ background: "transparent", border: "none", padding: "2px 8px", fontSize: 11, marginTop: 12, alignSelf: "flex-start" }}>
                {card.badge.text}
              </span>
            )}
          </div>
        ) : (
          <div
            key={card.title}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={() => handleLeave(i)}
            onClick={goToServices}
            style={{ position: "relative", cursor: "pointer" }}
          >
            <div
              id={`home-product-card-tape-${i}`}
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
              id={`home-product-card-body-${i}`}
              ref={(el) => { cardRefs.current[i] = el; }}
              style={{
                position: "relative",
                overflow: "hidden",
                // The wrapper div (this element's parent) is a flex item and
                // stretches to match the row's tallest card; without an
                // explicit height this card sized to its own content and left
                // a transparent gap below it, so its bottom edge sat ~47px
                // above the simple (icon) cards' — this fills the stretch.
                height: "100%",
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
                <img
                  id={`home-product-card-bg-${i}`}
                  src="/img/card_bg.png"
                  alt=""
                  style={{
                    position: "absolute", top: -32, left: -28, right: -28, bottom: -32,
                    width: "calc(100% + 56px)", height: "calc(100% + 64px)",
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
                  id={`home-product-card-photo-stage-${i}`}
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
                  <img
                    id={`home-product-card-bottom-layer-${i}`}
                    ref={(el) => { bottomRefs.current[i] = el; }}
                    src={card.bottomLayerSrc}
                    alt=""
                    style={{
                      position: "absolute", left: 0, top: 0,
                      width: LAYER_WIDTH.bottom, height: LAYER_WIDTH.bottom * BOTTOM_LAYER_RATIO,
                      willChange: "transform",
                    }}
                  />
                  <img
                    id={`home-product-card-top-layer-${i}`}
                    ref={(el) => { topRefs.current[i] = el; }}
                    src={card.topLayer.src}
                    alt=""
                    style={{
                      position: "absolute", left: 0, bottom: 0,
                      width: LAYER_WIDTH.top, height: LAYER_WIDTH.top * card.topLayer.ratio,
                      transformOrigin: "left bottom", willChange: "transform",
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
                      <span className={`badge ${card.badge.className}`} style={{ background: "transparent", border: "none", padding: "2px 8px", fontSize: 11 }}>
                        {card.badge.text}
                      </span>
                    ) : <span />}
                    <button
                      id={`home-product-card-details-button-${i}`}
                      ref={(el) => { detailsButtonRefs.current[i] = el; }}
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={(e) => { e.stopPropagation(); goToServices(); }}
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

        <button
          type="button"
          id="home-personalized-care-prev"
          className="carousel-arrow carousel-arrow-prev"
          aria-label="Previous services"
          disabled={carouselIndex === 0}
          onClick={() => goToCarouselIndex(carouselIndex - 1)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          type="button"
          id="home-personalized-care-next"
          className="carousel-arrow carousel-arrow-next"
          aria-label="Next services"
          disabled={carouselIndex === STOP_COUNT - 1}
          onClick={() => goToCarouselIndex(carouselIndex + 1)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        {/* One dot per stop across the row's travel (see STOP_COUNT) — these
            are scroll positions, not individual cards, so they're labelled
            positionally rather than by card title. */}
        <div id="home-personalized-care-dots">
          {Array.from({ length: STOP_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`carousel-dot${i === carouselIndex ? " active" : ""}`}
              aria-label={`Scroll services to position ${i + 1} of ${STOP_COUNT}`}
              aria-current={i === carouselIndex}
              onClick={() => goToCarouselIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Temporary dev overlay for dialing in the product-card hover animation —
          remove once finalized. Mirrors /playground/service-cards, minus its
          page-background group (not applicable here). Portaled to document.body:
          #page-home carries a leftover inline transform from GSAP's page-transition
          fromTo (translateY settles but the transform property itself stays), and
          any transformed ancestor turns position:fixed descendants into being
          positioned relative to IT instead of the viewport — same fix pattern as
          the Calendly modal in MeetGreetForm.tsx. `mounted` (not a `typeof
          document` check) gates this: the first client render must match the
          server's, and `typeof document !== "undefined"` is already true on
          that first client render (unlike on the server), which was causing
          a real, reproducible hydration mismatch every load. */}
      {mounted && createPortal(showTuning ? (
        <aside
          id="hc-card-tuning-panel"
          style={{
            position: "fixed", top: 0, left: 0, width: 340, height: "100vh", overflowY: "auto",
            background: "var(--warm-white)", borderRight: "1px solid rgba(36,35,33,0.12)",
            padding: 24, zIndex: 9999, boxShadow: "2px 0 10px rgba(35,31,24,0.06)",
            display: "flex", flexDirection: "column", gap: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--charcoal)" }}>Card Animation Tuning</div>
            <button type="button" onClick={() => setShowTuning(false)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(36,35,33,0.2)", background: "transparent", color: "var(--charcoal)", fontSize: 12, cursor: "pointer" }}>
              Hide
            </button>
          </div>

          <div style={{
            padding: "14px 16px", background: "var(--cream)", border: "1px solid rgba(36,35,33,0.12)", borderRadius: "var(--radius)",
          }}>
            <label htmlFor="hc-global-intensity" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--charcoal)" }}>Hover strength</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--sage-dark)" }}>{settings.globalIntensity}x</span>
              </span>
              <input id="hc-global-intensity" type="range" min={0} max={2.5} step={0.05}
                value={settings.globalIntensity} onChange={(e) => updateGlobalIntensity(parseFloat(e.target.value))}
                style={{ width: "100%", height: 6, accentColor: "var(--sage-dark)" }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={saveAsDefault}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "none", background: "var(--sage-dark)", color: "var(--warm-white)", fontSize: 13, cursor: "pointer" }}>
              Save as Default
            </button>
            <button type="button" onClick={resetToDefault}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(36,35,33,0.2)", background: "transparent", color: "var(--charcoal)", fontSize: 13, cursor: "pointer" }}>
              Reset
            </button>
          </div>

          <CardFeelGroup feel={settings.card} onUpdate={(field, v) => updateCard(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <CardBgFeelGroup feel={settings.cardBg} onUpdate={(field, v) => updateCardBg(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <CardStyleFeelGroup feel={settings.cardStyle} onUpdate={(field, v) => updateCardStyle(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <PawFeelGroup feel={settings.paws} onUpdate={(field, v) => updatePaws(field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <LayerFeelGroup layerKey="top" label="Top Layer (walker + dog)" feel={settings.top} onUpdate={(field, v) => updateFeel("top", field, v)} />
          <div style={{ height: 1, background: "rgba(36,35,33,0.12)" }} />
          <LayerFeelGroup layerKey="bottom" label="Bottom Layer (background)" feel={settings.bottom} onUpdate={(field, v) => updateFeel("bottom", field, v)} />
        </aside>
      ) : (
        <button
          type="button" id="hc-card-tuning-toggle" onClick={() => setShowTuning(true)}
          style={{
            position: "fixed", bottom: 16, left: 16, zIndex: 9998,
            padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(36,35,33,0.2)",
            background: "var(--warm-white)", color: "var(--charcoal)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 10px rgba(35,31,24,0.16)",
          }}
        >
          🃏 Tune Cards
        </button>
      ), document.body)}
    </>
  );
}
