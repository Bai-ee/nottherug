import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { renderGeneratorImage } from '@/lib/generator/server';
import {
  clampPlacement,
  type GeneratorRenderRequest,
  type CanvasPresetKey,
  type LogoAssetKey,
} from '@/lib/generator/types';

export const runtime = 'nodejs';

// ─── Validation ────────────────────────────────────────────────────────────────

const VALID_PRESETS    = new Set<CanvasPresetKey>(['portrait', 'square', 'landscape', 'verticalMax', 'storiesReels']);
const VALID_LOGO_KEYS  = new Set<LogoAssetKey>(['notRugGreen', 'notRugYellow']);

function isValidRequest(b: unknown): b is GeneratorRenderRequest {
  if (!b || typeof b !== 'object') return false;
  const r = b as GeneratorRenderRequest;
  if (!VALID_PRESETS.has(r.canvasPreset)) return false;
  if (!VALID_LOGO_KEYS.has(r.logoAsset)) return false;
  const p = r.placement;
  if (!p || typeof p.xRatio !== 'number' || typeof p.yRatio !== 'number' || typeof p.diameterRatio !== 'number') return false;
  return true;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Verify admin
  let adminEmail: string;
  try {
    adminEmail = await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return NextResponse.json({ error: 'Invalid or missing fields in request body' }, { status: 400 });
  }

  const { sourcePhotoId, canvasPreset, logoAsset, placement: rawPlacement, renderer = 'sharp' } = body;

  const placement = clampPlacement(rawPlacement);
  try {
    const render = await renderGeneratorImage({
      adminEmail,
      sourcePhotoId,
      canvasPreset,
      logoAsset,
      placement,
      renderer,
      origin: req.nextUrl.origin,
    });
    return NextResponse.json({ render }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generator render failed' },
      { status: 500 },
    );
  }
}
