// Applies a founder change list to the source files.
//
//   node scripts/copy/apply-copy.mjs path/to/copy-changes.json [--check]
//
// --check validates without writing. Without it, validation still runs first
// and nothing is written unless every change passes, so a bad change list
// cannot leave the repo half-edited.
//
// Safety model: a change is only applied when its `id` exists in the current
// inventory AND the `current` text it echoes still matches what the inventory
// recorded AND the exact source substring is still present at the recorded
// line. Any drift means the site changed since the tool file was generated —
// the run aborts and asks for a regenerate rather than guessing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK_ONLY = process.argv.includes('--check');
const changesPath = process.argv.slice(2).find((a) => !a.startsWith('--'));

if (!changesPath) {
  console.error('usage: node scripts/copy/apply-copy.mjs <changes.json> [--check]');
  process.exit(1);
}

const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/copy/copy-inventory.json'), 'utf8'));
const byKey = new Map(inventory.entries.filter((e) => !e.duplicateOf).map((e) => [e.key, e]));

const payload = JSON.parse(fs.readFileSync(path.resolve(changesPath), 'utf8'));
const changes = payload.changes || [];

/* ------------------------------------------------------------- re-encoding */

const INLINE_TAG = /<\/?(?:br|em|strong|b|i|u|small|sup|sub|mark)\b[^>]*>/gi;
const ENTITY = /&(?:[a-zA-Z]+|#\d+);/g;
const HOLD_OPEN = '';
const HOLD_CLOSE = '';

function decodeEntities(s) {
  return s
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&middot;/g, '·')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&');
}

// Founders write plain text. JSX needs the apostrophes, quotes and ampersands
// escaped, while the handful of inline tags the design relies on must survive.
function encodeJsxText(input) {
  const held = [];
  const hold = (m) => `${HOLD_OPEN}${held.push(m) - 1}${HOLD_CLOSE}`;
  let s = input.replace(INLINE_TAG, hold).replace(ENTITY, hold);
  s = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
  return s.replace(new RegExp(`${HOLD_OPEN}(\\d+)${HOLD_CLOSE}`, 'g'), (_, i) => held[Number(i)]);
}

function encodeAttr(input) {
  return decodeEntities(input).replace(INLINE_TAG, '').replace(/"/g, '&quot;').trim();
}

function encodeJsString(input, quote) {
  const plain = decodeEntities(input).replace(INLINE_TAG, '');
  return plain.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), `\\${quote}`);
}

function rebuildMatch(entry, newText) {
  if (entry.matchKind === 'attr') {
    return `${entry.attrName}="${encodeAttr(newText)}"`;
  }
  if (entry.matchKind === 'js-string') {
    const q = entry.match.match(/(['"`])/)?.[1] || "'";
    const rebuilt = encodeJsString(newText, q);
    // Swap only the quoted literal, keeping `prop: ` / `const NAME = ` intact.
    return entry.match.replace(new RegExp(`${q}(?:\\\\.|(?!${q}).)*${q}`), `${q}${rebuilt}${q}`);
  }
  return encodeJsxText(newText);
}

/* -------------------------------------------------------------- validation */

const errors = [];
const planned = [];
const seenIds = new Set();

for (const [i, ch] of changes.entries()) {
  const where = `changes[${i}]`;
  if (!ch || typeof ch.id !== 'string') { errors.push(`${where}: missing "id"`); continue; }
  if (seenIds.has(ch.id)) { errors.push(`${where}: "${ch.id}" listed more than once`); continue; }
  seenIds.add(ch.id);

  const entry = byKey.get(ch.id);
  if (!entry) { errors.push(`${where}: unknown id "${ch.id}" — not in the inventory (invented or mistyped)`); continue; }

  if (typeof ch.new !== 'string' || !ch.new.trim()) {
    errors.push(`${where} (${ch.id}): "new" is missing or empty — copy slots cannot be blanked`);
    continue;
  }
  if (typeof ch.current === 'string' && ch.current.trim() !== entry.current.trim()) {
    errors.push(
      `${where} (${ch.id}): "current" does not match the inventory.\n` +
      `        tool file says:   ${JSON.stringify(entry.current)}\n` +
      `        change list says: ${JSON.stringify(ch.current)}`
    );
    continue;
  }

  const abs = path.join(ROOT, entry.file);
  const src = fs.readFileSync(abs, 'utf8');
  const lineStarts = [0];
  for (let k = 0; k < src.length; k++) if (src[k] === '\n') lineStarts.push(k + 1);

  const lineAt = (idx) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };

  // The recorded line is where the text run begins, so the right occurrence is
  // the one that starts on exactly that line. Scanning by line rather than by
  // byte distance keeps this correct on lines carrying a long inline SVG.
  const targets = [];
  let broke = false;
  for (const ln of entry.lines || [entry.line]) {
    let at = src.indexOf(entry.match, lineStarts[ln - 1] ?? 0);
    while (at !== -1 && lineAt(at) < ln) at = src.indexOf(entry.match, at + 1);
    if (at === -1 || lineAt(at) !== ln) {
      errors.push(`${where} (${ch.id}): source text no longer found at ${entry.file}:${ln} — regenerate the inventory`);
      broke = true;
      break;
    }
    targets.push(at);
  }
  if (broke) continue;

  const replacement = rebuildMatch(entry, ch.new);
  if (replacement === entry.match) continue; // nothing to do
  planned.push({ entry, change: ch, targets, replacement });
}

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} — nothing was written:\n`);
  errors.forEach((e) => console.error('  - ' + e));
  console.error('');
  process.exit(1);
}

/* ------------------------------------------------------------------ report */

console.log(`${planned.length} change${planned.length === 1 ? '' : 's'} ready across ${new Set(planned.map((p) => p.entry.file)).size} file(s)\n`);
for (const p of planned) {
  const times = p.targets.length > 1 ? ` (${p.targets.length} places)` : '';
  console.log(`  ${p.entry.file}:${p.entry.line}${times}  ${p.entry.key}`);
  console.log(`    - ${p.entry.match}`);
  console.log(`    + ${p.replacement}`);
  if (p.change.notes) console.log(`    note: ${p.change.notes}`);
}

if (CHECK_ONLY) {
  console.log('\n--check: no files written.');
  process.exit(0);
}

/* ------------------------------------------------------------------- write */

const edits = new Map();
for (const p of planned) {
  if (!edits.has(p.entry.file)) edits.set(p.entry.file, []);
  for (const at of p.targets) edits.get(p.entry.file).push({ at, len: p.entry.match.length, text: p.replacement });
}

for (const [file, list] of edits) {
  const abs = path.join(ROOT, file);
  let src = fs.readFileSync(abs, 'utf8');
  // Apply back to front so earlier offsets stay valid.
  list.sort((a, b) => b.at - a.at);
  for (const e of list) src = src.slice(0, e.at) + e.text + src.slice(e.at + e.len);
  fs.writeFileSync(abs, src);
  console.log(`\nwrote ${file} (${list.length} edit${list.length === 1 ? '' : 's'})`);
}

console.log('\nNext: npx tsc --noEmit, then regenerate the tool file:');
console.log('  node scripts/copy/extract-copy.mjs');
