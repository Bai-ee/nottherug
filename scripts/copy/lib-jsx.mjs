// Minimal JSX scanner used by the copy-inventory tooling.
// Not a full parser: it walks the file character by character, tracks element
// nesting, and returns the literal text runs a visitor would actually read.
// Anything inside a {JSX expression}, an <svg> subtree, or a dev-only region
// is skipped, so the result is "copy a human sees", not "every string".

const INLINE_TAGS = new Set(['br', 'em', 'strong', 'b', 'i', 'u', 'small', 'sup', 'sub', 'mark']);
const SKIP_SUBTREES = new Set(['svg', 'style', 'script']);
const TEXT_ATTRS = ['alt', 'placeholder', 'aria-label', 'title'];

function skipBalancedBraces(src, i) {
  // src[i] === '{'. Returns index just past the matching '}'.
  // Comment-aware: a JSX comment such as {/* What's always included */} contains
  // an apostrophe that must not be read as the start of a string.
  let depth = 0;
  let quote = null;
  let comment = null; // 'block' | 'line'
  for (; i < src.length; i++) {
    const c = src[i];

    if (comment === 'block') {
      if (c === '*' && src[i + 1] === '/') { comment = null; i++; }
      continue;
    }
    if (comment === 'line') {
      if (c === '\n') comment = null;
      continue;
    }
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }

    if (c === '/' && src[i + 1] === '*') { comment = 'block'; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { comment = 'line'; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return src.length;
}

function readTag(src, i) {
  // src[i] === '<'. Returns { raw, end } where end is just past '>'.
  let depth = 0;
  let quote = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === '\\') { j++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return { raw: src.slice(i, j + 1), end: j + 1 };
  }
  return { raw: src.slice(i), end: src.length };
}

function tagInfo(raw) {
  const closing = /^<\s*\//.test(raw);
  const selfClosing = /\/\s*>$/.test(raw);
  const nameMatch = raw.match(/^<\s*\/?\s*([A-Za-z][A-Za-z0-9.:-]*)/);
  const name = nameMatch ? nameMatch[1] : '';
  const attrs = {};
  const attrRe = /([A-Za-z-]+)="([^"]*)"/g;
  let m;
  while ((m = attrRe.exec(raw)) !== null) attrs[m[1]] = m[2];
  return { closing, selfClosing, name, lower: name.toLowerCase(), attrs, raw };
}

export function scanJsx(src, { from = 0, to = src.length, skipRanges = [] } = {}) {
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
  const skippedLine = (ln) => skipRanges.some(([a, b]) => ln >= a && ln <= b);
  const skipped = (idx) => skippedLine(lineAt(idx));

  const items = [];
  const stack = [];
  let buf = '';
  let bufStart = -1;
  let skipDepth = 0;
  let skipName = '';
  let page = 'global';

  const top = () => stack[stack.length - 1];

  const flush = () => {
    const raw = buf;
    buf = '';
    const start = bufStart;
    bufStart = -1;
    if (!raw.trim()) return;
    if (!/[A-Za-z0-9]/.test(raw.replace(/&[a-z]+;/g, ''))) return;
    const el = top();
    items.push({
      kind: 'text',
      // `text` is normalised for reading; `raw` is the exact substring that
      // exists in the file, which is what the apply step searches for.
      text: raw.trim().replace(/\s+/g, ' '),
      raw: raw.trim(),
      // Anchor to where the trimmed text actually begins, not to the newline
      // that followed the opening tag, so the apply step targets the right line.
      line: start === -1 ? 0 : lineAt(start + (raw.length - raw.trimStart().length)),
      page,
      tag: el ? el.name : '',
      elementId: el ? el.id : '',
      elementClass: el ? el.cls : '',
      anchorId: stack.slice().reverse().find((e) => e.id)?.id || '',
    });
  };

  let i = from;
  while (i < to) {
    const c = src[i];

    if (c === '{') { flush(); i = skipBalancedBraces(src, i); continue; }

    if (c === '<') {
      const { raw, end } = readTag(src, i);
      const t = tagInfo(raw);

      if (skipDepth > 0) {
        if (t.lower === skipName && !t.selfClosing) skipDepth += t.closing ? -1 : 1;
        if (skipDepth === 0) skipName = '';
        i = end;
        continue;
      }

      if (SKIP_SUBTREES.has(t.lower) && !t.closing && !t.selfClosing) {
        flush();
        skipDepth = 1;
        skipName = t.lower;
        i = end;
        continue;
      }
      if (SKIP_SUBTREES.has(t.lower) && t.selfClosing) { i = end; continue; }

      if (INLINE_TAGS.has(t.lower)) {
        if (buf.trim() || t.lower !== 'br') {
          if (bufStart === -1) bufStart = i;
          buf += raw;
        }
        i = end;
        continue;
      }

      flush();

      if (!t.closing && !skipped(i)) {
        for (const a of TEXT_ATTRS) {
          if (t.attrs[a] && /[A-Za-z]{2}/.test(t.attrs[a])) {
            items.push({
              kind: `attr:${a}`,
              text: t.attrs[a],
              raw: `${a}="${t.attrs[a]}"`,
              attrName: a,
              // Attributes are often wrapped onto their own line, so anchor to
              // the attribute inside the tag rather than to the tag's start.
              line: lineAt(i + Math.max(0, t.raw.indexOf(`${a}="`))),
              page,
              tag: t.name,
              elementId: t.attrs.id || '',
              elementClass: t.attrs.class || t.attrs.className || '',
              anchorId: t.attrs.id || stack.slice().reverse().find((e) => e.id)?.id || '',
            });
          }
        }
      }

      if (t.attrs.id && /^page-(home|services|how-it-works|about|safety|neighborhoods|reviews|book|contact)$/.test(t.attrs.id)) {
        page = t.attrs.id.replace(/^page-/, '');
      }

      if (t.closing) {
        const popped = stack.pop();
        if (popped && popped.isPageRoot) page = 'global';
      } else if (!t.selfClosing) {
        stack.push({
          name: t.name,
          id: t.attrs.id || '',
          cls: t.attrs.className || t.attrs.class || '',
          isPageRoot: !!(t.attrs.id && /^page-(home|services|how-it-works|about|safety|neighborhoods|reviews|book|contact)$/.test(t.attrs.id)),
        });
      }

      i = end;
      continue;
    }

    if (bufStart === -1) bufStart = i;
    buf += c;
    i++;
  }
  flush();

  return items.filter((it) => !skippedLine(it.line));
}
