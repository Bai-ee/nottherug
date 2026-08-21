# Not The Rug — Founder Content Update: Implementation Spec

Source of truth for the founder content pass (July 2026). Orchestrated by Opus; each
phase is executed by a Sonnet subagent that reads this file and implements ONLY its phase.

## Decisions (locked)
- Neighborhoods → **collapse to Williamsburg-only** (remove the other 5, keep one WMSBG landing).
- Team → **6 people**: Luis, Lincoln, Marcus, Christian, Shawn, Yenny. Remove Joseph, Léa, Nina, Ivan.
- Sales tax → **append "+ sales tax" to every price** (rendered as a small muted line under the price).
- Weekday perks → **newer bullet set**.
- Boarding → **$100/night, $90/night at 7+ consecutive nights** (treat stray "$100/$110" as typo).
- NAPPS → remove from **Luis only**; leave org-level NAPPS in trust bar + cert strip.
- Cancellation → **48h → 24h** for individual walks (boarding stays 72h).

## Implementer rules (every phase)
1. Files touched: `app/page.tsx` (A–F) and `components/SiteNav.tsx` (F only). Do not touch other files.
2. Presentation/copy only. **Do not change JS logic, GSAP, or the `MeetGreetForm` component.**
3. Preserve all existing DOM `id`s and inline styles/classes. Any NEW container gets a stable kebab-case `id`.
4. Use exact-match edits. Keep surrounding markup/attributes identical; change only the specified text/structure.
5. Do the phase, run `npx tsc --noEmit` (or `npm run build` if available) to confirm no type errors, then STOP and report. Do not start the next phase.
6. Copy uses curly apostrophes/quotes already in the file (`&apos;` in JSX). Match the file's existing escaping style.

### Image assets (Phase 0)
Real team/founder photos live in `updated_images/` (raw, 2–6 MB). They must be resized/compressed and
moved into `public/` before Phase C wires them in. All 6 team members have a photo. See Phase 0.

### Tax-suffix convention (Phase A)
Under each price element add a small muted line. Two variants:
- Service cards (`.service-price`, `.svc-price`): immediately AFTER the price `<div>`, add
  `<div className="price-tax-note" style={{fontSize:'12px', color:'var(--mid-gray)', fontWeight:400, marginTop:'2px'}}>+ sales tax</div>`
- Big pricing cards (42px numbers): immediately AFTER the price `<div>` and BEFORE the description `<p>`, add
  `<div style={{fontSize:'13px', color:'var(--mid-gray)', marginBottom:'8px'}}>+ sales tax</div>`

---

## PHASE 0 — Image assets (run FIRST; no `app/page.tsx` edits)
Creates `public/img/team/*.jpg` (+ optional `public/img/*.jpg`) from `updated_images/`. Phase C depends on this.

**Source → output map** (verified by viewing each file):

| Source (`updated_images/`) | Output path | Used by |
|---|---|---|
| `luis_headshot.jpeg` (tight selfie) | `public/img/team/luis.jpg` | Luis team card |
| `lincoln.jpg` | `public/img/team/lincoln.jpg` | Lincoln team card |
| `marcus.jpeg` | `public/img/team/marcus.jpg` | Marcus team card |
| `christian.JPG` | `public/img/team/christian.jpg` | Christian team card |
| `shawn.jpeg` | `public/img/team/shawn.jpg` | Shawn team card |
| `yenny.jpg` | `public/img/team/yenny.jpg` | Yenny team card |
| `luis.PNG` (action, Domino Park, 2 doodles) | `public/img/team/luis-action.jpg` | About-page founder image |
| `IMG_9963.jpeg` (walker + 2 dogs, likely Yenny) | `public/img/team/yenny-action.jpg` | **Optional** lifestyle image |
| `VISIT REPORT.jpg` (real report UI) | `public/img/visit-report.jpg` | **Optional** HIW Sample Report |

