// Builds the founder copy inventory from the live source files.
//
//   node scripts/copy/extract-copy.mjs
//
// Writes docs/copy/copy-inventory.json (machine source of truth) and
// docs/copy/COPY-REVIEW-TOOL.md (the file handed to the founder).
// Re-run it any time the site copy changes in code; keys stay stable as long
// as a block keeps its enclosing DOM id and its position inside that block.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanJsx } from './lib-jsx.mjs';
import { SECTIONS, PAGE_ORDER, PAGE_TITLES, IGNORE_TEXT, IGNORE_PATTERNS, FIELD_NOTES } from './copy-map.mjs';
import { renderTool } from './render-tool.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ---------------------------------------------------------------- sources */

// app/page.tsx's nine virtual pages were extracted into real routes and
// components/marketing/** (plans/002-production-readiness.md, P2A). Each
// small file below now maps to one (or occasionally two) of the original
// sections in copy-map.mjs instead of one giant file with line ranges.
//
// components/AnimatedServiceCards.tsx and components/marketing/
// DisabledHomeSections.tsx are deliberately absent: every export in
// DisabledHomeSections.tsx is only ever mounted behind `{false && ...}` at
// its call site (app/(marketing)/page.tsx), so none of that copy is on the
// live site — same rule as the original app/page.tsx `{false && (...)}`
// blocks. Re-enable a block in the code and wire its source back in here to
// bring its copy back into the inventory.
// jsxRange must start at (or after) the component's own `return (` line, not
// at the top of the file: the scanner treats the first unmatched `{` it sees
// as the start of a JSX expression and skips to its balanced `}`, so
// starting inside `export default function X() {` — before `return (` —
// swallows the entire function body (imports/types above `return` contain
// their own `{}` too, e.g. `import { x } from '...'`, which produces
// garbage "text" items). Each range below was picked by hand against the
// actual file.
const JSX_SOURCES = [
  { file: 'components/SiteNav.tsx', page: 'global', jsxRange: [36, 999], skipRanges: [] },
  { file: 'components/marketing/SiteFooter.tsx', page: 'global', jsxRange: [7, 999], skipRanges: [] },

  { file: 'components/marketing/HomeHero.tsx', page: 'home', jsxRange: [11, 999], skipRanges: [] },
  { file: 'components/marketing/HowItWorksStrip.tsx', page: 'home', jsxRange: [49, 999], skipRanges: [] },
  { file: 'components/marketing/TrustBar.tsx', page: 'home', jsxRange: [4, 999], skipRanges: [] },
  // Two entries, not one [4, 999] range with a skipRange over the gap: the
  // scanner treats any unescaped `{` it meets outside a tag as the start of
  // a JSX expression and skips to its balanced `}` (skipBalancedBraces) —
  // the gap between PreviewCard's closing brace and the main component
  // contains `export default function ServicesPreview() {`, whose own
  // opening brace gets mistaken for one, silently swallowing the rest of
  // the file as "inside an expression" (this is how "A Williamsburg
  // service, not a platform" first went missing from the inventory —
  // caught during manual QA, not by the scanner itself). skipRanges only
  // filters output lines; it cannot stop the scan from being derailed by
  // that gap. Two ranges, each ending before the other component's own
  // `{`, avoid the gap entirely.
  { file: 'components/marketing/ServicesPreview.tsx', page: 'home', jsxRange: [4, 11], skipRanges: [] },
  { file: 'components/marketing/ServicesPreview.tsx', page: 'home', jsxRange: [19, 999], skipRanges: [] },
  { file: 'components/marketing/ClosingTrust.tsx', page: 'home', jsxRange: [10, 999], skipRanges: [] },
  { file: 'components/marketing/FeaturedReviews.tsx', page: 'home', jsxRange: [7, 999], skipRanges: [] },
  { file: 'components/marketing/HomePageContent.tsx', page: 'home', jsxRange: [28, 999], skipRanges: [] },

  { file: 'components/marketing/ServicesPageContent.tsx', page: 'services', jsxRange: [40, 999], skipRanges: [] },
  { file: 'components/marketing/ServiceGrid.tsx', page: 'services', jsxRange: [6, 999], skipRanges: [] },

  { file: 'components/marketing/HowItWorksPageContent.tsx', page: 'how-it-works', jsxRange: [15, 999], skipRanges: [] },
  { file: 'components/marketing/SampleWalkReportCard.tsx', page: 'how-it-works', jsxRange: [3, 999], skipRanges: [] },

  { file: 'components/marketing/AboutPageContent.tsx', page: 'about', jsxRange: [15, 999], skipRanges: [] },
  { file: 'components/marketing/TeamGrid.tsx', page: 'about', jsxRange: [46, 999], skipRanges: [] },
  { file: 'components/marketing/ValuesGrid.tsx', page: 'about', jsxRange: [9, 999], skipRanges: [] },

  { file: 'components/marketing/SafetyPageContent.tsx', page: 'safety', jsxRange: [16, 999], skipRanges: [] },
  { file: 'components/marketing/CertificationStrip.tsx', page: 'safety', jsxRange: [5, 999], skipRanges: [] },
  { file: 'components/marketing/SafetyFaq.tsx', page: 'safety', jsxRange: [19, 999], skipRanges: [] },

  { file: 'components/marketing/NeighborhoodsPageContent.tsx', page: 'neighborhoods', jsxRange: [16, 999], skipRanges: [] },
  { file: 'components/marketing/NeighborhoodCard.tsx', page: 'neighborhoods', jsxRange: [19, 999], skipRanges: [] },
  { file: 'components/marketing/NeighborhoodDetail.tsx', page: 'neighborhoods', jsxRange: [8, 999], skipRanges: [] },

  { file: 'components/marketing/ReviewsPageContent.tsx', page: 'reviews', jsxRange: [14, 999], skipRanges: [] },

  // components/MeetGreetForm.tsx is now a re-export shim (Worker A moved the
  // real form to components/booking/**, in progress concurrently with this
  // extraction — see the P2A report). This range covers only BookingForm.tsx's
  // own JSX; BookingSteps.tsx and SchedulingDialog.tsx are not yet mapped and
  // should be added once that rewrite lands.
  { file: 'components/booking/BookingForm.tsx', page: 'MeetGreetForm', jsxRange: [185, 358], skipRanges: [] },
  // BookingSteps.tsx exports five separate step components, each with its
  // own `return (` — five disjoint ranges, not one [42, 999] range, for the
  // same reason as ServicesPreview.tsx above: the next step's own
  // `function StepX(...) {` would introduce an unmatched `{` that swallows
  // the rest of the file.
  { file: 'components/booking/BookingSteps.tsx', page: 'MeetGreetForm', jsxRange: [42, 107], skipRanges: [] },
  { file: 'components/booking/BookingSteps.tsx', page: 'MeetGreetForm', jsxRange: [110, 159], skipRanges: [] },
  { file: 'components/booking/BookingSteps.tsx', page: 'MeetGreetForm', jsxRange: [162, 195], skipRanges: [] },
  { file: 'components/booking/BookingSteps.tsx', page: 'MeetGreetForm', jsxRange: [222, 298], skipRanges: [] },
  { file: 'components/booking/BookingSteps.tsx', page: 'MeetGreetForm', jsxRange: [321, 361], skipRanges: [] },
  { file: 'components/booking/SchedulingDialog.tsx', page: 'MeetGreetForm', jsxRange: [83, 211], skipRanges: [] },
  { file: 'app/(marketing)/book/page.tsx', page: 'book', jsxRange: [13, 999], skipRanges: [] },
  { file: 'app/(marketing)/contact/page.tsx', page: 'contact', jsxRange: [21, 999], skipRanges: [] },
  { file: 'components/marketing/ContactInfoCard.tsx', page: 'contact', jsxRange: [19, 999], skipRanges: [] },
];

