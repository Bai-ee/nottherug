# S2/W3 contrast over photo layers: summary

Full per-element table: contrast-before-after.md. Raw: contrast-{before,after}.json.gz. CSS diff: globals.css.diff.

## Counts (local prod build, 7 public routes x 390/768/1440, mean-pixel ratio)
- Failing text rows: 586 of 1687 before -> 70 of 1688 after (unique element keys: 563 -> 46).
- p5 (5th percentile pixel, stricter): 633 -> 121.
- axe color-contrast: 0 violations before and after on all 7 routes at 390/1440 (axe cannot evaluate text over images; "incomplete" counts are identical before/after, see axe-color-contrast-*.json).
- Layout: 324 id-keyed and 495 footer/nav elements compared, max bbox delta 0.00 px.
- CSS: source 189242 -> 189852 B; compiled chunk 103020 -> 103241 B (+221), gzip 20077 -> 20139 (+62), brotli 17347 -> 17418 (+71).

## Old -> new values (all in app/globals.css)
Tokens
- --gold-light #E8D4A8 -> #F5EACB (gold stamps/eyebrows/labels on olive; 3.9-4.2 -> 4.7-5.0)
- new --gold-ink #9A7A33 (.stars; was --gold #C9A96E at 1.8:1 on paper)
- new --gold-text #6F5620 (.review-platform-note, real text; was --gold at 1.7:1)
- new --sage-ink #5A6F4B (.team-role; was --sage #7A9068 at 3.1:1)
Text alpha (white on footer/nav, cream on olive)
- .footer-tagline .78 -> .92; .footer-col h4 .72 -> .90; .footer-col li a .80 -> .92; .footer-copy .70 -> .95
- .footer-contact-label .68 -> .93; .footer-contact-value .85 -> .95; .footer-link-btn .75 -> .92
- .nav-links a .70 -> .90; .nav-contact-btn .70 -> .90
- #home-closing-trust-section p .70 -> .92; #hero-stats-strip .hero-stat-label .62 -> .74
- .page-hero p .65 -> .85; .review-source-label .50 -> .85
Photo layer opacity (CITYSCAPE PARALLAX LAYERS, opacity values only)
- #home-closing-trust-photo-art .12 -> .08
- #footer-photo-art .15 -> .12
- closing band #home-contact-sheet-photo-art + #footer-photo-art .20 -> .14 (kept equal so the seam stays continuous)
Other
- #home-closing-trust-section .trust-park-tag fill rgba(cream,.10) -> .07
- #home-contact-sheet-section h1 now cream (/signup h1 was ink on olive, 2.8:1)
- .page-hero .label color #DDE8CE !important (inline sage-light on the photo hero, 3.5-4.5:1)
- .hood-card-overlay flat rgba(28,28,26,.4) -> gradient .66 at bottom to .4 at 60% (hover .55 -> .78 to .55)

## Residual (not fixed in CSS, with reason)
- .value-num "01-04" (/about, 1.3:1), .review-mark quote glyph (1.2:1), .review-avatar-ph initials (2.4:1), summary "+" (3.1:1): decorative or duplicated by adjacent text; TSX request aria-hidden.
- .stars glyph rows (3.2-3.6:1 on paper after fix, 1.6-3.8 over /reviews hero photo): graphics, meet 3:1 on paper; hero ones unchanged by this pass.
- /neighborhoods/williamsburg h2 span "Williamsburg" 2.24:1: color is an inline style from lib/content/coverage.ts (#7D9E8C); TSX/content request.
- #home-closing-book-luis-cta at 768 only, 4.11 (terracotta 4.57 elsewhere): sample catches the button's inset outline; same value before.
- /safety 390 footer h4 "Contact", label "Call or Text" and /reviews 390 "Senior & Special Needs": single samples taken mid-scroll at page bottom (same elements measure 5.0+ at every other position); settled screenshot is clean.

## TSX Requests
1. components/marketing/AboutPageContent (ValuesGrid.tsx): `.value-num` div, add aria-hidden="true" (decorative 48px numerals, 1.3:1 by design).
2. components/marketing/ReviewsMasonry.tsx line 40: `<div className="review-mark">`, add aria-hidden="true" (decorative quote glyph).
3. components/marketing/ReviewsMasonry.tsx line 44: `<div className="review-avatar">`, add aria-hidden="true" (initials duplicate .review-name beside it).
4. components/marketing/SafetyFaq.tsx line 44: the `+` span inside <summary>, add aria-hidden="true" (disclosure icon).
5. Stars rows (ReviewsMasonry.tsx 41, FeaturedReviews.tsx 110, ProofMarquee.tsx 16, reviews hero): add aria-hidden="true" or aria-label="5 out of 5 stars" role="img" (screen readers read five "black star").
6. components/marketing/NeighborhoodDetail.tsx line 12: h2 span `color: hood.color` -> `color: color-mix(in oklab, ${hood.color} 62%, black)` (or a darker headingColor in lib/content/coverage.ts), target >= 3:1 on the tinted panel (#4F7A63 gives 3.7:1).
7. components/marketing/{About,Safety,Neighborhoods}PageContent.tsx line 22: drop inline `style={{ color: 'var(--sage-light)' }}` on the hero eyebrow once the CSS rule `.page-hero .label` (!important today) can lose its !important.
