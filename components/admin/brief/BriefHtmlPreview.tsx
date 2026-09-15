'use client';

/**
 * Renders the latest rendered brief HTML. The document is fixture or
 * model-generated content, so it is sandboxed: no scripts, and never
 * allow-same-origin alongside allow-scripts (that pairing would let
 * sandboxed script read/write the parent origin). allow-popups only, so
 * source links in the report still open in a new tab. Styling (`.nb-preview`
 * / `.nb-empty`) is scoped CSS owned by the parent page.
 */
export function BriefHtmlPreview({ loading, html }: { loading: boolean; html: string }) {
  if (loading) {
    return <div className="nb-empty">Loading latest brief…</div>;
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
  return <div className="nb-empty">No HTML brief has been generated yet. Run the brief to create one.</div>;
}