// Copy that lives in plain object literals or module constants, not in JSX.
const DATA_SOURCES = [
  { file: 'lib/content/services.ts', page: 'home', range: [17, 42], props: ['title', 'copy', 'price', 'priceUnit', 'badge'] },
  { file: 'lib/content/services.ts', page: 'services', range: [50, 96], props: ['title', 'copy', 'price', 'priceUnit', 'badge'] },
  { file: 'lib/content/coverage.ts', page: 'neighborhoods', range: [16, 24], props: ['name', 'tagline', 'desc', 'seo'], arrayProps: ['parks'] },
  { file: 'lib/content/contact.ts', page: 'contact', range: [1, 17], consts: ['PHONE_DISPLAY', 'EMAIL_DISPLAY', 'ADDRESS_LINE_1', 'ADDRESS_LINE_2', 'RESPONSE_HOURS', 'RESPONSE_TIME_NOTE', 'SERVICE_AREA_NOTE'] },

  { file: 'components/marketing/ProofMarquee.tsx', page: 'home', range: [1, 11], props: ['quote', 'author'] },
  { file: 'components/marketing/HowItWorksStrip.tsx', page: 'home', range: [38, 43], props: ['title', 'copy'] },
  { file: 'components/marketing/ServicesPageContent.tsx', page: 'services', range: [13, 34], props: ['title', 'desc'] },
  { file: 'components/marketing/TeamGrid.tsx', page: 'about', range: [12, 43], props: ['name', 'role', 'bio'] },
  { file: 'components/marketing/ValuesGrid.tsx', page: 'about', range: [1, 6], props: ['title', 'copy'] },
  { file: 'components/marketing/TrustCards.tsx', page: 'safety', range: [1, 27], props: ['title', 'copy'] },
  { file: 'components/marketing/SafetyFaq.tsx', page: 'safety', range: [5, 11], props: ['q', 'a'] },
  { file: 'components/marketing/ReviewsMasonry.tsx', page: 'reviews', range: [1, 18], props: ['name', 'meta', 'text'] },

  { file: 'app/(marketing)/page.tsx', page: 'home', range: [1, 30], props: ['title', 'description'] },
  { file: 'app/(marketing)/services/page.tsx', page: 'services', range: [1, 13], props: ['title', 'description'] },
  { file: 'app/(marketing)/how-it-works/page.tsx', page: 'how-it-works', range: [1, 13], props: ['title', 'description'] },
  { file: 'app/(marketing)/about/page.tsx', page: 'about', range: [1, 13], props: ['title', 'description'] },
  { file: 'app/(marketing)/safety/page.tsx', page: 'safety', range: [1, 13], props: ['title', 'description'] },
  { file: 'app/(marketing)/neighborhoods/williamsburg/page.tsx', page: 'neighborhoods', range: [1, 13], props: ['title', 'description'] },
  { file: 'app/(marketing)/reviews/page.tsx', page: 'reviews', range: [1, 13], props: ['title', 'description'] },
  { file: 'app/(marketing)/book/page.tsx', page: 'book', range: [1, 13], props: ['title', 'description'] },
  { file: 'app/(marketing)/contact/page.tsx', page: 'contact', range: [1, 13], props: ['title', 'description'] },

  { file: 'app/layout.tsx', page: 'layout', range: [1, 120], consts: ['PAGE_TITLE', 'PAGE_DESCRIPTION'] },
];

