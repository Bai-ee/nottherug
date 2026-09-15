# Founder copy review — how the round trip works

A closed loop for updating website copy without a CMS and without hand-editing JSX
from an email thread.

```
  source files  ──[ extract-copy.mjs ]──▶  COPY-REVIEW-TOOL.md  ──▶  founder + his agent
       ▲                                                                    │
       └──────────────[ apply-copy.mjs ]◀──  copy-changes.json  ◀───────────┘
```

## Files

| File | What it is | Edit by hand? |
|---|---|---|
| `COPY-REVIEW-TOOL.md` | The file you send the founder. Every piece of live copy plus the rules his agent must follow. | No — regenerate |
| `copy-inventory.json` | Machine source of truth. Each entry carries the id, the exact source substring, file and line. | No — regenerate |
| `scripts/copy/extract-copy.mjs` | Builds both of the above from the source files. | Yes |
| `scripts/copy/copy-map.mjs` | Maps line ranges to the section names the founder reads. Update when sections move. | Yes |
| `scripts/copy/lib-jsx.mjs` | The JSX text scanner. | Rarely |
| `scripts/copy/apply-copy.mjs` | Applies a returned change list. | Yes |

## The loop

**1. Generate**

```bash
node scripts/copy/extract-copy.mjs
```

Send `docs/copy/COPY-REVIEW-TOOL.md` to the founder. Nothing else — it is self-contained.

**2. He reviews it with his own agent** and sends back a JSON block. Save it, e.g. `copy-changes.json`.

**3. Check before writing**

```bash
node scripts/copy/apply-copy.mjs copy-changes.json --check
```

Prints every edit as a before/after. Writes nothing.

**4. Apply**

```bash
node scripts/copy/apply-copy.mjs copy-changes.json
npx tsc --noEmit
node scripts/copy/extract-copy.mjs   # re-sync the inventory
```

## Why new copy cannot be invented

The inventory is the schema. A change is applied only when all of these hold:

- the `id` exists in `copy-inventory.json`
- the `current` text echoed back still matches what the inventory recorded
- the exact source substring is still present at the recorded line
- `new` is non-empty

Anything else aborts the whole run without writing. There is no "add" operation and
no "delete" operation — an agent that invents a section has nowhere to put it, and an
id it makes up is rejected by name.

If the founder wants something the inventory cannot express, his agent is told to put
it in a separate `## Requests that need a developer` block. That is a code change.

## What is deliberately excluded

- Anything inside a `{false && (...)}` block. `app/page.tsx`'s nine virtual pages were
  extracted into real routes and `components/marketing/**` (see
  plans/002-production-readiness.md, P2A); the same five disabled homepage sections and
  the `AnimatedServiceCards` carousel now live in
  `components/marketing/DisabledHomeSections.tsx`, gated the same way at their call site
  in `app/(marketing)/page.tsx`. None of that copy is on the live site and none of it is
  in the tool. Re-enable a block in the code and wire its source back into
  `scripts/copy/extract-copy.mjs` to bring its copy back.
- The dev tuning overlay `#hc-card-tuning-panel` (inside the disabled `AnimatedServiceCards`,
  so already excluded above). The homepage's `#hiw-paw-tuning-panel` ("Tune Paws") was a
  production-shipping control, not a disabled block — it has been removed from the code
  entirely (R16), not just excluded from this tool.
- SVG contents, class names, URLs, and structural numbering (step "1", "02").

## When the code changes

Regenerate. If a section moves, update its line range in `copy-map.mjs` first — an
unmapped range still shows up in the tool, it just lands under a generic heading.

Keys are derived from page, section and the first words of the text, so editing copy
changes its key. That is fine: the tool file and the inventory are always regenerated
together, and `apply-copy.mjs` verifies the recorded text still matches before it writes.

## Older copy docs

`docs/COPY-TRACKING.md` and `docs/COPY-TRACKING-EXISTING-SITE.md` predate this system.
The first describes a `nottherug-boilerplate.html` that is no longer what ships; the
second is a March 2026 scrape of the old live site kept as a historical record. Neither
is wired to the source and neither should be used to drive a copy update.