**P0.1** Create the folder and process images (macOS `sips`; headshots ≤900px, action ≤1100px, JPEG q80):
```
mkdir -p public/img/team
# Headshots (max dimension 900, quality 80)
for pair in \
  "luis_headshot.jpeg:luis" "lincoln.jpg:lincoln" "marcus.jpeg:marcus" \
  "christian.JPG:christian" "shawn.jpeg:shawn" "yenny.jpg:yenny"; do
  src="updated_images/${pair%%:*}"; out="public/img/team/${pair##*:}.jpg"
  sips -s format jpeg -s formatOptions 80 -Z 900 "$src" --out "$out"
done
# Action / founder image (max dimension 1100)
sips -s format jpeg -s formatOptions 82 -Z 1100 "updated_images/luis.PNG" --out "public/img/team/luis-action.jpg"
# Optional extras
sips -s format jpeg -s formatOptions 82 -Z 1100 "updated_images/IMG_9963.jpeg" --out "public/img/team/yenny-action.jpg"
sips -s format jpeg -s formatOptions 85 -Z 1200 "updated_images/VISIT REPORT.jpg" --out "public/img/visit-report.jpg"
```

**P0.2** Add `updated_images/` to `.gitignore` (raw source stays local; only the optimized `public/img/**`
outputs get committed).

**Acceptance:** 6 team JPEGs + `luis-action.jpg` exist in `public/img/team/`, each **< ~300 KB**
(`ls -lh public/img/team`); `updated_images/` is gitignored.

**Note on framing:** these are phone photos with varied crops. Faces sit high in the portraits, so Phase C
uses `backgroundPosition:'center 25%'` as a starting point — verify each face is well-framed in the smoke
pass and nudge per-card if needed.

---

## PHASE A — Home + Services (copy, pricing, reorder, removals)
File: `app/page.tsx`

**A1. Home services intro paragraph** (section label "What We Offer").
Replace the intro `<p>` text with:
> From small group walks and solo adventures to puppy visits and boarding, every service is built around consistency, positive reinforcement, and a team your dog will be excited to see.

**A2. Reorder home services grid** (`.services-grid`) to: Small Group, Solo, **Puppy, Senior, Boarding**, Cat
(move the Boarding card from position 3 to position 5). Keep each card's markup/badges. Add the
`price-tax-note` line under every `.service-price` in this grid.

**A3. Reorder services-page grid** (`#services-grid`) identically (Boarding → position 5).
Add the tax-note line under every `.svc-price`.

**A4. REMOVE the monthly-packages section on the services page** — the entire
`<section className="section bg-texture" ...>` containing the "Save with Packages" / "Monthly walking plans"
`.package-banner` block. Delete the whole section.

**A5. Home "See All Packages & Rates" button** → label becomes **"See All Services & Rates"**.

**A6. Footer "Services" column** — remove the `<li>` "Monthly Plans" link.

**A7. Weekday-benefits section** (`#home-weekday-benefits-section`).
Replace the 4-item benefits array with:
```
'Early morning and evening visits',
'Weekend walks',
'Last-minute requests',
'Longer visits when timing, weather, and your dog allow',
```
Replace the closing `<p>` with:
> These services are reserved for families in our regular weekday walking program, helping us provide the consistent, dependable care we're known for.

**A8. Home pricing section** (`#home-pricing-section`). Add tax-note (big-card variant) under each price. Update copy:
- Regular Schedule desc → "For dogs booked 9 or more visits per month. Ideal for families who want a consistent routine and familiar faces each week."
- Flexible Schedule desc → "For dogs booked 8 visits or fewer per month. Perfect for occasional care when you need an extra hand."
- Boarding desc → keep: "Book 7 consecutive nights or more and receive $10 off each night, bringing your rate to $90 per night."
- Bottom line → "No contracts. No hidden fees. Just dependable neighborhood care from a team your dog knows and trusts."

