# NTR — IMPLEMENTATION PLAN
## For execution by Claude Sonnet 4.6 in Claude Code

---

## PRE-FLIGHT CHECKLIST

- [ ] Confirm nottherug-boilerplate.html is open and writable
- [ ] Confirm all 3 copy docs are readable in context
- [ ] Confirm no other edits are in progress on the HTML file
- [ ] Note current line count of HTML file for reference (expected: ~2924 lines)

---

## HTML LOCATION MAP

Use this index to jump to the right section for each task.

- Navigation bar: ~line 1087
- Mobile menu: ~line 1118
- Footer: ~line 2493
- Footer bottom (copyright/address): ~line 2545
- PAGE: HOME — Hero: ~line 1135
- PAGE: HOME — Hero stats: ~line 1148
- PAGE: HOME — Social proof strip: ~line 1177
- PAGE: HOME — Trust bar: ~line 1201
- PAGE: HOME — Services preview cards: ~line 1230
- PAGE: HOME — How It Works strip: ~line 1286
- PAGE: HOME — Featured reviews: ~line 1321
- PAGE: HOME — Neighborhood teaser: ~line 1373
- PAGE: HOME — CTA band: ~line 1413
- PAGE: SERVICES — Hero: ~line 1436
- PAGE: SERVICES — Pricing cards: ~line 1444
- PAGE: SERVICES — Specialty services: ~line 1504
- PAGE: SERVICES — Package banner: ~line 1537
- PAGE: SERVICES — Always included: ~line 1573
- PAGE: HOW IT WORKS — Process steps: ~line 1610
- PAGE: ABOUT — Hero: ~line 1727
- PAGE: ABOUT — Origin story: ~line 1736
- PAGE: ABOUT — Values section: ~line 1769
- PAGE: ABOUT — Team section: ~line 1801
- PAGE: SAFETY — Hero: ~line 1873
- PAGE: SAFETY — Trust cards: ~line 1882
- PAGE: SAFETY — Certifications: ~line 1929
- PAGE: SAFETY — FAQ accordion: ~line 1961
- PAGE: NEIGHBORHOODS: ~line 1994
- PAGE: REVIEWS — Hero stats: ~line 2048
- PAGE: REVIEWS — Review cards: ~line 2074
- PAGE: REVIEWS — Leave a Review box: ~line 2160
- PAGE: BOOK — Forms: ~line 2177
- PAGE: CONTACT — Contact methods: ~line 2391
- PAGE: CONTACT — Contact form: ~line 2447

---

## PHASE 1 — CRITICAL FIXES

---

### TASK 1.1: Replace placeholder phone number on Contact page
**File**: nottherug-boilerplate.html
**Location**: PAGE: CONTACT → contact-method phone block (~line 2410)
**Find**: `<a href="tel:+15555555555" style="display:block; margin-top:10px">(555) 555-5555</a>`
**Action**: REPLACE
**With**: `<a href="tel:+13476109676" style="display:block; margin-top:10px">(347) 610-9676</a>`
**Acceptance criteria**: The phone link displays "(347) 610-9676" and the href dials +13476109676.

---

### TASK 1.2: Replace placeholder email on Contact page
**File**: nottherug-boilerplate.html
**Location**: PAGE: CONTACT → contact-method email block (~line 2418)
**Find**: `<a href="mailto:hello@nottherug.com" style="display:block; margin-top:10px">hello@nottherug.com</a>`
**Action**: REPLACE
**With**: `<a href="mailto:luis@nottherug.com" style="display:block; margin-top:10px">luis@nottherug.com</a>`
**Acceptance criteria**: Email link displays "luis@nottherug.com" and the href opens a mailto to luis@nottherug.com.

---

### TASK 1.3: Update incomplete address on Contact page
**File**: nottherug-boilerplate.html
**Location**: PAGE: CONTACT → contact-method address block (~line 2426)
**Find**: `<p style="margin-top:8px; font-size:13px; color:var(--mid-gray)">281 N 7th St, Brooklyn, NY</p>`
**Action**: REPLACE
**With**: `<p style="margin-top:8px; font-size:13px; color:var(--mid-gray)">281 N 7th St, Ste 13, Brooklyn, NY 11211</p>`
**Acceptance criteria**: Address shows full suite number and zip code.

---

### TASK 1.4: Flag unverified expanded hours on Contact page
**File**: nottherug-boilerplate.html
**Location**: PAGE: CONTACT → contact-method hours block (~line 2433)
**Find**: `<p>Mon–Fri, 8 AM–7 PM · Sat–Sun, 9 AM–5 PM</p>`
**Action**: REPLACE
**With**: `<p>Mon–Fri, 8 AM–7 PM · Sat–Sun, 9 AM–5 PM <!-- [VERIFY WITH LUIS] Existing site shows Mon-Fri 10am-6pm only. Confirm these expanded hours are correct before launch. --></p>`
**Acceptance criteria**: Hours display unchanged to visitors, but HTML contains a verification comment.

---

### TASK 1.5: Update footer copyright year and address
**File**: nottherug-boilerplate.html
**Location**: FOOTER → footer-bottom (~line 2546)
**Find**: `<div class="footer-copy">© 2025 Not The Rug · 281 N 7th St, Brooklyn, NY · All rights reserved</div>`
**Action**: REPLACE
**With**: `<div class="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · All rights reserved</div>`
**Acceptance criteria**: Footer shows © 2026, full address with suite and zip.

---

### TASK 1.6: Update form phone placeholder
**File**: nottherug-boilerplate.html
**Location**: PAGE: BOOK → Meet & Greet form phone input (~line 2207)
**Find**: `<input type="tel" class="form-control" placeholder="(555) 000-0000">`
**Action**: REPLACE
**With**: `<input type="tel" class="form-control" placeholder="(347) 000-0000">`
**Acceptance criteria**: Phone placeholder shows area code 347 instead of 555.

