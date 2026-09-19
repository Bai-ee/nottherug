'use client';

/**
 * Renders the latest rendered brief HTML. The document is fixture or
 * model-generated content, so it is sandboxed: no scripts, and never
 * allow-same-origin alongside allow-scripts (that pairing would let
 * sandboxed script read/write the parent origin). allow-popups only, so
 * source links in the report still open in a new tab. The generated
 * document itself is never restyled — only the surrounding chrome (the
 * parent page's `.card` panel and the frame's own layout-only sizing rule,
 * `#brief-report-preview-frame`) belongs to this restyle.
 */
export function BriefHtmlPreview({ loading, html }: { loading: boolean; html: string }) {
  if (loading) {
    return <div className="form-note">Loading latest brief…</div>;
  }
  if (html) {
    return (
      <iframe
        id="brief-report-preview-frame"
        title="Latest Not The Rug brief"
        srcDoc={html}
        sandbox="allow-popups"
      />
    );
  }
  return <div className="form-note">No HTML brief has been generated yet. Run the brief to create one.</div>;
}
