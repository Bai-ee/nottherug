# NOT THE RUG — OPUS 4.6 PLANNING BRIEF
## Instructions for Claude Opus 4.6 in Claude Code

---

## YOUR ROLE

You are the **strategic planner** on this project. Your job is to read, reason, and produce a precise implementation plan. You do **not** write code. You do **not** edit HTML. You do **not** implement anything.

Your only output is a single file: `NTR-IMPLEMENTATION-PLAN.md`

That file will be handed to Claude Sonnet 4.6, which will implement it. Sonnet is a fast, precise executor — it does not reason, it does not make judgment calls. Every instruction you write must be specific enough that Sonnet can execute it mechanically, without ambiguity, without needing to decide anything.

**If Sonnet has to guess, you have failed as the planner.**

---

## YOUR INPUTS

Before producing the plan, read all four of the following files in full. Do not skim. Every detail matters.

```
1. /mnt/user-data/outputs/nottherug-boilerplate.html        ← The new website (HTML/CSS/JS)
2. /mnt/user-data/uploads/COPY-TRACKING.md                  ← New site copy inventory
3. /mnt/user-data/outputs/COPY-TRACKING-EXISTING-SITE.md    ← Existing site copy inventory
4. /mnt/user-data/outputs/COPY-AUDIT-AND-STRATEGY.md        ← Gap analysis + strategy priorities
```

---

## PLANNING CONSTRAINTS

Before writing the plan, internalize these constraints. Every decision you make must respect them.

### Design & Structure
- The HTML file is a single-file SPA (no separate CSS/JS files). All changes happen in one file.
- The visual design, color palette, typography, and layout are **locked**. Sonnet does not redesign anything.
- Navigation structure and page routing (the `showPage()` JS system) are **locked** unless a phase explicitly requires a new page.
- Placeholder image blocks (`.img-placeholder`) stay as-is. No real images yet.

### Copy Strategy
- The **new site strategy takes priority** over old site copy. Do not regress to old site patterns.
- Old site copy should be adapted, not copied verbatim — preserve the voice and factual specifics, rewrite the structure.
- All fictional/placeholder content (fake names, fake phone numbers, fake reviews) must be replaced with real data from the existing site inventory.
- Where real data is unavailable (e.g. unverified weekend pricing, expanded hours), Sonnet inserts a clearly marked `[VERIFY WITH LUIS]` flag rather than guessing.

### Phasing Logic
- **Phase 1** = Critical fixes. Nothing that could embarrass or mislead a real client.
- **Phase 2** = Important copy upgrades. Meaningful gaps that affect trust and conversion.
- **Phase 3** = Polish and enrichment. Texture, personality, completeness.
- Phases must be **independently executable** — completing Phase 1 leaves a fully functional site. Phase 2 improves it. Phase 3 completes it.
- No phase should take Sonnet more than one focused Claude Code session to complete.

### Instruction Format for Sonnet
Every task Sonnet executes must be written in this format:

```
### TASK [Phase].[Number]: [Short title]
**File**: nottherug-boilerplate.html
**Location**: [Exact section — e.g. "FOOTER", "PAGE: CONTACT → contact-method phone block", "NAV → nav-logo-sub"]
**Find**: [The exact string or element to locate — quoted if text, described if structural]
**Action**: [REPLACE / ADD AFTER / ADD BEFORE / DELETE / UPDATE ATTRIBUTE]
**With**: [Exact replacement content — copy-ready, no placeholders unless flagged]
**Acceptance criteria**: [What Sonnet checks to confirm the task is done correctly]
```

Every piece of copy Sonnet will insert must be written out in full in the plan. Sonnet does not write copy. You write the copy. Sonnet pastes it in.

---

## WHAT THE PLAN MUST COVER

Work through the audit document (COPY-AUDIT-AND-STRATEGY.md) systematically. Use Section B (Gap Analysis) as your task list and Section C (Strategy Priorities) as your decision filter.

### Phase 1 — Critical Fixes (All items from Section B: 🔴 CRITICAL)

