# Image Generator

Admin tool for creating branded NTR images.

## Canvas presets

| Key | Label | Dimensions | Aspect |
|-----|-------|-----------|--------|
| `portrait` | Portrait (Recommended) | 1080 × 1350 | 4:5 |
| `square` | Square | 1080 × 1080 | 1:1 |
| `landscape` | Landscape | 1080 × 566 | 1.91:1 |
| `verticalMax` | Vertical Max | 1080 × 1440 | 3:4 |
| `storiesReels` | Stories / Reels | 1080 × 1920 | 9:16 |

Default: `portrait`

## Logo options

| Key | File |
|-----|------|
| `notRugGreen` | `public/logos/notRugGreen.png` |
| `notRugYellow` | `public/logos/notRugYellow.png` |

Default: `notRugGreen`

## Logo sizing rule

Default diameter = **18% of canvas width** (`DEFAULT_LOGO_DIAMETER_RATIO = 0.18`).

## Placement model

Placement is stored as normalized ratios so it is resolution-independent:

```typescript
interface NormalizedLogoPlacement {
  xRatio:        number; // center-X / canvasWidth     (0–1)
  yRatio:        number; // center-Y / canvasHeight    (0–1)
  diameterRatio: number; // diameter / canvasWidth     (0–1)
}
```

Conversion to pixels: `lib/generator/types.ts` → `placementToPixels()`

## Render flow

1. Admin submits a `GeneratorRenderRequest` to `POST /api/admin/generator/render`.
2. Route verifies admin token.
3. Resolves source photo from `photoUploads/{id}` in Firestore.
4. Downloads source buffer from Firebase Storage.
5. Fits source into canvas using sharp `fit: 'cover', position: 'center'`.
6. Loads logo from `public/logos/` on the server filesystem.
7. Resizes logo to computed pixel size, applies circular SVG mask.
8. Composites circular logo at computed position.
9. Outputs JPEG (quality 92).
10. Uploads to Firebase Storage at `generator/rendered/{uuid}.jpg`.
11. Writes `GeneratorRender` record to `generatorRenders` Firestore collection.
12. Returns render record including `renderDownloadURL`.

## Output storage

- Firebase Storage path: `generator/rendered/{uuid}.jpg`
- Firestore collection: `generatorRenders`

## Preview / render alignment

Both use **cover fit centered**:
- CSS preview: `object-fit: cover; object-position: center`
- Sharp render: `fit: 'cover', position: 'center'`

Shared constant: `lib/generator/fitUtils.ts`

## Renderer abstraction

Default: `sharp` (stable, fast, works on Vercel serverless).

FFmpeg is available via the existing `lib/media/createRenderer.ts` abstraction and can be selected via the "Advanced" toggle in the generator UI (dev testing only).

Future video / animated output can be built on top of the same renderer interface.