---

### TASK 1.7: Add sales tax disclosure to Services page — Group Walk pricing card
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Pricing card 1 (Group Walk) → price-per line (~line 1458)
**Find**: `<div class="price-per">per walk (9+ walks/month) · $35 for fewer</div>`
**Action**: REPLACE
**With**: `<div class="price-per">per walk (9+ walks/month) · $35 for fewer · +tax</div>`
**Acceptance criteria**: Group Walk price note includes "+tax".

---

### TASK 1.8: Add sales tax disclosure to Services page — Walk + Training pricing card
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Pricing card 2 (Walk + Training) → price-per line (~line 1475)
**Find**: `<div class="price-per">per 60-minute solo session</div>`
**Action**: REPLACE
**With**: `<div class="price-per">per 60-minute solo session · +tax</div>`
**Acceptance criteria**: Walk + Training price note includes "+tax".

---

### TASK 1.9: Add sales tax disclosure to Services page — Boarding pricing card
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Pricing card 3 (Boarding) → price-per line (~line 1491)
**Find**: `<div class="price-per">per night · $110 weekends · 7+ days discounted</div>`
**Action**: REPLACE
**With**: `<div class="price-per">per night · $110 weekends · 7+ days discounted · +tax <!-- [VERIFY WITH LUIS] $110 weekend rate not on existing site. Confirm this is correct. --></div>`
**Acceptance criteria**: Boarding price note includes "+tax" and has a verification comment about the $110 weekend rate.

---

### TASK 1.10: Add sales tax footnote below Services page pricing grid
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → after the closing `</div>` of the grid-3 pricing container (~line 1502, after `</div>`)
**Find**: The `</div>` that closes the grid-3 containing the 3 pricing cards, immediately before the `<!-- Specialty services -->` comment.

Locate this exact sequence:
```
        </div>
      </div>

      <!-- Specialty services -->
```
**Action**: ADD AFTER the first `</div>` in that sequence (the one that closes the grid-3)
**With**:
```html
        <p style="text-align:center; font-size:13px; color:var(--mid-gray); margin-top:16px; font-style:italic">All prices subject to applicable NYC sales tax.</p>
```
**Acceptance criteria**: A centered italic footnote about sales tax appears below the 3 pricing cards and above the specialty services heading.

---

### TASK 1.11: Add sales tax note to Services page — Specialty service cards
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Specialty services section, after the grid-4 closing tag (~line 1533)
**Find**: The closing `</div>` of the grid-4 that contains the 4 specialty service cards, directly before `</div>` and `</section>`.

Locate this line:
```
      </div>
    </div>
  </section>
```
(The first `</div>` here closes the grid-4.)
**Action**: ADD AFTER the grid-4 closing `</div>`
**With**:
```html
        <p style="text-align:center; font-size:13px; color:var(--mid-gray); margin-top:16px; font-style:italic">All specialty service prices subject to applicable NYC sales tax.</p>
```
**Acceptance criteria**: A sales tax footnote appears below the specialty service cards.

---

### TASK 1.12: Replace all 3 homepage featured reviews with real reviews
**File**: nottherug-boilerplate.html
**Location**: PAGE: HOME → Featured reviews section → grid-3 container (~lines 1332–1369)
**Find**: The entire `<div class="grid-3">` block inside the Featured reviews section, containing all 3 review cards (Sarah K., Priya M., Jamie L.).
**Action**: REPLACE the full `<div class="grid-3">` block (from `<div class="grid-3">` through its closing `</div>`) with the following:
**With**:
```html
      <div class="grid-3">
        <div class="review-card card-hover">
          <div class="review-mark">"</div>
          <div class="stars">★★★★★</div>
          <p class="review-text">Luis and team are truly the best of the best. It's not easy to trust just anyone with our fur baby, but Luis's professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.</p>
          <div class="review-author">
            <div class="review-avatar"><div class="review-avatar-ph">JY</div></div>
            <div>
              <div class="review-name">Jessica Y.</div>
              <div class="review-meta">Williamsburg · Yelp</div>
            </div>
          </div>
        </div>
        <div class="review-card card-hover">
          <div class="review-mark">"</div>
          <div class="stars">★★★★★</div>
          <p class="review-text">We've been with Not The Rug for over two years and couldn't be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.</p>
          <div class="review-author">
            <div class="review-avatar"><div class="review-avatar-ph">JA</div></div>
            <div>
              <div class="review-name">Jayne A.</div>
              <div class="review-meta">Williamsburg · Yelp</div>
            </div>
          </div>
        </div>
        <div class="review-card card-hover">
          <div class="review-mark">"</div>
          <div class="stars">★★★★★</div>
          <p class="review-text">Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own — flexible with schedule changes and always reliable. Your dogs will be in great hands!</p>
          <div class="review-author">
            <div class="review-avatar"><div class="review-avatar-ph">KT</div></div>
            <div>
              <div class="review-name">Kassie T.</div>
              <div class="review-meta">Williamsburg · Yelp</div>
            </div>
          </div>
        </div>
      </div>
```
**Acceptance criteria**: Homepage shows 3 real review cards: Jessica Y., Jayne A., Kassie T. All review text is real adapted client copy. Avatar initials match names.

---

