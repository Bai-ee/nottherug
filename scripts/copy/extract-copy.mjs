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

// components/AnimatedServiceCards.tsx is deliberately absent: app/page.tsx
// renders it inside a `{false && (...)}` block, so none of its copy is on the
// live site. Five homepage sections are gated the same way and drop out for the
// same reason — the scanner skips JSX expressions, so they never reach the
// inventory. Re-enable a block in the code and it reappears here on the next run.
//
// jsxRange bounds the scan to the component's returned markup. Scanning the
// whole file would feed TypeScript generics (`Record<string, ...>`) to the tag
// reader and corrupt the element stack.
const JSX_SOURCES = [
  { file: 'app/page.tsx', page: null, jsxRange: [655, 2317], skipRanges: [[2235, 2317]] },
  { file: 'components/SiteNav.tsx', page: 'SiteNav', jsxRange: [13, 48], skipRanges: [] },
  { file: 'components/MeetGreetForm.tsx', page: 'MeetGreetForm', jsxRange: [153, 583], skipRanges: [] },
  { file: 'app/book/page.tsx', page: 'book', jsxRange: [36, 95], skipRanges: [] },
  { file: 'app/contact/page.tsx', page: 'contact', jsxRange: [46, 79], skipRanges: [] },
];

// Copy that lives in plain object literals or module constants, not in JSX.
const DATA_SOURCES = [
  {
    file: 'app/page.tsx',
    page: 'neighborhoods',
    range: [551, 561],
    props: ['name', 'tagline', 'desc', 'seo'],
    arrayProps: ['parks'],
  },
  {
    file: 'app/layout.tsx',
    page: 'layout',
    range: [1, 120],
    consts: ['PAGE_TITLE', 'PAGE_DESCRIPTION'],
  },
  {
    file: 'app/book/page.tsx',
    page: 'book',
    range: [1, 40],
    consts: ['PAGE_TITLE', 'PAGE_DESCRIPTION'],
  },
  {
    file: 'app/contact/page.tsx',
    page: 'contact',
    range: [1, 45],
    consts: ['PAGE_TITLE', 'PAGE_DESCRIPTION'],
  },
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
  seo: 'seo-phrase', parks: 'list-item',
};

function pushData(src, propName, value, lineNo, match) {
  if (!/[A-Za-z]{2}/.test(value) || ignored(value)) return;
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