**A9. Standard of Care grid** (`#standard-of-care-grid`). Rewrite all descriptions to the copy below,
ADD a 9th card "Temperature & Packages" inserted BEFORE "Direct Communication" (final order shown):
1. Professionally Trained Team → "Every team member is trained in dog body language, safety, and positive reinforcement. We make it look easy because experience, patience, and consistency matter."
2. GPS Tracking → "Follow your dog's adventure with GPS tracking and receive a personalized visit summary after every outing."
3. Photo & Visit Report → "Receive photos, potty updates, and notes about your dog's walk, mood, and adventure."
4. Safety-First Equipment → "Every dog is walked using our secure leash belt, collar, and harness system for added safety and peace of mind."
5. Healthy Treats → "Every visit includes a high-value, grain- and chicken-free treat, or your own treats if you prefer." (**allergy correction — was "grain-free chicken"**)
6. Clean Paws & Fresh Water → "We wipe paws with unscented wipes, refresh water bowls, and help keep your home clean."
7. Meals & Medication → "Need us to feed your dog or administer medication? We're happy to help at no additional charge."
8. **NEW** Temperature & Packages → "We'll bring in packages, check your home's temperature, and adjust blinds, shades, or the AC to help keep your pup comfortable." Icon:
   `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`
9. Direct Communication → "Need us? Reach your walker or the owner directly. No bots. No call centers. Just real people who know your dog."

**A10. Home "Simple Process" strip.**
- Heading → "From the first hello<br />to your dog's daily routine"
- Step 1 title → "Phone Consultation & Meet & Greet"; desc → "A free in-home consultation so you and your dog can meet your walker before the first walk."
- Steps 2–4 unchanged.

**Acceptance:** Boarding is 5th in both grids; every service/pricing price shows a "+ sales tax" line;
Standard of Care has 9 cards incl. Temperature & Packages; "grain- and chicken-free" present; packages
section gone; weekday bullets updated; tsc clean.

---

## PHASE B — How It Works page
File: `app/page.tsx` (`#page-how-it-works`)

**B1. Update process-step copy:**
- 01 Reach Out → "Fill out our simple intake form or give us a call. Tell us where you're located in Williamsburg and a little about your dog, including breed, age, weight, personality, quirks, or allergies. We respond within 2 hours on weekdays."
- 02 Free Meet & Greet → "We come to your home so your dog can meet their future walker in their own space, on their own terms. We'll review your routine, key handling notes, and answer any questions. No charge, no commitment."
- 03 Set Up Your Profile → "Add schedules, vet contacts and records, birthdays, emergency protocols, door codes, and behavioral notes. Your dog's profile travels with their walker on every visit."
- 04 First Walk → "Your assigned walker arrives within a 15/30-minute window, starts GPS tracking, and gives your dog a walk. You'll receive a photo report once they're home safe."
- 05 Ongoing & Recurring → "Same walker, same time, and a familiar routine built around your dog's preferences. Monthly invoicing, a simple 24-hour cancellation policy, and an open line to us whenever you need it." (**48h → 24h**)

**B2. REMOVE** the `.phase-callout` "Coming Soon — Phase 2 / Real-Time Walk App" block (the one inside the
sticky sidebar, after the report-card mock). Leave the Sample Walk Report card itself.

**B3. (Optional) Real visit-report image** — `public/img/visit-report.jpg` (from Phase 0) is a real report
UI screenshot (Pee/Poop/Clean Paws/Treats). The existing hand-built mock is higher-fidelity and on-brand, so
**default = keep the mock**. Only if the founder prefers a real screenshot, add it as a small framed inset
below the mock. Not a blocker — flag to founder rather than swapping unprompted.

**Acceptance:** No "Coming Soon — Phase 2" / "Real-Time Walk App" text remains on the page; step 5 says 24-hour; tsc clean.

---

## PHASE C — About + Team
File: `app/page.tsx` (`#page-about`)

**C1. Origin story** — replace the 3 body paragraphs (section "Founded 2011") with these 4:
1. "Not The Rug was founded in 2011 by Luis, a Williamsburg resident since 2006. Before dog walking, Luis spent years in broadcasting and music, including work as a Program Director at SiriusXM Radio and consulting for Red Bull on music strategy and cultural programming."
2. "In 2008, the pace of that world pushed him to step away. He took a job walking dogs on the Upper West Side, and the work changed everything. It started with two dogs, Suzy and Oliver, and daily walks rooted in patience, observation, and trust. What began as a reset became a calling."
3. "The name is a promise: your dog won't ruin your rug because they'll be properly walked, genuinely cared for, and returned home happy. It's also a nod to the neighborhood's sense of humor. We don't take ourselves too seriously, but we take your dog very seriously."
4. "We've never expanded beyond what we can do well. We don't dispatch strangers. Every walker on our team is trained, trusted, and familiar with the neighborhood. Most importantly, they know your dog by name."