### TASK 1.13: Replace all 9 reviews on Reviews page with 4 real reviews
**File**: nottherug-boilerplate.html
**Location**: PAGE: REVIEWS → reviews-masonry container (~lines 2076–2158)
**Find**: The entire `<div class="reviews-masonry">` block containing all 9 review cards.
**Action**: REPLACE the full `<div class="reviews-masonry">` block (from `<div class="reviews-masonry">` through its closing `</div>`) with the following:
**With**:
```html
      <div class="reviews-masonry">
        <!-- REAL REVIEW: Jessica Y. (from existing site Yelp) -->
        <div class="review-card card-hover">
          <div class="review-mark">"</div>
          <div class="stars">★★★★★</div>
          <p class="review-text">Luis and team are truly the best of the best. It's not easy to trust just anyone with our beloved fur baby, but Luis's professionalism and kindness combined with the GPS tracking he provides puts even the most nervous pet parent (me!!!) at ease.</p>
          <div class="review-author">
            <div class="review-avatar"><div class="review-avatar-ph">JY</div></div>
            <div><div class="review-name">Jessica Y.</div><div class="review-meta">Williamsburg · Yelp</div></div>
          </div>
        </div>
        <!-- REAL REVIEW: Jayne A. (from existing site Yelp) -->
        <div class="review-card card-hover">
          <div class="review-mark">"</div>
          <div class="stars">★★★★★</div>
          <p class="review-text">Luis is the guy you want your fur babies to be taken care of by. We have used him for over two years now and couldn't even begin to tell you how grateful we are to have him! He has saved us so many times with our busy work schedules. From their normal walk, we get text updates and pics every day. He's even helped us with the rehab of one of our dogs recovering from surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug. They won't disappoint.</p>
          <div class="review-author">
            <div class="review-avatar"><div class="review-avatar-ph">JA</div></div>
            <div><div class="review-name">Jayne A.</div><div class="review-meta">Williamsburg · Yelp</div></div>
          </div>
        </div>
        <!-- REAL REVIEW: Kassie T. (from existing site Yelp) — NOTE: references walker "Reana" — confirm with Luis if Reana is still active -->
        <div class="review-card card-hover">
          <div class="review-mark">"</div>
          <div class="stars">★★★★★</div>
          <p class="review-text">Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own. He is also flexible and accommodating with schedule changes. Your dogs will be in great hands!</p>
          <div class="review-author">
            <div class="review-avatar"><div class="review-avatar-ph">KT</div></div>
            <div><div class="review-name">Kassie T.</div><div class="review-meta">Williamsburg · Yelp</div></div>
          </div>
        </div>
        <!-- REAL REVIEW: Hayley M. (from existing site) — NOTE: references walker "Nuria" — confirm with Luis if Nuria is still active -->
        <div class="review-card card-hover">
          <div class="review-mark">"</div>
          <div class="stars">★★★★★</div>
          <p class="review-text">They were so awesome with my dog and super patient with me. Daily updates on how the walk went, cute photos, and the price is really nice for a longer walk duration. My dog LOVES Nuria!</p>
          <div class="review-author">
            <div class="review-avatar"><div class="review-avatar-ph">HM</div></div>
            <div><div class="review-name">Hayley M.</div><div class="review-meta">Williamsburg · Yelp</div></div>
          </div>
        </div>
        <!-- [BRYAN: Collect 5+ additional real reviews from Yelp and Google before launch to fill this section. Target minimum 8 total reviews on this page.] -->
      </div>
```
**Acceptance criteria**: Reviews page shows exactly 4 real review cards. All fictional reviews are removed. HTML comment flags that more reviews are needed. Avatar initials match real client names.

---

### TASK 1.14: Replace social proof scrolling strip with real review excerpts
**File**: nottherug-boilerplate.html
**Location**: PAGE: HOME → social-proof-strip → proof-track (~lines 1178–1197)
**Find**: The entire `<div class="proof-track" id="proof-track">` block, from its opening tag through its closing `</div>`.
**Action**: REPLACE
**With**:
```html
    <div class="proof-track" id="proof-track">
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Luis's professionalism puts even the most nervous pet parent at ease"</span><span class="proof-author">— Jessica Y., Williamsburg</span></div>
      <div class="proof-sep"></div>
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Seriously — hire Not The Rug. They won't disappoint."</span><span class="proof-author">— Jayne A., Williamsburg</span></div>
      <div class="proof-sep"></div>
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Trust Luis to take care of your dog as if it was his own"</span><span class="proof-author">— Kassie T., Williamsburg</span></div>
      <div class="proof-sep"></div>
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Daily updates, cute photos, and my dog LOVES her walker"</span><span class="proof-author">— Hayley M., Williamsburg</span></div>
      <div class="proof-sep"></div>
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Luis's professionalism puts even the most nervous pet parent at ease"</span><span class="proof-author">— Jessica Y., Williamsburg</span></div>
      <div class="proof-sep"></div>
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Seriously — hire Not The Rug. They won't disappoint."</span><span class="proof-author">— Jayne A., Williamsburg</span></div>
      <div class="proof-sep"></div>
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Trust Luis to take care of your dog as if it was his own"</span><span class="proof-author">— Kassie T., Williamsburg</span></div>
      <div class="proof-sep"></div>
      <div class="proof-item"><div class="stars">★★★★★</div><span class="proof-quote">"Daily updates, cute photos, and my dog LOVES her walker"</span><span class="proof-author">— Hayley M., Williamsburg</span></div>
      <div class="proof-sep"></div>
    </div>
```
**Acceptance criteria**: Scrolling strip shows 4 real review excerpts, duplicated once for scroll animation continuity. All fictional names removed. Strip scrolls smoothly.

---

### TASK 1.15: Update hero stat "14+" to "15+"
**File**: nottherug-boilerplate.html
**Location**: PAGE: HOME → Hero stats (~line 1150)
**Find**: `<div class="hero-stat-num">14+</div>`
**Action**: REPLACE
**With**: `<div class="hero-stat-num">15+</div>`
**Acceptance criteria**: Hero stat displays "15+".

---

