/**
 * Dresses the Calendly booking page in the site's own palette.
 *
 * The scheduler runs in a cross-origin iframe, so nothing inside it can be
 * styled with our CSS. Calendly's embed does accept a small set of theme
 * parameters, and those are the only lever there is: background, text and
 * primary colour, plus hiding the cookie banner it would otherwise stack on
 * top of the dialog. Everything else a visitor sees — the band, the heading,
 * the close button, the frame — is ours and is styled normally.
 *
 * Colours are passed as bare hex, which is the format Calendly's embed
 * expects; a leading # is rejected and silently drops the theme.
 */

/** Site tokens, resolved here because a URL cannot read a CSS variable. */
const EMBED_THEME = {
  background_color: 'f3ecd9', // --paper
  text_color: '242321', // --ink
  primary_color: 'c4674b', // --terracotta
  hide_gdpr_banner: '1',
} as const;

export function buildCalendlyEmbedUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;

  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(EMBED_THEME)) {
      // Never override a parameter the configured URL already sets: whoever
      // wrote that link meant it.
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    // A malformed or relative URL is not ours to rewrite — hand it back
    // untouched rather than breaking the one link that opens the scheduler.
    return baseUrl;
  }
}
