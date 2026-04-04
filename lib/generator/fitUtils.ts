/**
 * Shared canvas-fitting contract for the image generator.
 *
 * Preview alignment:
 *   CSS:   object-fit: cover; object-position: center
 *   Sharp: fit: 'cover', position: 'center' (via sharp ResizeOptions)
 *
 * Both produce the same visual result:
 *   - Scale the source so it fills the target dimensions entirely (no empty space).
 *   - Preserve aspect ratio.
 *   - Center the result, cropping excess on both axes equally.
 */

/**
 * Returns the sharp resize options for cover-fitting a source image into a canvas.
 * Use this in the render route to guarantee alignment with the CSS preview.
 */
export function getSharpCoverOptions(width: number, height: number): {
  width: number;
  height: number;
  fit: 'cover';
  position: 'center';
} {
  return { width, height, fit: 'cover', position: 'center' };
}

/**
 * CSS style values that match the sharp cover fit.
 * Apply these on the preview <img> element.
 */
export const PREVIEW_COVER_STYLE = {
  objectFit:      'cover'  as const,
  objectPosition: 'center' as const,
} as const;