### TASK 1.16: Update neighborhood teaser "14 years" references
**File**: nottherug-boilerplate.html
**Location**: PAGE: HOME → Neighborhood teaser section body text (~line 1379)
**Find**: `14 years of walks means 14 years of neighborhood knowledge. Find your area below.`
**Action**: REPLACE
**With**: `15 years of walks means 15 years of neighborhood knowledge. Find your area below.`
**Acceptance criteria**: Both instances of "14 years" in this sentence now read "15 years".

---

### TASK 1.17: Update About page hero "14 years"
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Hero heading (~line 1731)
**Find**: `<h1>14 years of walks,<br>one neighborhood</h1>`
**Action**: REPLACE
**With**: `<h1>15 years of walks,<br>one neighborhood</h1>`
**Acceptance criteria**: About page hero heading reads "15 years of walks". (Note: "one neighborhood" may need revision given the 6-neighborhood expansion — flagged in handoff.)

---

### TASK 1.18: Update About values section "14 years"
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Values section → Neighborhood Expertise value (~line 1790)
**Find**: `14 years builds that kind of knowledge.`
**Action**: REPLACE
**With**: `15 years builds that kind of knowledge.`
**Acceptance criteria**: Value description references "15 years".

---

### TASK 1.19: Update Reviews page hero "14" years stat
**File**: nottherug-boilerplate.html
**Location**: PAGE: REVIEWS → Hero stats → third stat (~line 2067)
**Find**: `<div style="font-family:var(--font-display); font-size:52px; color:white; line-height:1">14</div>`
**Action**: REPLACE
**With**: `<div style="font-family:var(--font-display); font-size:52px; color:white; line-height:1">15</div>`
**Acceptance criteria**: Reviews hero stat shows "15" instead of "14".

---

### TASK 1.20: Flag boarding weekend pricing for verification
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Pricing card 3 (Boarding) — already modified in Task 1.9
**Find**: Confirm that the `[VERIFY WITH LUIS]` comment from Task 1.9 is present in the Boarding price-per line regarding the $110 weekend rate.
**Action**: No additional edit needed if Task 1.9 was completed. This task is a verification step.
**Acceptance criteria**: The boarding pricing card contains an HTML comment flagging the $110 weekend rate for verification with Luis.

---

### TASK 1.21: Add Reana/Nuria verification note
**File**: nottherug-boilerplate.html
**Location**: PAGE: REVIEWS → reviews-masonry, inside the Kassie T. and Hayley M. review cards (already added in Task 1.13)
**Find**: Confirm that the HTML comments noting Reana and Nuria from Task 1.13 are present.
**Action**: No additional edit needed if Task 1.13 was completed. This task is a verification step.
**Acceptance criteria**: HTML comments in the reviews section flag both walker names for confirmation with Luis.

---

## PHASE 1 COMPLETION CHECK

- [ ] All 21 tasks in this phase executed
- [ ] [VERIFY WITH LUIS] flags present for: expanded hours (Task 1.4), $110 weekend boarding rate (Task 1.9), walker Reana (Task 1.13), walker Nuria (Task 1.13)
- [ ] HTML file still valid — confirm showPage() navigation works across all pages
- [ ] Search file for remaining placeholder text: "(555)" should return only the Book form placeholder "(347) 000-0000"
- [ ] Search file for "hello@nottherug" — should return 0 results
- [ ] Search file for "Sarah K." — should return 0 results on homepage and reviews page (all fictional names removed)
- [ ] All instances of "14 years" / "14+" updated to "15 years" / "15+"
- [ ] All price-per lines on Services page include "+tax"
- [ ] 4 real reviews on Reviews page, 3 real reviews on homepage, 4 real excerpts in social proof strip

---

## PHASE 2 — IMPORTANT COPY UPGRADES

---

### TASK 2.1: Add 5 missing team members to About page
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Team section → grid-3 container (~line 1809). Insert the 5 new team cards AFTER Léa's card (the 4th team-card, closing around ~line 1857) and BEFORE the "Join the team" card (which starts with `<div class="team-card" style="border: 2px dashed`).
**Find**: The closing `</div>` of Léa's team-card block, followed by the opening of the "Join the team" card.

