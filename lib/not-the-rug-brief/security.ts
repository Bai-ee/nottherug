/**
 * CSP for routes that return generated brief HTML directly. The report has no
 * scripts and needs only Google Fonts' stylesheet + font files; everything
 * else is denied. This is a top-level-document policy (applies if the HTML is
 * navigated to or framed via `src=`); a `srcDoc`-injected copy is governed
 * instead by the consuming iframe's own `sandbox` attribute.
 */
export const BRIEF_HTML_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join('; ');

export function briefHtmlHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': BRIEF_HTML_CSP,
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
}