/* -------------------------------------------------------------- utilities */

const slug = (s) =>
  s
    .replace(/&[a-z]+;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 5)
    .join('-') || 'item';

// Values like "79" or "$35" slug down to something meaningless on their own,
// so they borrow the field name to stay readable in the change list.
const keyPart = (text, field) => {
  const base = slug(text);
  return /[a-z]/.test(base) ? base : `${field}-${base}`;
};

const ignored = (text) =>
  IGNORE_TEXT.has(text.trim()) || IGNORE_PATTERNS.some((re) => re.test(text.trim()));

function sectionFor(file, line) {
  const list = SECTIONS[file] || [];
  const hit = list.find(([a, b]) => line >= a && line <= b);
  return hit ? { id: hit[2], title: hit[3], note: hit[4] || '' } : { id: 'other', title: 'Other', note: '' };
}

function fieldKind(item) {
  if (item.kind.startsWith('attr:')) return 'image-alt';
  const tag = (item.tag || '').toLowerCase();
  const cls = item.elementClass || '';
  if (/\bbtn\b|cta|nav-cta|mobile-cta/.test(cls) || tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (/stamp-label|label|eyebrow/.test(cls)) return 'label';
  if (/price/.test(cls)) return 'price';
  if (tag === 'li') return 'list-item';
  if (tag === 'p' || tag === 'blockquote') return 'body';
  return 'text';
}

/* --------------------------------------------------------------- pipeline */

const records = [];
const keyCounts = new Map();

function push(rec) {
  let key = rec.key;
  const n = (keyCounts.get(key) || 0) + 1;
  keyCounts.set(key, n);
  if (n > 1) key = `${key}-${n}`;
  records.push({ ...rec, key });
}

for (const src of JSX_SOURCES) {
  const text = read(src.file);
  const lineOffsets = [0];
  for (let k = 0; k < text.length; k++) if (text[k] === '\n') lineOffsets.push(k + 1);
  const from = lineOffsets[src.jsxRange[0] - 1] ?? 0;
  const to = lineOffsets[src.jsxRange[1]] ?? text.length;
  const items = scanJsx(text, { from, to, skipRanges: src.skipRanges });
  for (const item of items) {
    if (ignored(item.text)) continue;
    const section = sectionFor(src.file, item.line);
    if (section.id === 'ignore') continue;
    const page = src.page || item.page;
    push({
      key: `${page}.${section.id}.${keyPart(item.text, fieldKind(item))}`,
      page,
      section: section.id,
      sectionTitle: section.title,
      sectionNote: section.note,
      field: fieldKind(item),
      file: src.file,
      line: item.line,
      anchorId: item.elementId || item.anchorId || '',
      current: item.text,
      match: item.raw,
      matchKind: item.attrName ? 'attr' : 'jsx-text',
      attrName: item.attrName || null,
      note: FIELD_NOTES[item.text.trim()] || '',
    });
  }
}

const FIELD_FOR_PROP = {
  copy: 'body', desc: 'body', description: 'body', PAGE_DESCRIPTION: 'seo-description',
  title: 'heading', name: 'heading', PAGE_TITLE: 'seo-title',
  price: 'price', priceUnit: 'price-unit', text: 'label', tagline: 'label',
  seo: 'seo-phrase', parks: 'list-item', badge: 'label',
  q: 'heading', a: 'body', meta: 'label', role: 'label', bio: 'body',
  quote: 'body', author: 'label',
};

function pushData(src, propName, value, lineNo, match) {
  // Most copy needs real letters to be worth a founder's review, but a
  // price like "$60" or "$100" is exactly the kind of value P2A moved into
  // typed content specifically so it stays reviewable (see lib/content/
  // services.ts) — so a leading "$" is let through even without letters.
  if ((!/[A-Za-z]{2}/.test(value) && !/^\$/.test(value)) || ignored(value)) return;
  const section = sectionFor(src.file, lineNo);
  push({
    key: `${src.page}.${section.id}.${keyPart(value, FIELD_FOR_PROP[propName] || 'text')}`,
    page: src.page,
    section: section.id,
    sectionTitle: section.title,
    sectionNote: section.note,
    field: FIELD_FOR_PROP[propName] || 'text',
    file: src.file,
    line: lineNo,
    anchorId: '',
    current: value,
    match,
    matchKind: 'js-string',
    attrName: null,
    note: FIELD_NOTES[value.trim()] || '',
  });
}

for (const src of DATA_SOURCES) {
  const lines = read(src.file).split('\n');
  for (let i = src.range[0] - 1; i < Math.min(src.range[1], lines.length); i++) {
    const line = lines[i];

    if (src.props) {
      const propRe = new RegExp(`\\b(${src.props.join('|')}):\\s*(['"\`])((?:\\\\.|(?!\\2).)*)\\2`, 'g');
      let m;
      while ((m = propRe.exec(line)) !== null) pushData(src, m[1], m[3], i + 1, m[0]);
    }

    if (src.arrayProps) {
      const arrRe = new RegExp(`\\b(${src.arrayProps.join('|')}):\\s*\\[([^\\]]*)\\]`, 'g');
      let m;
      while ((m = arrRe.exec(line)) !== null) {
        const strRe = /(['"`])((?:\\.|(?!\1).)*)\1/g;
        let sm;
        while ((sm = strRe.exec(m[2])) !== null) pushData(src, m[1], sm[2], i + 1, sm[0]);
      }
    }

    if (src.consts) {
      const constRe = new RegExp(`\\bconst\\s+(${src.consts.join('|')})\\s*=\\s*(['"\`])((?:\\\\.|(?!\\2).)*)\\2`, 'g');
      let m;
      while ((m = constRe.exec(line)) !== null) pushData(src, m[1], m[3], i + 1, m[0]);
    }
  }
}

/* ------------------------------------------------- duplicate consolidation */

// Two kinds of repeated text need different treatment.
//
// Within one section, a repeat is almost always structural — the review
// marquee lists its quotes twice so the loop has no visible seam. Those
// collapse into a single reviewable entry that updates every copy.
//
// Across sections or pages, identical text is a coincidence of wording, not one
// slot: "Book a Walk" in the desktop nav and in the mobile menu are two
// independent places. Those stay separate so the founder can change one without
// silently changing the other, and each carries a note pointing at the others.

const groupKey = (r) => `${r.file}::${r.page}::${r.section}::${r.current}`;

const groups = new Map();
for (const r of records) {
  if (!groups.has(groupKey(r))) groups.set(groupKey(r), []);
  groups.get(groupKey(r)).push(r);
}
for (const group of groups.values()) {
  const lines = group.map((r) => r.line);
  group.forEach((r, idx) => {
    r.occurrences = group.length;
    r.duplicateOf = idx === 0 ? null : group[0].key;
    // Every line the collapsed group occupies. The apply step edits all of
    // them so a looping strip never ends up half-updated.
    if (idx === 0) r.lines = lines;
  });
}

const byText = new Map();
for (const r of records) {
  if (r.duplicateOf) continue;
  if (!byText.has(r.current)) byText.set(r.current, []);
  byText.get(r.current).push(r);
}
for (const [, group] of byText) {
  if (group.length < 2) continue;
  for (const r of group) {
    r.alsoAt = group.filter((o) => o !== r).map((o) => o.key);
  }
}

const inventory = {
  generatedAt: new Date().toISOString().slice(0, 10),
  generator: 'scripts/copy/extract-copy.mjs',
  totalEntries: records.filter((r) => !r.duplicateOf).length,
  pageOrder: PAGE_ORDER,
  pageTitles: PAGE_TITLES,
  entries: records,
};

fs.mkdirSync(path.join(ROOT, 'docs/copy'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/copy/copy-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'docs/copy/COPY-REVIEW-TOOL.md'), renderTool(inventory));

console.log(`copy-inventory.json  ${inventory.totalEntries} editable entries (${records.length} incl. repeats)`);
console.log('COPY-REVIEW-TOOL.md  written');