Locate this transition:
```
        </div>
        <div class="team-card" style="border: 2px dashed var(--sage-light); background:var(--cream); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; text-align:center;">
```
**Action**: ADD BEFORE the "Join the team" card
**With**:
```html
        <div class="team-card card-hover">
          <div class="team-photo img-placeholder img-ph-4" style="height:280px"></div>
          <div class="team-info">
            <div class="team-name">Lincoln</div>
            <div class="team-role">Walker</div>
            <p class="team-bio">Originally from South Louisiana where she grew up caring for everything from dogs to miniature donkeys to emus, Lincoln moved to Brooklyn three years ago with her three Southern pups. Her deep respect for animals and steady, generous approach make her a trusted presence on every walk.</p>
            <div class="team-certifications">
              <span class="badge badge-sage">CPR/First Aid</span>
            </div>
          </div>
        </div>
        <div class="team-card card-hover">
          <div class="team-photo img-placeholder img-ph-1" style="height:280px"></div>
          <div class="team-info">
            <div class="team-name">Nina</div>
            <div class="team-role">Senior Walker · Longest-Serving</div>
            <p class="team-bio">Auntie Nina has been around dogs since infancy and treats every one like family. Born and raised in New Jersey, she's one of Not The Rug's longest-serving team members with deep relationships across clients and pups alike. Probably holding an iced latte — any season.</p>
            <div class="team-certifications">
              <span class="badge badge-sage">CPR/First Aid</span>
              <span class="badge badge-gold">5+ Year Veteran</span>
            </div>
          </div>
        </div>
        <div class="team-card card-hover">
          <div class="team-photo img-placeholder img-ph-3" style="height:280px"></div>
          <div class="team-info">
            <div class="team-name">Christian</div>
            <div class="team-role">Walker</div>
            <p class="team-bio">After six years as a chef and kitchen manager, Christian traded the kitchen for the neighborhood — bringing the same discipline, focus, and attention to detail to every walk. Patient, steady, and deeply caring with every dog in his charge.</p>
            <div class="team-certifications">
              <span class="badge badge-sage">CPR/First Aid</span>
            </div>
          </div>
        </div>
        <div class="team-card card-hover">
          <div class="team-photo img-placeholder img-ph-5" style="height:280px"></div>
          <div class="team-info">
            <div class="team-name">Shawn</div>
            <div class="team-role">Walker</div>
            <p class="team-bio">Artist, musician, and visual creator, Shawn brings a calm, grounded presence to every walk. After two years with another service, he joined Not The Rug for its more intentional approach to care — and it shows.</p>
            <div class="team-certifications">
              <span class="badge badge-sage">CPR/First Aid</span>
            </div>
          </div>
        </div>
        <div class="team-card card-hover">
          <div class="team-photo img-placeholder img-ph-2" style="height:280px"></div>
          <div class="team-info">
            <div class="team-name">Ivan</div>
            <div class="team-role">Walker</div>
            <p class="team-bio">The definition of an animal lover — Ivan's home crew includes Lucy the dachshund, Casper the parrot, cats, and a 50-gallon fish tank. A recent Brooklyn College graduate with over three years of professional experience, he brings genuine enthusiasm to every walk.</p>
            <div class="team-certifications">
              <span class="badge badge-sage">CPR/First Aid</span>
            </div>
          </div>
        </div>
```
**Acceptance criteria**: Team section now displays 9 individual team cards (Luis, Joseph, Marcus, Léa, Lincoln, Nina, Christian, Shawn, Ivan) followed by the "Join the team" card. All 10 items render correctly in the grid-3 layout. Each new card has a placeholder image, name, role, bio (2-3 sentences), and at least one badge.

---

### TASK 2.2: Replace Luis's placeholder bio with real background — team card
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Team section → Luis's team card bio (~line 1815)
**Find**: `<p class="team-bio">Williamsburg native since 2003. Started Not The Rug with two dogs and a passion for the neighborhood. When not walking dogs, he's still somewhere in Williamsburg.</p>`
**Action**: REPLACE
**With**: `<p class="team-bio">Former SiriusXM Program Director and Red Bull music strategist who traded the broadcast world for Brooklyn sidewalks. Founded Not The Rug in 2011 after discovering dog walking on the Upper West Side. Williamsburg resident since 2006 — he knows every block, every park, and most of the dogs by name.</p>`
**Acceptance criteria**: Luis's team card bio reflects his real professional background (SiriusXM, Red Bull, Upper West Side origin, Williamsburg since 2006).

---

### TASK 2.3: Rewrite About page origin story paragraph 1 with Luis's real background
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Origin story section → first paragraph (~line 1744)
**Find**: `<p style="color:var(--mid-gray); font-size:16px; line-height:1.8; margin-bottom:20px">Not The Rug was founded in 2011 by Luis, a longtime Williamsburg resident who started walking dogs for neighbors while building a career in music and event coordination. What began as a favor for a few friends on N 7th Street became Brooklyn's most trusted neighborhood dog walking service.</p>`
**Action**: REPLACE
**With**: `<p style="color:var(--mid-gray); font-size:16px; line-height:1.8; margin-bottom:20px">Not The Rug was founded in 2011 by Luis, a Williamsburg resident since 2006. Before that, Luis spent years in broadcasting and music — working as a Program Director at SiriusXM Radio and consulting for Red Bull on music strategy and cultural programming. In 2008, the pace of that world pushed him to step away. He took a job walking dogs on the Upper West Side, and the work changed everything. What began as a reset became a calling, and what started as a favor for a few friends on N 7th Street became Brooklyn's most trusted neighborhood dog walking service.</p>`
**Acceptance criteria**: Origin story paragraph 1 now includes SiriusXM, Red Bull, 2008 career change, Upper West Side origin, and Williamsburg since 2006.

---

### TASK 2.4: Add walk methodology copy to About page values section
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Values section → between the heading block and the values-grid (~line 1775, between `</h2>` closing and `</div>` closing of the header div, before `<div class="values-grid">`)
**Find**: The heading block ends with:
```
        <h2>The principles behind every walk</h2>
      </div>
      <div class="values-grid">
```
**Action**: ADD AFTER the `</div>` that closes the heading block and BEFORE `<div class="values-grid">`
**With**:
```html
      <p style="text-align:center; color:var(--mid-gray); max-width:620px; margin:0 auto 48px; font-size:16px; line-height:1.8">Our walks are structured and consistent, giving dogs a familiar rhythm from pickup to drop-off. Our walkers stay present, adjust pace as needed, and respond in real time to what each dog is communicating — on the leash and in their body. Repetition builds trust. Dogs move with more ease, and the transition from walk to rest becomes natural rather than chaotic.</p>
```
**Acceptance criteria**: A centered body paragraph about walk methodology appears between the "The principles behind every walk" heading and the 4-value grid. The copy describes structured consistency, reading dog signals, and the walk-to-rest transition.

---