Must include tasks for:

1. **Contact info** — Replace all placeholder phone, email, address throughout the file. Pull real data from COPY-TRACKING-EXISTING-SITE.md. Flag hours discrepancy with `[VERIFY WITH LUIS]`.
2. **Sales tax disclosure** — Add appropriate disclosure to all pricing displays on the Services page and homepage service cards.
3. **Reviews** — Replace all 9 fictional placeholder reviews with the real reviews from the existing site (Jessica Y, Jayne A., Kassie T., Hayley M.) plus note that additional reviews should be pulled from Yelp/Google before launch. Write adapted versions of the real reviews in the new site's card format.
4. **"14 years" → "15 years"** — Audit every instance of year count across the file and standardize to "15+" or "Since 2011".
5. **Boarding weekend pricing** — Flag `[VERIFY WITH LUIS]` on the $110 weekend rate that appears on new site but not existing site.
6. **Walker names Reana and Nuria** — These names appear in real reviews. Write a note in the plan for the human (Bryan) to confirm their status with Luis before those reviews are used.

### Phase 2 — Important Copy Upgrades (All items from Section B: 🟠 IMPORTANT)

Must include tasks for:

7. **Full team — all 9 members** — The new site has 4 team cards. The existing site has 9 bios. Write adapted team card content (name, role, short bio, badges) for all 5 missing members: Lincoln, Nina, Christian, Shawn, Ivan. Use the bios from COPY-TRACKING-EXISTING-SITE.md as source material. Adapt them to the new site's card voice — punchy, warm, 2–3 sentences max.
8. **Luis's real bio** — The new site has a placeholder Luis bio. Write a proper bio using his real background: SiriusXM Program Director, Red Bull music strategy, left broadcasting 2008, Upper West Side dog walking origin, founded Not The Rug 2011 in Williamsburg where he has lived since 2006.
9. **Walk methodology copy** — The existing site homepage has a strong second paragraph about structured walks, reading dog signals, the walk-to-rest transition. This copy is missing from the new site. Identify the best location (How It Works page or About values section) and write an adapted version for insertion.
10. **Owner pull quote** — Write an adapted version of Luis's pull quote for insertion on the homepage (below services preview, above CTA band) and/or About page.
11. **Privacy / public figures copy** — Add back the "well suited for families and public figures who value privacy" line to the Solo Walk + Light Training service description on the Services page.
12. **Safety equipment specifics** — Expand the Double-Leash Safety card on the Safety & Trust page to include the specific equipment from the existing FAQ: front clip harnesses, martingale collars, Geartac security belts, trainer treat pouches, weekly gear checks, no-phone-while-walking policy, 4-week new hire training with owner.
13. **Paw cleaning explanation** — Add the "why" to paw cleaning wherever it appears. Source copy: dogs perspire through feet; outdoor debris (rat poison, fertilizer, construction materials) can be harmful.
14. **Approved medication language** — Add "approved medication" to service descriptions for Dog Walking, Senior Care, and Puppy Visits where feeding is mentioned.

### Phase 3 — Polish (All items from Section B: 🟡 NICE TO HAVE)

Must include tasks for:

15. **Léa's pronunciation** — Add "(pronounced lay-uh)" to Léa's team card.
16. **Suzy and Oliver** — Name the founder's dogs in the About page origin story paragraph.
17. **Cat visit missing details** — Add brushing, mail collection, and tidying space to cat visit description.
18. **Puppy visit discount** — Add "discount for 2nd and 3rd daily visit" to puppy visits description.
19. **Cross-street reference** — Add "b/t Havemeyer St & Meeker Ave" to address on Contact page and footer.
20. **Newsletter capture** — Add a simple email input + subscribe CTA to the footer, consistent with the existing site's "Stay In Touch" section.

---

## ADDITIONAL PLANNING REQUIREMENTS

### HTML Location Map
Before writing tasks, produce a **location map** at the top of the plan — a quick reference index of the key sections in the HTML file that Sonnet will be targeting. This helps Sonnet navigate the 2,500+ line file without searching. Format:

```
## HTML LOCATION MAP
- Navigation bar: ~line [X]
- Footer: ~line [X]
- PAGE: HOME — Hero: ~line [X]
- PAGE: HOME — Services preview: ~line [X]
- PAGE: HOME — Reviews: ~line [X]
- PAGE: HOME — CTA band: ~line [X]
- PAGE: SERVICES — Pricing cards: ~line [X]
- PAGE: SERVICES — Package banner: ~line [X]
- PAGE: HOW IT WORKS — Process steps: ~line [X]
- PAGE: ABOUT — Origin story: ~line [X]
- PAGE: ABOUT — Team section: ~line [X]
- PAGE: SAFETY — Trust cards: ~line [X]
- PAGE: SAFETY — FAQ accordion: ~line [X]
- PAGE: REVIEWS — Review cards: ~line [X]
- PAGE: BOOK — Forms: ~line [X]
- PAGE: CONTACT — Contact methods: ~line [X]
```

Populate actual line numbers by scanning the HTML file. Sonnet will use this map to jump directly to the right location for each task.

### Pre-Flight Checks
At the top of the plan, before any tasks, write a **pre-flight checklist** Sonnet runs before starting Phase 1:

```
## PRE-FLIGHT CHECKLIST
- [ ] Confirm nottherug-boilerplate.html is open and writable
- [ ] Confirm all 3 copy docs are readable in context
- [ ] Confirm no other edits are in progress on the HTML file
- [ ] Note current line count of HTML file for reference
```

### Post-Phase Checks
At the end of each phase block, write a **phase completion check** Sonnet runs before moving to the next phase:

```
## PHASE [N] COMPLETION CHECK
- [ ] All [N] tasks in this phase executed
- [ ] No [VERIFY WITH LUIS] flags left unresolved (note any that remain for human review)
- [ ] HTML file still valid — confirm showPage() navigation works across all pages
- [ ] Search file for any remaining placeholder text: "(555)", "hello@nottherug", "[DATE]"
- [ ] Confirm line count has changed as expected
```

### Human Handoff Notes
At the very end of the plan, write a **HUMAN HANDOFF** section addressed to Bryan. This is not for Sonnet — it's a list of things that require human action before the site goes live:

- Items flagged `[VERIFY WITH LUIS]` that need confirmation
- The Reana/Nuria walker situation
- The need to collect real reviews from Yelp/Google (minimum 8)
- Photography — what shots are needed to replace placeholder image blocks
- Time To Pet integration (Phase 2 of the product roadmap)
- Any other judgment calls that Opus identified during planning that require client input

---

## OUTPUT REQUIREMENTS

Your output is **one file only**: `NTR-IMPLEMENTATION-PLAN.md`

Save it to: `/mnt/user-data/outputs/NTR-IMPLEMENTATION-PLAN.md`

The file must be:
- Fully self-contained — Sonnet needs no other context beyond this file and the HTML
- Written in unambiguous imperative language — every task starts with an action verb
- Structured with clear phase headers, task numbering, and the task format specified above
- Complete — every task from Section B of the audit doc is accounted for
- Honest about uncertainty — use `[VERIFY WITH LUIS]` rather than guessing

Do not summarize. Do not explain your reasoning in the output file. The plan is instructions, not a report. Bryan can read the audit doc for reasoning. Sonnet needs actions.

---

## BEFORE YOU BEGIN

Do not start writing the plan until you have read all four input files completely.

When you are ready to begin, confirm with a single line:

> "All four files read. Beginning plan generation."

Then produce the plan without interruption.

---

## SESSION BOUNDARIES

This session ends when `NTR-IMPLEMENTATION-PLAN.md` is saved to outputs. Do not proceed to implementation. Do not edit the HTML. Do not ask Bryan if he wants you to start implementing. Your job is done when the plan file exists.

The next session will be a separate Claude Code session running Sonnet 4.6. It will receive only `NTR-IMPLEMENTATION-PLAN.md` and `nottherug-boilerplate.html` as context.