**C2. Principles** (section "How We Work").
- Intro `<p>` → "Our walks are structured, consistent, and responsive. From pickup to drop-off, we give each dog a familiar rhythm while staying present to their pace, mood, leash cues, and body language. That repetition builds trust, helping dogs move with more ease and settle calmly when they return home."
- 01 Consistency Over Convenience → "We don't take on every client — not to be exclusive, but to protect the quality of care. We only accept new dogs when we can assign a consistent walker with the time and capacity to do the job well. Your dog deserves a familiar person, not a different face every week."
- 02 Small Groups, Real Attention → "Three dogs maximum per walk. Always. It's not a marketing line. It's how we keep walks safe, calm, and attentive. Your dog gets real exercise and engagement, not crowd management."
- 03 Neighborhood Expertise → "We know the Williamsburg details that only come from years of daily walks: which areas of the park flood after rain, which blocks to avoid, which routes help reactive dogs feel calmer, and where to find shade in summer heat. Fifteen years builds that kind of knowledge."
- 04 Real People, Always Reachable → "Luis's personal number is on the website, and you can text or call your walker directly. No support tickets. No call centers. Just real people who know your dog and respond when you need them."

**C3. Team roster** — rebuild the `.grid-3` team grid to exactly these 6 cards IN THIS ORDER, then the
existing "Join the team" card last. For each card: keep `team-card card-hover`, keep `team-info` /
`team-name` / `team-role` / `team-bio`. **Remove the `team-certifications` badge block from every card**
(all badges were CPR/First Aid or Luis's NAPPS — all removed).

Photo (requires Phase 0): replace each `<div className="team-photo img-placeholder img-ph-N" ...>` with a
real image on the same `team-photo` div — drop the `img-placeholder img-ph-N` classes and set a background:
```
<div className="team-photo" style={{height:'280px', backgroundImage:"url('/img/team/<file>.jpg')",
  backgroundSize:'cover', backgroundPosition:'center 25%'}} role="img" aria-label="<Name>, Not The Rug dog walker"></div>
```
Photo file per member (same order as the list below): `luis`, `lincoln`, `marcus`, `christian`, `shawn`, `yenny`.

1. **Luis** — role "Founder & Lead Walker" — "A former SiriusXM Program Director and Red Bull music strategist, Luis traded the broadcast world for Brooklyn sidewalks. He founded Not The Rug in 2011 after discovering dog walking on the Upper West Side. A Williamsburg resident since 2006, he knows the blocks, the parks, and most of the dogs by name."
2. **Lincoln** — role "Manager & Senior Walker" — "Originally from South Louisiana, with roots in DownEast Maine, Lincoln grew up surrounded by animals, including dogs, miniature donkeys, and even emus. If it had four legs or feathers, she likely helped care for it. Four years ago, Lincoln moved to Brooklyn with her three Southern pups, bringing her deep respect for animals with her. Her understanding of animal behavior, along with her steady and generous approach, makes her a trusted presence on the team. Now a Williamsburg local, Lincoln feels lucky to do this work every day."
3. **Marcus** — role "Senior Walker" — "Marcus has spent his life around animals, from growing up with pets to working as a dog trainer at Petco. He brings a thoughtful understanding of how dogs communicate, learn, and respond. A theater kid, video gamer, curious thinker, and devoted animal lover, Marcus sees every walk as a chance to build trust and connection. Say hello when you see him in the neighborhood — he's always happy to meet pups and their people."
4. **Christian** — role "Senior Walker" — "Christian spent more than six years working as a chef and kitchen manager, where he developed discipline, focus, and strong attention to detail. Over time, he realized he wanted work that felt more grounded and connected. With a lifelong love for animals, Christian chose a new path that brought more balance into his life. He brings patience, care, and a steady presence to every walk, treating each dog with the same respect he would give his own."
5. **Shawn** — role "Walker" — "Shawn brings care, precision, and a calm presence to every walk. An artist, musician, and visual creator, he approaches dog care with patience and intention. Before joining Not The Rug, Shawn spent two years with another service and came to us wanting a more thoughtful approach to the work. He has been a strong addition to the team, and we're glad to have him."
6. **Yenny** — role "Walker" — "Yenny is an experienced dog walker and a returning member of the Not The Rug team. Before joining us, she spent three years managing a doggy daycare in Long Island City, working with dogs of all personalities and energy levels. After stepping away to have her baby, Yenny is back with us and already reconnecting with the neighborhood pups. We're excited to have her back."

**C4. About founder image** (requires Phase 0) — the right-column image in the origin-story section (currently
`<div className="img-placeholder img-ph-2" ...>` with the `img-label` "Luis, founder · Williamsburg 2011").
Drop the placeholder classes and set the real action photo on that div:
`backgroundImage:"url('/img/team/luis-action.jpg')", backgroundSize:'cover', backgroundPosition:'center'`.
Keep the `img-label` overlay (update text to "Luis, founder · Williamsburg" if the year is dropped).

**Acceptance:** Exactly 6 team members + Join-the-team card; no Joseph/Léa/Nina/Ivan; no CPR/NAPPS badges
anywhere in the team grid; Luis has no cert badges; all 6 cards render real `/img/team/*.jpg` photos (no
gradient placeholders); About founder image shows `luis-action.jpg`; tsc clean.

---

## PHASE D — Safety & Trust + FAQ
File: `app/page.tsx` (`#page-safety`)

**D1. Double-Leash Safety Method** card `<p>` → "Every dog is walked with our secure collar-and-harness
system, supported by a leash belt for added protection. Two points of contact help keep your dog safe, and
every walker follows our no-phone-while-walking policy, completes hands-on safety training, and receives
regular gear checks."

**D2. REMOVE the "CPR & First Aid Certified" trust-card** entirely (the `.trust-card` whose `<h4>` is
"CPR &amp; First Aid Certified"). Grid now has 5 trust cards.

**D3. Cert strip** — REMOVE the "Pet CPR Certified" `.cert-item` and the "First Aid Certified" `.cert-item`.
Keep: NAPPS Member, Background Checked, Fully Insured, Bonded.

**D4. FAQ — Injury** → "We contact you immediately, provide basic first aid if needed, and take your dog to
your designated vet or the nearest emergency clinic. We document everything clearly and stay with your dog
until you can be there. Our insurance covers veterinary costs related to walker negligence."

**D5. FAQ — Cancellation** → "For individual walks, we ask for 24 hours' notice to avoid a charge. For
boarding, we ask for 72 hours' notice. We understand life happens and handle special circumstances with
flexibility." (**48h → 24h**)

**D6. FAQ — Paws** → "We clean paws after every walk to help remove dirt, debris, and anything harmful your
dog may have stepped in outside. It's a simple step that supports your dog's health and helps keep your home
clean."

**Acceptance:** No "CPR" or "First Aid" text remains on the safety page (card or cert strip); FAQ cancellation
reads 24 hours; tsc clean.

---

## PHASE E — Contact
File: `app/page.tsx` (`#page-contact`)

**E1. Response Hours** → main line "Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM" (keep the "Typically reply
within 2 hours on weekdays" sub-line).

**E2. Service Area** first `<p>` → "We're based in Williamsburg and serve North Williamsburg and much of
South Williamsburg. We do our best to cover as much of the neighborhood as possible, but some areas may
depend on staff availability." (Keep the address sub-`<p>` unchanged.)

**E3. Email** `<p>` → "For new client intake, less urgent inquiries, or detailed questions."

**Acceptance:** Hours = 9–7 / 10–4; service-area copy no longer lists Greenpoint/Bushwick/Bed-Stuy/Park
Slope/East WMSBG; tsc clean.

---

## PHASE F — Neighborhoods → collapse to Williamsburg-only
Files: `app/page.tsx` AND `components/SiteNav.tsx`

Goal: keep ONE honest Williamsburg landing; remove the other five everywhere. Do NOT delete the
`showNeighborhood`/`showPage` logic or the `'neighborhoods'` entry in the `pages` array — only trim data/links.

**F1. `hoodData`** — keep only the `williamsburg` entry; delete greenpoint, bushwick, bedstuy, park-slope,
east-williamsburg. (Removed `?hood=` values already fall through to `showPage('home')` — safe, verify.)

**F2. Nav dropdown (page.tsx)** — replace the `.nav-dropdown` block with a single link:
`<a href="#" onClick={(e) => { e.preventDefault(); (window as any).showNeighborhood('williamsburg'); }} data-page="neighborhoods">Williamsburg</a>`
Update the mobile-menu "Neighborhoods" link similarly to point at `showNeighborhood('williamsburg')` with label "Williamsburg".

**F3. Nav dropdown (`components/SiteNav.tsx`)** — replace the `.nav-dropdown` block with a single
`<Link href="/?hood=williamsburg" data-page="neighborhoods">Williamsburg</Link>`; update the mobile-menu
"Neighborhoods" `<Link>` to `href="/?hood=williamsburg"` label "Williamsburg".

**F4. Homepage neighborhood teaser** (section label "Service Areas", heading "We know every street…") —
replace the `.hood-cards-grid` (6 cards incl. "+ More Areas") with a SINGLE Williamsburg card
(`id="home-williamsburg-hood-card"`) that calls `showNeighborhood('williamsburg')`. Update the heading to
singular, e.g. "We know Williamsburg<br />street by street" and the sub-copy to "Fifteen years of daily walks
in one neighborhood. This is the block we know best."

**F5. Neighborhoods page grid** (`#page-neighborhoods`) — replace the 6-card `.grid-3` with a single
Williamsburg card (keep `id`, keep `showNeighborhood('williamsburg')`). Update the page-hero `<h1>`/`<p>` to
Williamsburg-only framing (e.g. h1 "Williamsburg is our<br />backyard"; p "We're a Williamsburg service
through and through — we know every park, shortcut, and puddle to avoid.").

**F6. Footer "Neighborhoods" column** — change `<h4>` to "Service Area" and replace the 6 `<li>` links with a
single Williamsburg `<li>` (calls `showNeighborhood('williamsburg')`).

**F7. Contact-form Neighborhood `<select>`** (in `#page-contact`) — reduce `<option>`s to just
"Williamsburg" and "Other".

**Acceptance:** No Greenpoint/Bushwick/Bed-Stuy/Park Slope/East Williamsburg strings anywhere in page.tsx or
SiteNav.tsx; nav shows a single "Williamsburg" link (no dropdown); Neighborhoods page + homepage teaser +
footer each reference Williamsburg only; `?hood=greenpoint` loads home without error; tsc clean.

---

## Orchestration
- **Phase 0 (image assets) runs FIRST** — it only writes `public/**` + `.gitignore`, no `app/page.tsx`
  contention, and Phase C depends on its outputs.
- Then run phases **sequentially A → B → C → D → E → F** (all share `app/page.tsx`; parallel edits would conflict).
- One Sonnet subagent per phase; it reads this file, implements only its phase, runs typecheck, reports diff summary.
- Opus verifies each phase (grep the acceptance checks; for Phase 0, `ls -lh public/img/team`) before dispatching the next.
- After F, run a full `npm run build` and a manual smoke pass (nav, each page, **team photos render + faces framed**, forms render).

## Out of scope this pass
- CSS cleanup of now-dead classes (`.package-*`, unused `.hood-*`) — defer.
- `/book` page "Website Roadmap" / "Phase 1 Roadmap" callouts — founder did not flag; leave.
- Reviews-page review count vs hero "79 reviews" mismatch — not in notes; leave.