### TASK 2.5: Add owner pull quote to homepage between reviews and neighborhood teaser
**File**: nottherug-boilerplate.html
**Location**: PAGE: HOME → between the Featured reviews section and the Neighborhood teaser section (~line 1372, after `</section>` closing the reviews section and before `<!-- Neighborhood teaser -->`)
**Find**: The transition between sections:
```
  </section>

  <!-- Neighborhood teaser -->
```
(This appears after the 3 homepage review cards section closes.)
**Action**: ADD BEFORE `<!-- Neighborhood teaser -->`
**With**:
```html

  <!-- Owner pull quote -->
  <section class="section-sm">
    <div class="container">
      <div style="max-width:680px; margin:0 auto; text-align:center; padding:40px 32px">
        <div style="font-size:36px; color:var(--sage-light); margin-bottom:20px; font-family:var(--font-display)">"</div>
        <p style="font-family:var(--font-italic); font-size:20px; font-style:italic; color:var(--charcoal); line-height:1.7; margin-bottom:20px">We share the same love for our clients' dogs as they do. We understand the bond between a family and their pet — and our goal is simple: provide an intimate, positive experience for you and your loved one.</p>
        <div style="font-size:14px; font-weight:600; color:var(--sage-dark)">— Luis Baro, Founder</div>
      </div>
    </div>
  </section>

```
**Acceptance criteria**: A centered pull quote from Luis appears between the homepage featured reviews and neighborhood teaser sections. Quote is styled in italic display font. Attribution reads "— Luis Baro, Founder".

---

### TASK 2.6: Add privacy/public figures copy to Walk + Training on Services page
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Pricing card 2 (Walk + Training) → feature list (~line 1481)
**Find**: `<div class="price-feature"><span class="price-check">✓</span> Ideal for reactive dogs</div>`
**Action**: ADD AFTER
**With**: `<div class="price-feature"><span class="price-check">✓</span> Well suited for families and public figures who value privacy</div>`
**Acceptance criteria**: Walk + Training pricing card now includes a feature line about privacy suitability, appearing after the "Ideal for reactive dogs" line.

---

### TASK 2.7: Expand Double-Leash Safety card with equipment specifics
**File**: nottherug-boilerplate.html
**Location**: PAGE: SAFETY → Trust cards → Double-Leash Safety Method card (~line 1910)
**Find**: `<p>All our walkers use our signature dual collar-and-harness method on every walk. Two points of contact means if one fails, your dog is still safe. This is non-negotiable regardless of breed or temperament.</p>`
**Action**: REPLACE
**With**: `<p>All our walkers use our signature dual collar-and-harness method — front clip harnesses paired with martingale collars, secured with Geartac security belts. Two points of contact means if one fails, your dog is still safe. Every walker carries a trainer treat pouch and follows a strict no-phone-while-walking policy. We conduct weekly gear checks on all equipment, and every new team member completes four weeks of walking and safety training directly with the owner before their first solo walk. This is non-negotiable regardless of breed or temperament.</p>`
**Acceptance criteria**: Double-Leash Safety card now names specific equipment (front clip harnesses, martingale collars, Geartac belts, treat pouches), the no-phone policy, weekly gear checks, and the 4-week new hire training protocol.

---

### TASK 2.8: Add paw cleaning explanation to Safety FAQ accordion
**File**: nottherug-boilerplate.html
**Location**: PAGE: SAFETY → FAQ accordion → after the last `<details>` block (cancellation policy, ~line 1983)
**Find**: The last FAQ details block, which ends with:
```
          <details style="padding:18px 0; cursor:pointer">
            <summary style="font-weight:600; font-size:15px; list-style:none; display:flex; justify-content:space-between">What's your cancellation policy? <span style="color:var(--sage)">+</span></summary>
            <p style="color:var(--mid-gray); font-size:14px; margin-top:12px; line-height:1.7">48-hour notice for individual walks, no charge. For boarding, we request 72-hour notice for full refunds. We understand life is unpredictable and handle edge cases with flexibility.</p>
          </details>
```
**Action**: ADD AFTER this `</details>` tag
**With**:
```html
          <details style="border-top:1px solid var(--light-gray); padding:18px 0; cursor:pointer">
            <summary style="font-weight:600; font-size:15px; list-style:none; display:flex; justify-content:space-between">Why do you clean dogs' paws after every walk? <span style="color:var(--sage)">+</span></summary>
            <p style="color:var(--mid-gray); font-size:14px; margin-top:12px; line-height:1.7">Dogs perspire through their mouth and feet, and outdoor debris such as rat poison, fertilizer, and construction materials can be harmful if left on paws. We clean every dog's paws thoroughly after every walk, regardless of weather conditions. It's a small step that protects your dog's health and keeps your home clean.</p>
          </details>
```
**Acceptance criteria**: A new FAQ question "Why do you clean dogs' paws after every walk?" appears at the bottom of the FAQ accordion. The answer explains the health reasoning (perspiration through feet, harmful debris).

---

### TASK 2.9: Add "approved medication" to Group Walk pricing card feature
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Pricing card 1 (Group Walk) → feature list (~line 1464)
**Find**: `<div class="price-feature"><span class="price-check">✓</span> Feeding if requested</div>`
**Action**: REPLACE
**With**: `<div class="price-feature"><span class="price-check">✓</span> Feeding & approved medication if requested</div>`
**Acceptance criteria**: Group Walk pricing card feature reads "Feeding & approved medication if requested".

---

### TASK 2.10: Add medication support to Senior Care specialty card
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Specialty services → Senior Care card (~line 1516)
**Find**: `<p>20-minute gentle solo visits for senior or special needs dogs.</p>`
**Action**: REPLACE
**With**: `<p>20-minute gentle solo visits for senior or special needs dogs. Feeding and approved medication support included.</p>`
**Acceptance criteria**: Senior Care description includes medication support language.

---

### TASK 2.11: Add medication support to Puppy Visits specialty card
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Specialty services → Puppy Visits card (~line 1510)
**Find**: `<p>Ages 2–6 months. 2–3 visits/day recommended. Development-focused socialization.</p>`
**Action**: REPLACE
**With**: `<p>Ages 2–6 months. 2–3 visits/day recommended. Development-focused socialization. Feeding and approved medication support included.</p>`
**Acceptance criteria**: Puppy Visits description includes medication support language.

---

## PHASE 2 COMPLETION CHECK

