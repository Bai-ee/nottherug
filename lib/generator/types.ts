import type { RendererName } from '@/lib/media/createRenderer';

// ─── Canvas presets ───────────────────────────────────────────────────────────

export type CanvasPresetKey =
  | 'portrait'
  | 'square'
  | 'landscape'
  | 'verticalMax'
  | 'storiesReels';

export interface CanvasPreset {
  key: CanvasPresetKey;
  label: string;
  width: number;
  height: number;
  aspectLabel: string;
}

export const CANVAS_PRESETS: Record<CanvasPresetKey, CanvasPreset> = {
  portrait:     { key: 'portrait',     label: 'Portrait (Recommended)', width: 1080, height: 1350, aspectLabel: '4:5'    },
  square:       { key: 'square',       label: 'Square',                 width: 1080, height: 1080, aspectLabel: '1:1'    },
  landscape:    { key: 'landscape',    label: 'Landscape',              width: 1080, height: 566,  aspectLabel: '1.91:1' },
  verticalMax:  { key: 'verticalMax',  label: 'Vertical Max',           width: 1080, height: 1440, aspectLabel: '3:4'    },
  storiesReels: { key: 'storiesReels', label: 'Stories / Reels',        width: 1080, height: 1920, aspectLabel: '9:16'   },
} as const;

export const DEFAULT_CANVAS_PRESET: CanvasPresetKey = 'portrait';

export const CANVAS_PRESET_ORDER: CanvasPresetKey[] = [
  'portrait',
  'square',
  'landscape',
  'verticalMax',
  'storiesReels',
];

// ─── Logo assets ──────────────────────────────────────────────────────────────

export type LogoAssetKey = 'notRugGreen' | 'notRugYellow';

export interface LogoAssetConfig {
  key: LogoAssetKey;
  label: string;
  /** Path relative to the repo's /public directory — used by server-side sharp. */
  publicPath: string;
  /** URL path served by Next.js static file serving — used by preview <img>. */
  previewSrc: string;
}

export const LOGO_ASSETS: Record<LogoAssetKey, LogoAssetConfig> = {
  notRugGreen: {
    key: 'notRugGreen',
    label: 'NTR Green',
    publicPath: 'public/logos/notRugGreen.png',
    previewSrc: '/logos/notRugGreen.png',
  },
  notRugYellow: {
    key: 'notRugYellow',
    label: 'NTR Yellow',
    publicPath: 'public/logos/notRugYellow.png',
    previewSrc: '/logos/notRugYellow.png',
  },
} as const;

export const LOGO_ASSET_ORDER: LogoAssetKey[] = ['notRugGreen', 'notRugYellow'];

export const DEFAULT_LOGO_ASSET: LogoAssetKey = 'notRugGreen';

// ─── Logo placement (normalized, resolution-independent) ─────────────────────

/**
 * All values are ratios relative to the target canvas:
 *   xRatio        — center-X / canvas width         (0–1)
 *   yRatio        — center-Y / canvas height        (0–1)
 *   diameterRatio — logo diameter / canvas width    (0–1)
 */
export interface NormalizedLogoPlacement {
  xRatio: number;
  yRatio: number;
  diameterRatio: number;
}

/**
 * Default logo diameter is 18% of canvas width.
 * Default placement is bottom-right quadrant.
 */
export const DEFAULT_LOGO_DIAMETER_RATIO = 0.18;

export const DEFAULT_LOGO_PLACEMENT: NormalizedLogoPlacement = {
  xRatio: 0.82,
  yRatio: 0.88,
  diameterRatio: DEFAULT_LOGO_DIAMETER_RATIO,
};

// ─── Source image selection ───────────────────────────────────────────────────

/** 'selected' = user explicitly picked an image; 'random' = pick one at random. */
export type SourceMode = 'selected' | 'random';

// ─── Generator render request ─────────────────────────────────────────────────

export interface GeneratorRenderRequest {
  sourceMode: SourceMode;
  /** Required when sourceMode === 'selected'. */
  sourcePhotoId?: string;
  canvasPreset: CanvasPresetKey;
  logoAsset: LogoAssetKey;
  placement: NormalizedLogoPlacement;
  /** Defaults to 'sharp'. */
  renderer?: RendererName;
}

// ─── Generator render result ──────────────────────────────────────────────────

export type GeneratorRenderStatus = 'pending' | 'complete' | 'error';

export interface GeneratorRender {
  id: string;
  /** The concrete source image used (resolved from selected or random). */
  sourcePhotoId: string;
  sourceStoragePath: string;
  canvasPreset: CanvasPresetKey;
  canvasWidth: number;
  canvasHeight: number;
  logoAsset: LogoAssetKey;
  placement: NormalizedLogoPlacement;
  rendererUsed: RendererName;
  renderStoragePath: string;
  renderDownloadURL: string;
  createdBy: string;
  createdAt: string;
  status: GeneratorRenderStatus;
}

// ─── Storage / Firestore paths ────────────────────────────────────────────────

export const GENERATOR_STORAGE_PATHS = {
  rendered: 'generator/rendered',
} as const;

export const GENERATOR_COLLECTIONS = {
  generatorRenders: 'generatorRenders',
} as const;

// ─── Placement math helpers ───────────────────────────────────────────────────

/**
 * Converts normalized placement to absolute pixel values for sharp (or preview).
 * Returns the top-left corner and pixel size of the logo.
 */
export function placementToPixels(
  placement: NormalizedLogoPlacement,
  canvasWidth: number,
  canvasHeight: number,
): { left: number; top: number; size: number } {
  const size  = Math.round(placement.diameterRatio * canvasWidth);
  const left  = Math.round(placement.xRatio * canvasWidth  - size / 2);
  const top   = Math.round(placement.yRatio * canvasHeight - size / 2);
  return { left, top, size };
}

/**
 * Converts a click position (in preview canvas coordinates) to normalized placement.
 */
export function pixelsToPlacement(
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  diameterRatio: number = DEFAULT_LOGO_DIAMETER_RATIO,
): NormalizedLogoPlacement {
  return {
    xRatio: Math.max(0, Math.min(1, px / canvasWidth)),
    yRatio: Math.max(0, Math.min(1, py / canvasHeight)),
    diameterRatio,
  };
}

/**
 * Clamps placement so the logo stays fully within canvas bounds.
 */
export function clampPlacement(
  placement: NormalizedLogoPlacement,
): NormalizedLogoPlacement {
  const r = placement.diameterRatio / 2;
  return {
    xRatio:        Math.max(r, Math.min(1 - r, placement.xRatio)),
    yRatio:        Math.max(r, Math.min(1 - r, placement.yRatio)),
    diameterRatio: placement.diameterRatio,
  };
}