- [ ] All 11 tasks in this phase executed
- [ ] Team section shows 9 team member cards + 1 "Join the team" card
- [ ] Luis's bio (team card and origin story) references SiriusXM, Red Bull, Upper West Side, Williamsburg since 2006
- [ ] Walk methodology paragraph visible in values section
- [ ] Owner pull quote visible between homepage reviews and neighborhood teaser
- [ ] Walk + Training card includes privacy/public figures feature
- [ ] Double-Leash Safety card lists specific equipment and protocols
- [ ] New paw cleaning FAQ appears in accordion
- [ ] "Approved medication" present in Group Walk, Senior Care, and Puppy Visits descriptions
- [ ] HTML file still valid — confirm showPage() navigation works across all pages
- [ ] No [VERIFY WITH LUIS] flags added in this phase (all flags from Phase 1 should still be present)

---

## PHASE 3 — POLISH

---

### TASK 3.1: Add Léa's pronunciation guide to her team card
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Team section → Léa's team card → name line (~line 1849)
**Find**: `<div class="team-name">Léa</div>`
**Action**: REPLACE
**With**: `<div class="team-name">Léa <span style="font-weight:400; font-size:13px; color:var(--mid-gray)">(pronounced lay-uh)</span></div>`
**Acceptance criteria**: Léa's name on her team card includes a parenthetical pronunciation guide in smaller, lighter text.

---

### TASK 3.2: Name Suzy and Oliver in the About page origin story
**File**: nottherug-boilerplate.html
**Location**: PAGE: ABOUT → Origin story → paragraph 1 (already rewritten in Task 2.3)
**Find**: `What began as a reset became a calling, and what started as a favor`
**Action**: REPLACE
**With**: `It started with two dogs — Suzy and Oliver — and daily walks rooted in close observation. What began as a reset became a calling, and what started as a favor`
**Acceptance criteria**: Origin story paragraph 1 now names Luis's dogs Suzy and Oliver.

---

### TASK 3.3: Add missing details to Cat Visits on homepage
**File**: nottherug-boilerplate.html
**Location**: PAGE: HOME → Services preview → Cat Visits card (~line 1276)
**Find**: `<p>Feeding, play, litter, and a little love. Plant watering included. Perfect for weekends away.</p>`
**Action**: REPLACE
**With**: `<p>Feeding, play, litter, brushing, and a little love. Plant watering, mail collection, and tidying up included. Perfect for weekends away.</p>`
**Acceptance criteria**: Homepage Cat Visits card includes brushing, mail collection, and tidying.

---

### TASK 3.4: Add missing details to Cat Visits on Services page
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Specialty services → Cat Visits card (~line 1522)
**Find**: `<p>Feeding, play, litter box, and plant watering. Same team, same love.</p>`
**Action**: REPLACE
**With**: `<p>Feeding, play, litter box, brushing, plant watering, mail collection, and tidying up your space. Same team, same love.</p>`
**Acceptance criteria**: Services page Cat Visits card includes brushing, mail collection, and tidying.

---

### TASK 3.5: Add puppy visit discount to homepage card
**File**: nottherug-boilerplate.html
**Location**: PAGE: HOME → Services preview → Puppy Visits card (~line 1264)
**Find**: `<p>Specialized visits for puppies 2–6 months old. 2–3 visits daily recommended for development.</p>`
**Action**: REPLACE
**With**: `<p>Specialized visits for puppies 2–6 months old. 2–3 visits daily recommended for development. Discount for 2nd and 3rd daily visit.</p>`
**Acceptance criteria**: Homepage Puppy Visits card mentions the multi-visit discount.

---

### TASK 3.6: Add puppy visit discount to Services page card
**File**: nottherug-boilerplate.html
**Location**: PAGE: SERVICES → Specialty services → Puppy Visits card (already modified in Task 2.11)
**Find**: `<p>Ages 2–6 months. 2–3 visits/day recommended. Development-focused socialization. Feeding and approved medication support included.</p>`
**Action**: REPLACE
**With**: `<p>Ages 2–6 months. 2–3 visits/day recommended. Development-focused socialization. Feeding and approved medication support included. Discount for 2nd and 3rd daily visit.</p>`
**Acceptance criteria**: Services page Puppy Visits card mentions the multi-visit discount.

---

### TASK 3.7: Add cross-street reference to Contact page address
**File**: nottherug-boilerplate.html
**Location**: PAGE: CONTACT → contact-method address block (already modified in Task 1.3)
**Find**: `<p style="margin-top:8px; font-size:13px; color:var(--mid-gray)">281 N 7th St, Ste 13, Brooklyn, NY 11211</p>`
**Action**: REPLACE
**With**: `<p style="margin-top:8px; font-size:13px; color:var(--mid-gray)">281 N 7th St, Ste 13, Brooklyn, NY 11211<br>b/t Havemeyer St & Meeker Ave · Williamsburg North Side</p>`
**Acceptance criteria**: Contact page address includes cross-street reference and "Williamsburg North Side" designation on a second line.

---

### TASK 3.8: Add cross-street reference to footer address
**File**: nottherug-boilerplate.html
**Location**: FOOTER → footer-bottom (already modified in Task 1.5)
**Find**: `<div class="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · All rights reserved</div>`
**Action**: REPLACE
**With**: `<div class="footer-copy">© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St & Meeker Ave · All rights reserved</div>`
**Acceptance criteria**: Footer includes cross-street reference between the address and "All rights reserved".

---

### TASK 3.9: Add newsletter email capture to footer
**File**: nottherug-boilerplate.html
**Location**: FOOTER → between the footer-grid closing `</div>` and `<div class="footer-bottom">` (~line 2544–2545)
**Find**: The transition between footer-grid and footer-bottom:
```
    </div>
    <div class="footer-bottom">
```
(The first `</div>` closes the footer-grid.)
**Action**: ADD AFTER the footer-grid closing `</div>` and BEFORE `<div class="footer-bottom">`
**With**:
```html
    <div id="footer-newsletter-shell" style="border-top:1px solid rgba(255,255,255,0.1); padding-top:32px; margin-bottom:32px; text-align:center">
      <h4 style="font-family:var(--font-body); font-size:14px; font-weight:500; color:rgba(255,255,255,0.55); margin-bottom:8px">Stay In Touch</h4>
      <p style="font-size:13px; color:rgba(255,255,255,0.4); margin-bottom:16px; max-width:320px; margin-left:auto; margin-right:auto">Subscribe for dog care tips, neighborhood news, and Not The Rug updates.</p>
      <div style="display:flex; gap:8px; max-width:360px; margin:0 auto">
        <input type="email" placeholder="Your email address" style="flex:1; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:white; padding:10px 14px; border-radius:6px; font-size:14px; font-family:var(--font-body)">
        <button class="btn btn-primary btn-sm" style="white-space:nowrap" onclick="alert('✅ Subscribed! (Newsletter integration needed before launch)')">Subscribe</button>
      </div>
    </div>
```
**Acceptance criteria**: A "Stay In Touch" newsletter signup with email input and Subscribe button appears in the footer between the link columns and the copyright bar. Input is styled for dark background. Button triggers a placeholder alert. The section has the DOM id `footer-newsletter-shell`.

---

## PHASE 3 COMPLETION CHECK

- [ ] All 9 tasks in this phase executed
- [ ] Léa's team card shows pronunciation guide
- [ ] Origin story names Suzy and Oliver
- [ ] Cat Visits cards (homepage + services) include brushing, mail collection, tidying
- [ ] Puppy Visits cards (homepage + services) mention multi-visit discount
- [ ] Contact page address includes cross-street reference
- [ ] Footer address includes cross-street reference
- [ ] Footer newsletter email capture section is visible and functional (placeholder)
- [ ] HTML file still valid — confirm showPage() navigation works across all pages
- [ ] Search for remaining "(555)" — should only appear in Book form placeholder
- [ ] Search for "hello@nottherug" — should return 0 results

---

## HUMAN HANDOFF — For Bryan

This section lists items requiring human action before the site goes live. These are not for Sonnet.

### Items Flagged [VERIFY WITH LUIS]

1. **Expanded hours**: The new site shows Mon–Fri 8 AM–7 PM and Sat–Sun 9 AM–5 PM. The existing site shows Mon–Fri 10 AM–6 PM only, with no weekend hours. Confirm correct hours with Luis before publishing.

2. **Boarding weekend pricing ($110)**: The new site shows "$110 weekends" as a separate tier. The existing site shows "$100–$110 per day" as a range without specifying weekends. Confirm whether the $110 weekend rate is correct or whether the range already covers the variation.

### Walker Reana and Nuria Situation

3. **Reana**: Named as "our primary walker" in Kassie T.'s real review. Reana does not appear on the existing site's staff page or the new site's team section. Confirm with Luis: Is Reana a current walker who needs a bio? A former walker? If former, the review can still be used but Reana should not be implied as active.

4. **Nuria**: Named in Hayley M.'s real review ("My dog LOVES Nuria!"). Same situation as Reana — not on any staff page. Confirm with Luis.

### Real Reviews Needed

5. **Minimum 8 total reviews needed**: The Reviews page currently has 4 real reviews (Jessica Y., Jayne A., Kassie T., Hayley M.). The existing site has 34 Yelp reviews. Pull at least 4–6 more real reviews from Yelp and Google to bring the Reviews page to 8–10 cards. Get client permission where needed. Add these as additional `<div class="review-card card-hover">` blocks inside the `<div class="reviews-masonry">` container.

### Photography

6. **Placeholder images**: All `.img-placeholder` blocks throughout the site need real photography before launch. Key shots needed:
   - Hero image (dog + walker in McCarren Park or Williamsburg street)
   - Founder photo (Luis)
   - Individual team member photos (all 9 walkers)
   - Neighborhood feature images (one per neighborhood: Williamsburg, Greenpoint, Bushwick, Bed-Stuy, Park Slope, East Williamsburg)
   - Walk report card sample photos (3 small images)

### Time To Pet Integration

7. **Phase 2 product roadmap**: The Book page currently uses placeholder forms with `alert()` calls. The next product phase should integrate with Time To Pet for real booking, scheduling, and payment. The "Coming Soon" callout on the How It Works page already references this.

### Additional Observations

8. **About page hero says "one neighborhood"**: The heading reads "15 years of walks, one neighborhood" — but the new site serves 6 neighborhoods. Consider updating to "15 years of walks, one mission" or "15 years of walks, your neighborhood" to align with the neighborhood expansion strategy.

9. **About page body says "has never left"**: The origin story body paragraph says "Not The Rug was born in Williamsburg and has never left." This may need a softened phrasing given the multi-neighborhood expansion (e.g., "Not The Rug was born in Williamsburg — and that's still home base.").

10. **Marcus's dog name**: The new site says Marcus "Owns a rescue named Potato." The existing site bio does not mention a dog. Confirm whether "Potato" is real or a placeholder detail.

11. **Copyright year**: Updated from 2025 to 2026 in this plan. Confirm this is correct for the intended launch year.

12. **Newsletter integration**: The footer "Stay In Touch" section uses a placeholder `alert()`. Before launch, connect this to a real email service (Mailchimp, ConvertKit, etc.).

13. **Google/Yelp review links**: The "Leave a Review" box on the Reviews page uses placeholder `alert()` calls. Replace with actual Google Business and Yelp review page URLs before launch.

---

**END OF PLAN**
