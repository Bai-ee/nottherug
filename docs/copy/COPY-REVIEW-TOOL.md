# Not The Rug — Website Copy Review

Generated 2026-09-15 from the live site code · **380 pieces of copy**

This file lists **every word currently on the Not The Rug website**, organised page by page.
It exists so you can read the site as a document, confirm that everything it says is accurate,
and send any corrections back in a form the developer can apply automatically.

---

## How to use this

1. Open this file with your AI assistant (Claude, ChatGPT, whichever you use). Upload it as a file rather than pasting it.
2. Tell it: **"Read this file and walk me through the website copy section by section."**
3. It will read you each piece of copy and ask if it is accurate. Say **yes**, or tell it what is wrong.
4. If something bothers you but you are not sure what it should say, just say so — it gets noted for the developer.
5. When you are done, tell it: **"Produce the final change list."**
6. Send the developer the block it produces. That is the whole handoff.

You do not have to review everything in one sitting, and you do not have to review everything at all.
Anything you say nothing about stays exactly as it is.

**If you only have twenty minutes**, review the Home page, Services & Rates, and Contact sections.
Those carry the pricing, the claims and the contact details — the things most likely to be out of date.

### What is in here

1. **Site-wide (navigation + footer)** — 30 items
2. **Home** — 96 items
3. **Services & Rates** — 41 items
4. **How It Works** — 20 items
5. **About Us** — 48 items
6. **Safety & Trust** — 34 items
7. **Williamsburg** — 29 items
8. **Reviews** — 24 items
9. **Book a Walk** — 6 items
10. **Contact** — 21 items
11. **Meet & Greet form** — 29 items
12. **Search engine + social previews (site-wide fallback)** — 2 items

---

## Instructions for the AI assistant

**Read this section fully before responding to the founder.**

You are walking the founder of Not The Rug through the copy on his existing website so he can
confirm it is accurate. You are a careful reader and a note-taker. You are **not** a copywriter,
an editor, or a marketing advisor, and the wording of the site is not under review — only whether
what it says is true and current.

### The one question you ask

For every piece of copy: **"Is this accurate?"** — meaning: are the facts right, is anything out of
date, is anything no longer true. That is the whole check.

You do not ask whether he likes it, whether it sounds like him, how he would phrase it, what he wants
to emphasise, or whether it could be stronger. You do not offer opinions on the copy, and you never
suggest alternative wording for something he has confirmed is accurate.

### Two kinds of response, handled differently

**A correction** — he tells you a fact is wrong and what the right value is (a price, a name, a year,
a service that changed, an address). Record it as a change: same sentence, same words, only the wrong
fact swapped for the right one. Show him the before/after once and move on.

**A concern** — he says something bothers him, does not sit right, is not how he would put it, or he
is not sure what it should say. Do **not** try to solve it. Do not draft options, do not ask him to
workshop it. Write down what he said, in his words, against that item's id, and move on. Those go
in a separate notes list for the developer at the end. Say something like: *"Noted — I'll flag that
for the developer."* and continue.

If he starts working on wording himself and gives you exact replacement text he wants, that is a
correction — record it as given. If he is thinking out loud, that is a concern — note it and keep going.

### Hard rules

1. **Every item in this file has an `id`. You may only ever refer to ids that appear in this file.**
   If you output an id that is not in this file, the developer's tooling will reject the whole change list.
2. **Never invent new copy slots.** You cannot add a new section, a new heading, a new bullet, a new
   service card, a new team member, a new FAQ question, a new review, or a new button. The website has a
   fixed set of copy slots and this file is the complete list of them.
3. **Never delete a copy slot.** Every id must keep some text. If the founder wants something removed from
   the site, do not blank it — write `"REMOVE-REQUEST"` in the notes field for that id and let the
   developer handle it as a code change.
4. **Only change what the founder says is wrong.** Silence means keep. A change only exists once he has
   given you the correct value or the exact text he wants.
5. **Never guess a fact.** Prices, years in business, review counts, certifications, insurance claims,
   phone numbers and hours are factual. If he says a value is wrong but does not give the new one, ask
   for it. If he does not know, leave the item alone and note it as a concern.
6. **Copy the `current` text back verbatim.** Your change list must echo the existing text exactly as it
   appears in this file, character for character, including any `<br />`, `<em>` or `&apos;` bits. The
   developer's tooling uses that to confirm it is editing the right thing. If it does not match, the
   change is rejected.
7. **Respect the length of the slot.** These are real positions in a real layout. Keep a correction about
   the same length as what it replaces. If it genuinely needs to be much longer, say so in `notes`.

### How to run the session

Work through the file in the order it is written. For each section:

- Read the founder the copy in that section in plain language (use the **Reads as** line, not the raw text).
- Ask: *is this accurate — anything wrong or out of date?*
- If yes, move on. If he gives a correction, record it. If he raises a concern, note it.
- Do not batch up twenty questions at once. A few items at a time is fine; a whole page at once is not.

Things worth double-checking as you go, because they go stale:

- **Prices** — are these current, including tax handling?
- **Numbers** — years in business, review counts, dogs per walk, response times.
- **Claims** — insurance, bonding, certifications, background checks. Only what is actually true today.
- **Contact details** — phone, email, hours, address, service area.
- **Team** — names, roles and bios of the people currently working there.
- **Services** — everything listed is still offered; nothing offered is missing a price.

No preamble about what a section is for, no commentary on the copy, no summaries of how it reads.

### Formatting the replacement text

- Plain text is fine. If the current text contains `<br />`, that is a line break in the design — keep it
  in the same place.
- If the current text contains `<em>...</em>`, that word is visually emphasised in the design. Keep it
  on the same word.
- Do not worry about apostrophes or quote marks. Write them normally; the developer's tooling converts them.
- `⏎` in a **Reads as** line just marks where a line break falls. Do not type that character.

### The change list you must produce at the end

When the founder says he is done, output **one fenced JSON code block**, then (only if there are any)
a `## Founder notes` section. Nothing else after those.

```json
{
  "reviewedBy": "Luis",
  "reviewedOn": "YYYY-MM-DD",
  "sourceGeneratedAt": "2026-09-15",
  "changes": [
    {
      "id": "services.services-grid.price-33",
      "current": "$33",
      "new": "$35",
      "notes": "Price went up in June"
    }
  ]
}
```

Rules for that block:

- Include **only** items that are actually changing. Leave everything else out entirely.
- `id` must be copied exactly from this file.
- `current` must be copied exactly from this file.
- `new` is the corrected text.
- `notes` is optional, one short line, for anything the developer needs to know.
- Valid JSON. No trailing commas, no comments inside the block.
- If nothing is changing, output the block with `"changes": []`.

Then the notes section, one line per item, in this shape:

```
## Founder notes

- `home.hero.not-the-rug-is-williamsburg` — Not sure "most trusted" is something we can say. Wants to think about it.
- `about.about-team.reana` — Reana is now part-time, bio may need updating. Didn't have new wording.
- (no id) — Would like a photo of the new van on the About page.
```

Concerns tied to a specific piece of copy carry its id. Anything that is not about an existing piece of
copy — a new section, a page that does not exist, a design change, a photo — goes in the same list
marked `(no id)`. Never force any of these into the JSON change list.

---

## The copy

Each item shows its **id** (used by the developer's tooling), what kind of element it is,
the exact text in the code, and how it reads on the page.

---

## 1. Site-wide (navigation + footer)

_30 items_

### Navigation (all pages)

> Shown on every marketing page — desktop links and the mobile menu both live here now.

**`global.nav-standalone.not-the-rug`** — Image description (not visible — read by screen readers and Google)

```text
Not The Rug
```

_The same wording is used elsewhere: `global.footer.not-the-rug`, `book.bookpage-hero.not-the-rug`. Those are separate slots — change them too if they should stay consistent._

**`global.nav-standalone.book-a-walk`** — Button

```text
Book a Walk
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

_The same wording is used elsewhere: `global.footer.book-a-walk`. Those are separate slots — change them too if they should stay consistent._

**`global.nav-standalone.contact`** — Text

```text
Contact
```

_The same wording is used elsewhere: `global.footer.contact`. Those are separate slots — change them too if they should stay consistent._

### Footer

> Appears on every page except /book and /contact.

**`global.footer.not-the-rug`** — Text

```text
Not The Rug
```

_The same wording is used elsewhere: `global.nav-standalone.not-the-rug`, `book.bookpage-hero.not-the-rug`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.brooklyn-s-most-trusted-neighborhood`** — Paragraph

```text
Brooklyn&apos;s most trusted neighborhood dog walking service. Williamsburg-based since 2011. Small groups, consistent walkers, genuine care.
```

Reads as: Brooklyn's most trusted neighborhood dog walking service. Williamsburg-based since 2011. Small groups, consistent walkers, genuine care.

**`global.footer.instagram`** — Image description (not visible — read by screen readers and Google)

```text
Instagram
```

**`global.footer.yelp`** — Image description (not visible — read by screen readers and Google)

```text
Yelp
```

**`global.footer.google`** — Image description (not visible — read by screen readers and Google)

```text
Google
```

**`global.footer.services`** — Heading

```text
Services
```

**`global.footer.group-walks`** — Text

```text
Group Walks
```

**`global.footer.walk-training`** — Text

```text
Walk + Training
```

**`global.footer.puppy-visits`** — Text

```text
Puppy Visits
```

_The same wording is used elsewhere: `services.services-data.puppy-visits`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.senior-dog-care`** — Text

```text
Senior Dog Care
```

**`global.footer.boarding`** — Text

```text
Boarding
```

**`global.footer.service-area`** — Heading

```text
Service Area
```

_The same wording is used elsewhere: `contact.contactpage-body.service-area`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.williamsburg`** — Text

```text
Williamsburg
```

_The same wording is used elsewhere: `neighborhoods.hoods-williamsburg.williamsburg`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.company`** — Heading

```text
Company
```

**`global.footer.about-us`** — Text

```text
About Us
```

**`global.footer.how-it-works`** — Text

```text
How It Works
```

**`global.footer.safety-trust`** — Text

```text
Safety &amp; Trust
```

Reads as: Safety & Trust

_The same wording is used elsewhere: `safety.safety-hero.safety-trust`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.reviews`** — Text

```text
Reviews
```

**`global.footer.contact`** — Text

```text
Contact
```

_The same wording is used elsewhere: `global.nav-standalone.contact`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.book-a-walk`** — Text

```text
Book a Walk
```

_The same wording is used elsewhere: `global.nav-standalone.book-a-walk`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.ready-to-get-started`** — Heading

```text
Ready to get started?
```

**`global.footer.book-a-free-meet-greet`** — Paragraph

```text
Book a free meet &amp; greet and tell us about your dog. No commitment — just a chance to connect.
```

Reads as: Book a free meet & greet and tell us about your dog. No commitment — just a chance to connect.

**`global.footer.book-luis-for-a-meet`** — Button

```text
Book Luis, for a Meet &amp; Greet
```

Reads as: Book Luis, for a Meet & Greet

_The same wording is used elsewhere: `home.hero.book-luis-for-a-meet`. Those are separate slots — change them too if they should stay consistent._

**`global.footer.brooklyn-est-2011`** — Text

```text
Brooklyn &middot; Est. 2011
```

Reads as: Brooklyn · Est. 2011

**`global.footer.2026-not-the-rug-281`** — Text

```text
© 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St &amp; Meeker Ave · All rights reserved
```

Reads as: © 2026 Not The Rug · 281 N 7th St, Ste 13, Brooklyn, NY 11211 · b/t Havemeyer St & Meeker Ave · All rights reserved

**`global.footer.privacy`** — Link

```text
Privacy
```

**`global.footer.terms`** — Link

```text
Terms
```

---

## 2. Home

_96 items_

### Homepage hero

> First thing a visitor reads.

**`home.hero.mccarren-park-williamsburg`** — Text

```text
McCarren Park, Williamsburg
```

**`home.hero.not-the-rug-nyc-dog`** — Image description (not visible — read by screen readers and Google)

```text
Not The Rug NYC dog walking badge
```

**`home.hero.williamsburg-brooklyn-est-2011`** — Small label

```text
Williamsburg, Brooklyn &middot; Est. 2011
```

Reads as: Williamsburg, Brooklyn · Est. 2011

**`home.hero.your-dog-deserves-someone-they`** — Heading

```text
Your dog deserves<br /><em>someone they know.</em>
```

Reads as: Your dog deserves ⏎ someone they know.

**`home.hero.not-the-rug-is-williamsburg`** — Paragraph

```text
Not The Rug is Williamsburg&apos;s most trusted dog walking service. No strangers. No first-time handlers. Just experienced professionals who show up consistently. Because peace of mind starts with knowing exactly who&apos;s holding the leash.
```

Reads as: Not The Rug is Williamsburg's most trusted dog walking service. No strangers. No first-time handlers. Just experienced professionals who show up consistently. Because peace of mind starts with knowing exactly who's holding the leash.

**`home.hero.book-luis-for-a-meet`** — Button

```text
Book Luis, for a Meet &amp; Greet
```

Reads as: Book Luis, for a Meet & Greet

_The same wording is used elsewhere: `global.footer.book-luis-for-a-meet`. Those are separate slots — change them too if they should stay consistent._

**`home.hero.view-services`** — Button

```text
View Services
```

**`home.hero.text-5`** — Text

```text
5★
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

_The same wording is used elsewhere: `home.featured-reviews.text-5`, `about.about-hero.text-5`. Those are separate slots — change them too if they should stay consistent._

**`home.hero.yelp-rating`** — Small label

```text
Yelp<br />rating
```

Reads as: Yelp ⏎ rating

**`home.hero.google-rating`** — Small label

```text
Google<br />rating
```

Reads as: Google ⏎ rating

**`home.hero.text-79`** — Text

```text
79
```

_The same wording is used elsewhere: `home.featured-reviews.text-79`. Those are separate slots — change them too if they should stay consistent._

**`home.hero.verified-reviews`** — Small label

```text
Verified<br />reviews
```

Reads as: Verified ⏎ reviews

**`home.hero.text-15`** — Text

```text
15+
```

**`home.hero.years-in-williamsburg`** — Small label

```text
Years in<br />Williamsburg
```

Reads as: Years in ⏎ Williamsburg

### How it works (homepage strip)

**`home.how-it-works-strip.from-the-first-hello-to`** — Heading

```text
From the first hello to your dog&apos;s <em style={{ fontStyle: 'normal' }}>daily routine</em>
```

Reads as: From the first hello to your dog's daily routine

**`home.how-it-works-strip.learn-more-about-our-process`** — Button

```text
Learn More About Our Process
```

**`home.how-it-works-strip.phone-call-meet-greet`** — Heading

```text
Phone Call & Meet & Greet
```

**`home.how-it-works-strip.a-free-in-home-consultation`** — Paragraph

```text
A free in-home consultation so you and your dog can meet your walker before the first walk.
```

**`home.how-it-works-strip.set-your-schedule`** — Heading

```text
Set Your Schedule
```

**`home.how-it-works-strip.choose-your-walking-frequency-preferred`** — Paragraph

```text
Choose your walking frequency, preferred times, and any special instructions.
```

**`home.how-it-works-strip.first-walk`** — Heading

```text
First Walk
```

**`home.how-it-works-strip.gps-tracked-45-minute-adventure`** — Paragraph

```text
GPS-tracked 45-minute adventure with post-walk photo report sent to your phone.
```

**`home.how-it-works-strip.ongoing-care`** — Heading

```text
Ongoing Care
```

**`home.how-it-works-strip.same-walker-same-routine-your`** — Paragraph

```text
Same walker, same routine. Your dog knows the drill and so do we.
```

### Trust bar

> Short credential chips. Very tight space.

**`home.trust-bar.napps-certified`** — Text

```text
NAPPS Certified
```

**`home.trust-bar.fully-insured-bonded`** — Text

```text
Fully Insured &amp; Bonded
```

Reads as: Fully Insured & Bonded

_The same wording is used elsewhere: `home.closing-trust.fully-insured-bonded`. Those are separate slots — change them too if they should stay consistent._

**`home.trust-bar.gps-tracked-every-walk`** — Text

```text
GPS-Tracked Every Walk
```

**`home.trust-bar.background-checked-team`** — Text

```text
Background-Checked Team
```

_The same wording is used elsewhere: `home.closing-trust.background-checked-team`, `safety.safety-standards.background-checked-team`. Those are separate slots — change them too if they should stay consistent._

**`home.trust-bar.max-3-dogs-per-walk`** — Text

```text
Max 3 Dogs Per Walk
```

_The same wording is used elsewhere: `safety.safety-standards.max-3-dogs-per-walk`. Those are separate slots — change them too if they should stay consistent._

### Services preview + rates (homepage)

> Prices here must match the Services page.

**`home.services-preview.sales-tax`** — Price

```text
+ sales tax
```

**`home.services-preview.our-home-neighborhood`** — Small label

```text
Our Home Neighborhood
```

**`home.services-preview.a-williamsburg-service-not-a`** — Heading

```text
A Williamsburg <em style={{ fontStyle: 'normal', color: 'var(--sage-dark)' }}>service</em>, not a platform
```

Reads as: A Williamsburg service, not a platform

**`home.services-preview.no-contracts-no-hidden-fees`** — Paragraph

```text
No contracts. No hidden fees. Just dependable neighborhood care from a team your dog knows and trusts.
```

### Safety + Williamsburg recap

**`home.closing-trust.why-williamsburg-trusts-us`** — Small label

```text
Why Williamsburg Trusts Us
```

**`home.closing-trust.insured-background-checked-and-local`** — Heading

```text
Insured, background-checked, and <em style={{ fontStyle: 'normal', color: 'var(--sage-light)' }}>local since 2011</em>
```

Reads as: Insured, background-checked, and local since 2011

**`home.closing-trust.fully-insured-bonded`** — Heading

```text
Fully Insured &amp; Bonded
```

Reads as: Fully Insured & Bonded

_The same wording is used elsewhere: `home.trust-bar.fully-insured-bonded`. Those are separate slots — change them too if they should stay consistent._

**`home.closing-trust.comprehensive-pet-care-liability-insurance`** — Paragraph

```text
Comprehensive pet care liability insurance, fully bonded. Proof shared on request.
```

**`home.closing-trust.background-checked-team`** — Heading

```text
Background-Checked Team
```

_The same wording is used elsewhere: `home.trust-bar.background-checked-team`, `safety.safety-standards.background-checked-team`. Those are separate slots — change them too if they should stay consistent._

**`home.closing-trust.every-walker-vetted-before-their`** — Paragraph

```text
Every walker vetted before their first walk — the same way you&apos;d vet anyone holding a key to your home.
```

Reads as: Every walker vetted before their first walk — the same way you'd vet anyone holding a key to your home.

**`home.closing-trust.gps-tracking-on-every-walk`** — Heading

```text
GPS Tracking on Every Walk
```

_The same wording is used elsewhere: `safety.safety-standards.gps-tracking-on-every-walk`. Those are separate slots — change them too if they should stay consistent._

**`home.closing-trust.a-post-walk-route-map`** — Paragraph

```text
A post-walk route map showing exactly where your dog went and how long they were out. No guessing.
```

**`home.closing-trust.double-leash-safety-method`** — Heading

```text
Double-Leash Safety Method
```

_The same wording is used elsewhere: `safety.safety-standards.double-leash-safety-method`. Those are separate slots — change them too if they should stay consistent._

**`home.closing-trust.secure-collar-and-harness-plus`** — Paragraph

```text
Secure collar-and-harness plus a leash belt — two points of contact on every walk, every dog.
```

**`home.closing-trust.we-re-a-williamsburg-service`** — Heading

```text
We&apos;re a Williamsburg service, through and through
```

Reads as: We're a Williamsburg service, through and through

**`home.closing-trust.we-know-every-park-shortcut`** — Paragraph

```text
We know every park, shortcut, and puddle to avoid — because we&apos;ve been walking these blocks since 2011. Not a citywide app dispatching whoever&apos;s nearest: the same local team, every time.
```

Reads as: We know every park, shortcut, and puddle to avoid — because we've been walking these blocks since 2011. Not a citywide app dispatching whoever's nearest: the same local team, every time.

**`home.closing-trust.book-a-walk-in-williamsburg`** — Button

```text
Book a Walk in Williamsburg
```

**`home.closing-trust.ask-about-williamsburg-coverage`** — Button

```text
Ask About Williamsburg Coverage
```

### Featured reviews

> Real customer quotes — only edit if the quote is inaccurate or the customer asked.

**`home.featured-reviews.file-01-voices`** — Small label

```text
File 01 · Voices
```

**`home.featured-reviews.what-our-clients-say`** — Heading

```text
What our <em style={{ fontStyle: 'normal', color: 'var(--sage-dark)' }}>clients</em> say
```

Reads as: What our clients say

**`home.featured-reviews.read-all-reviews`** — Button

```text
Read All Reviews
```

**`home.featured-reviews.verified-yelp`** — Small label

```text
Verified · Yelp
```

**`home.featured-reviews.luis-and-team-are-truly`** — Paragraph

```text
Luis and team are truly the best of the best. It&apos;s not easy to trust just anyone with our fur baby, but Luis&apos;s professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.
```

Reads as: Luis and team are truly the best of the best. It's not easy to trust just anyone with our fur baby, but Luis's professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.

**`home.featured-reviews.jessica-y`** — Text

```text
Jessica Y.
```

_The same wording is used elsewhere: `reviews.reviews-list.jessica-y`. Those are separate slots — change them too if they should stay consistent._

**`home.featured-reviews.rev-01-williamsburg-yelp`** — Text

```text
Rev. 01 · Williamsburg · Yelp
```

**`home.featured-reviews.we-ve-been-with-not`** — Paragraph

```text
We&apos;ve been with Not The Rug for over two years and couldn&apos;t be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.
```

Reads as: We've been with Not The Rug for over two years and couldn't be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.

**`home.featured-reviews.jayne-a`** — Text

```text
Jayne A.
```

_The same wording is used elsewhere: `reviews.reviews-list.jayne-a`. Those are separate slots — change them too if they should stay consistent._

**`home.featured-reviews.rev-02-williamsburg-yelp`** — Text

```text
Rev. 02 · Williamsburg · Yelp
```

**`home.featured-reviews.luis-and-his-amazing-team`** — Paragraph

```text
Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own — flexible with schedule changes and always reliable. Your dogs will be in great hands!
```

**`home.featured-reviews.kassie-t`** — Text

```text
Kassie T.
```

_The same wording is used elsewhere: `reviews.reviews-list.kassie-t`. Those are separate slots — change them too if they should stay consistent._

**`home.featured-reviews.rev-03-williamsburg-yelp`** — Text

```text
Rev. 03 · Williamsburg · Yelp
```

**`home.featured-reviews.text-5`** — Text

```text
5★
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

_The same wording is used elsewhere: `home.hero.text-5`, `about.about-hero.text-5`. Those are separate slots — change them too if they should stay consistent._

**`home.featured-reviews.yelp-rating`** — Small label

```text
Yelp rating
```

**`home.featured-reviews.google-rating`** — Small label

```text
Google rating
```

**`home.featured-reviews.text-79`** — Text

```text
79
```

_The same wording is used elsewhere: `home.hero.text-79`. Those are separate slots — change them too if they should stay consistent._

**`home.featured-reviews.verified-reviews`** — Small label

```text
Verified reviews
```

### Booking call-to-action (homepage form heading)

**`home.booking-cta.not-the-rug-nyc-dog`** — Image description (not visible — read by screen readers and Google)

```text
Not The Rug NYC dog walking
```

**`home.booking-cta.form-02-meet-greet`** — Small label

```text
Form 02 · Meet &amp; Greet
```

Reads as: Form 02 · Meet & Greet

**`home.booking-cta.what-we-d-like-to`** — Heading

```text
What We&apos;d Like to Know....
```

Reads as: What We'd Like to Know....

### Service names, copy and prices (typed data)

> Feeds both the homepage rates preview and the /services grid. The two use different names/copy for the same services on purpose — see the file comment.

**`home.services-data.solo-walk`** — Heading

```text
Solo Walk
```

**`home.services-data.a-private-60-minute-walk`** — Paragraph

```text
A private 60-minute walk.
```

**`home.services-data.price-60`** — Price

```text
$60
```

_The same wording is used elsewhere: `services.services-data.price-60`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.per-walk`** — Price unit

```text
per walk
```

_Written 3 times in this section by design (the strip loops). One edit updates all of them._

**`home.services-data.group-walk`** — Heading

```text
Group Walk
```

**`home.services-data.45-minute-walk-with-up`** — Paragraph

```text
45-minute walk with up to three dogs max.
```

**`home.services-data.price-33`** — Price

```text
$33
```

_The same wording is used elsewhere: `services.services-data.price-33`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.senior-dog-visits`** — Heading

```text
Senior Dog Visits
```

_The same wording is used elsewhere: `services.services-data.senior-dog-visits`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.gentle-20-minute-one-on`** — Paragraph

```text
Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs.
```

**`home.services-data.price-35`** — Price

```text
$35
```

_Written 3 times in this section by design (the strip loops). One edit updates all of them._

_The same wording is used elsewhere: `services.services-data.price-35`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.visit`** — Price unit

```text
/visit
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

_The same wording is used elsewhere: `services.services-data.visit`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.puppy-walk`** — Heading

```text
Puppy Walk
```

**`home.services-data.designed-for-puppies-still-learning`** — Paragraph

```text
Designed for puppies still learning.
```

**`home.services-data.boarding-overnight-sitting`** — Heading

```text
Boarding & Overnight Sitting
```

_The same wording is used elsewhere: `services.services-data.boarding-overnight-sitting`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.loving-overnight-care-in-your`** — Paragraph

```text
Loving overnight care in your dog's own home, where they can stick to their routine and sleep in familiar surroundings while you're away.
```

_The same wording is used elsewhere: `services.services-data.loving-overnight-care-in-your`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.price-100`** — Price

```text
$100
```

_The same wording is used elsewhere: `services.services-data.price-100`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.night`** — Price unit

```text
/night
```

_The same wording is used elsewhere: `services.services-data.night`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.cat-visits`** — Heading

```text
Cat Visits
```

_The same wording is used elsewhere: `services.services-data.cat-visits`. Those are separate slots — change them too if they should stay consistent._

**`home.services-data.fresh-food-clean-water-litter`** — Paragraph

```text
Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We'll also water plants, bring in the mail, and keep an eye on your home while you're away.
```

_The same wording is used elsewhere: `services.services-data.fresh-food-clean-water-litter`. Those are separate slots — change them too if they should stay consistent._

### Scrolling review strip

> Each quote appears twice in the code so the strip can loop seamlessly. Editing one updates both.

**`home.proof-marquee.luis-s-professionalism-puts-even`** — Paragraph

```text
Luis's professionalism puts even the most nervous pet parent at ease
```

**`home.proof-marquee.jessica-y-williamsburg`** — Small label

```text
Jessica Y., Williamsburg
```

**`home.proof-marquee.seriously-hire-not-the-rug`** — Paragraph

```text
Seriously — hire Not The Rug. They won't disappoint.
```

**`home.proof-marquee.jayne-a-williamsburg`** — Small label

```text
Jayne A., Williamsburg
```

**`home.proof-marquee.trust-luis-to-take-care`** — Paragraph

```text
Trust Luis to take care of your dog as if it was his own
```

**`home.proof-marquee.kassie-t-williamsburg`** — Small label

```text
Kassie T., Williamsburg
```

**`home.proof-marquee.daily-updates-cute-photos-and`** — Paragraph

```text
Daily updates, cute photos, and my dog LOVES her walker
```

**`home.proof-marquee.hayley-m-williamsburg`** — Small label

```text
Hayley M., Williamsburg
```

### Home — search engine + link preview

**`home.home-meta.not-the-rug-williamsburg-dog`** — Heading

```text
Not The Rug — Williamsburg Dog Walking Since 2011
```

---

## 3. Services & Rates

_41 items_

### Services page hero

**`services.services-hero.services-rates`** — Small label

```text
Services &amp; Rates
```

Reads as: Services & Rates

**`services.services-hero.transparent-pricing-no-surprises`** — Heading

```text
Transparent pricing,<br />no surprises
```

Reads as: Transparent pricing, ⏎ no surprises

**`services.services-hero.every-service-includes-a-free`** — Paragraph

```text
Every service includes a free consultation, GPS tracking, and post-walk photo updates.
```

**`services.services-hero.biscuit-biscuit-bklyn`** — Link

```text
Biscuit · @biscuit_bklyn
```

**`services.services-hero.always-included`** — Small label

```text
Always Included
```

**`services.services-hero.every-walk-every-time`** — Heading

```text
Every walk, every time
```

### Services page booking form

> Form labels and the fallback contact note (replaces the old fake "Book a Service" / "Ask a Question" tabs).

**`services.services-forms.already-a-client-or-have`** — Paragraph

```text
Already a client, or have a quick question first? Call or text
```

**`services.services-forms.email`** — Paragraph

```text
, email
```

**`services.services-forms.or`** — Paragraph

```text
, or
```

**`services.services-forms.visit-our-contact-page`** — Text

```text
visit our contact page
```

### Service names, copy and prices (typed data)

> Feeds both the homepage rates preview and the /services grid. The two use different names/copy for the same services on purpose — see the file comment.

**`services.services-data.small-group-visit`** — Heading

```text
Small Group Visit
```

**`services.services-data.45-minute-visit-with-up`** — Paragraph

```text
45-minute visit with up to three dogs max. GPS tracked, personalized report card included, and paws cleaned before returning home.
```

**`services.services-data.price-33`** — Price

```text
$33
```

_The same wording is used elsewhere: `home.services-data.price-33`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.visit`** — Price unit

```text
/visit
```

_Written 5 times in this section by design (the strip loops). One edit updates all of them._

_The same wording is used elsewhere: `home.services-data.visit`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.most-popular`** — Small label

```text
Most Popular
```

**`services.services-data.solo-visit`** — Heading

```text
Solo Visit
```

**`services.services-data.a-private-60-minute-visit`** — Paragraph

```text
A private 60-minute visit for nervous, anxious, or reactive dogs, or pups who simply do better with one-on-one attention. Built around patience, consistency, and positive reinforcement.
```

**`services.services-data.price-60`** — Price

```text
$60
```

_The same wording is used elsewhere: `home.services-data.price-60`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.premium`** — Small label

```text
Premium
```

**`services.services-data.puppy-visits`** — Heading

```text
Puppy Visits
```

_The same wording is used elsewhere: `global.footer.puppy-visits`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.designed-for-puppies-still-learning`** — Paragraph

```text
Designed for puppies still learning the ropes. Visits focus on potty breaks, enrichment, socialization, and positive reinforcement. Discounts available for multiple daily visits.
```

**`services.services-data.price-35`** — Price

```text
$35
```

_Written 3 times in this section by design (the strip loops). One edit updates all of them._

_The same wording is used elsewhere: `home.services-data.price-35`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.senior-dog-visits`** — Heading

```text
Senior Dog Visits
```

_The same wording is used elsewhere: `home.services-data.senior-dog-visits`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.gentle-20-minute-one-on`** — Paragraph

```text
Gentle 20+-minute one-on-one visits designed for senior dogs and pups with special needs. We move at their pace, with patience, comfort, and plenty of care.
```

**`services.services-data.boarding-overnight-sitting`** — Heading

```text
Boarding & Overnight Sitting
```

_The same wording is used elsewhere: `home.services-data.boarding-overnight-sitting`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.loving-overnight-care-in-your`** — Paragraph

```text
Loving overnight care in your dog's own home, where they can stick to their routine and sleep in familiar surroundings while you're away.
```

_The same wording is used elsewhere: `home.services-data.loving-overnight-care-in-your`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.price-100`** — Price

```text
$100
```

_The same wording is used elsewhere: `home.services-data.price-100`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.night`** — Price unit

```text
/night
```

_The same wording is used elsewhere: `home.services-data.night`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.7-day-discounts`** — Small label

```text
7+ day discounts
```

**`services.services-data.cat-visits`** — Heading

```text
Cat Visits
```

_The same wording is used elsewhere: `home.services-data.cat-visits`. Those are separate slots — change them too if they should stay consistent._

**`services.services-data.fresh-food-clean-water-litter`** — Paragraph

```text
Fresh food, clean water, litter care, playtime, brushing, and plenty of attention. We'll also water plants, bring in the mail, and keep an eye on your home while you're away.
```

_The same wording is used elsewhere: `home.services-data.fresh-food-clean-water-litter`. Those are separate slots — change them too if they should stay consistent._

### What's always included

**`services.services-included.gps-tracking`** — Heading

```text
GPS Tracking
```

**`services.services-included.live-route-map-sent-after`** — Paragraph

```text
Live route map sent after every walk so you see exactly where they went.
```

**`services.services-included.photo-report`** — Heading

```text
Photo Report
```

**`services.services-included.post-walk-update-with-photos`** — Paragraph

```text
Post-walk update with photos, mood notes, and any observations.
```

**`services.services-included.double-leash-safety`** — Heading

```text
Double-Leash Safety
```

**`services.services-included.our-signature-dual-collar-and`** — Paragraph

```text
Our signature dual collar-and-harness method on every walk.
```

**`services.services-included.direct-communication`** — Heading

```text
Direct Communication
```

**`services.services-included.text-or-call-your-walker`** — Paragraph

```text
Text or call your walker directly — no support tickets, no bots.
```

### /services — search engine + link preview

**`services.services-meta.services-rates-not-the-rug`** — Heading

```text
Services & Rates — Not The Rug
```

**`services.services-meta.every-service-includes-a-free`** — Paragraph

```text
Every service includes a free consultation, GPS tracking, and post-walk photo updates. Transparent pricing, no surprises.
```

---

## 4. How It Works

_20 items_

### How It Works page hero

**`how-it-works.hiw-hero.the-process`** — Small label

```text
The Process
```

**`how-it-works.hiw-hero.how-it-works`** — Heading

```text
How it works
```

**`how-it-works.hiw-hero.from-first-contact-to-daily`** — Paragraph

```text
From first contact to daily walks — here&apos;s exactly what to expect when you join Not The Rug.
```

Reads as: From first contact to daily walks — here's exactly what to expect when you join Not The Rug.

**`how-it-works.hiw-hero.mochi-mochi-wlmsbg`** — Link

```text
Mochi · @mochi_wlmsbg
```

### How It Works steps + walk report

**`how-it-works.hiw-steps.sample-walk-report`** — Small label

```text
Sample Walk Report
```

**`how-it-works.hiw-steps.walk-report-bruno`** — Text

```text
Walk Report — Bruno
```

**`how-it-works.hiw-steps.tuesday-march-18-10-15`** — Text

```text
Tuesday, March 18 · 10:15 AM
```

**`how-it-works.hiw-steps.duration`** — Small label

```text
Duration
```

**`how-it-works.hiw-steps.46-minutes`** — Text

```text
46 minutes
```

**`how-it-works.hiw-steps.distance`** — Small label

```text
Distance
```

**`how-it-works.hiw-steps.1-8-miles`** — Text

```text
1.8 miles
```

**`how-it-works.hiw-steps.potty-breaks`** — Small label

```text
Potty Breaks
```

**`how-it-works.hiw-steps.2-times-all-cleaned-up`** — Text

```text
2 times — all cleaned up
```

**`how-it-works.hiw-steps.treats`** — Small label

```text
Treats
```

**`how-it-works.hiw-steps.2-zukes-mini-naturals`** — Text

```text
2 × Zukes Mini Naturals
```

**`how-it-works.hiw-steps.gps-route-mccarren-park-loop`** — Small label

```text
GPS Route · McCarren Park Loop
```

**`how-it-works.hiw-steps.walker-s-note`** — Text

```text
Walker&apos;s Note
```

Reads as: Walker's Note

**`how-it-works.hiw-steps.bruno-was-in-great-spirits`** — Paragraph

```text
&quot;Bruno was in great spirits today! He made a new friend at the park — a golden named Lucy. He was a bit tired on the way back so we took the shady route home. Paws cleaned, water bowl topped up. See you Thursday!&quot;
```

Reads as: "Bruno was in great spirits today! He made a new friend at the park — a golden named Lucy. He was a bit tired on the way back so we took the shady route home. Paws cleaned, water bowl topped up. See you Thursday!"

### /how-it-works — search engine + link preview

**`how-it-works.hiw-meta.how-it-works-not-the`** — Heading

```text
How It Works — Not The Rug
```

**`how-it-works.hiw-meta.from-first-contact-to-daily`** — Paragraph

```text
From first contact to daily walks — here's exactly what to expect when you join Not The Rug.
```

---

## 5. About Us

_48 items_

### About page (hero + origin story + section headings)

**`about.about-hero.our-story`** — Small label

```text
Our Story
```

**`about.about-hero.15-years-of-walks-one`** — Heading

```text
15 years of walks,<br />one neighborhood
```

Reads as: 15 years of walks, ⏎ one neighborhood

**`about.about-hero.not-the-rug-was-born`** — Paragraph

```text
Not The Rug was born in Williamsburg and has never left. Here&apos;s why that matters.
```

Reads as: Not The Rug was born in Williamsburg and has never left. Here's why that matters.

**`about.about-hero.scout-scout-bklyn`** — Link

```text
Scout · @scout_bklyn
```

**`about.about-hero.founded-2011`** — Small label

```text
Founded 2011
```

**`about.about-hero.a-neighborhood-service-not-a`** — Heading

```text
A neighborhood service, not a platform
```

**`about.about-hero.not-the-rug-was-founded`** — Paragraph

```text
Not The Rug was founded in 2011 by Luis, a Williamsburg resident since 2006. Before dog walking, Luis spent years in broadcasting and music, including work as a Program Director at SiriusXM Radio and consulting for Red Bull on music strategy and cultural programming.
```

**`about.about-hero.in-2008-the-pace-of`** — Paragraph

```text
In 2008, the pace of that world pushed him to step away. He took a job walking dogs on the Upper West Side, and the work changed everything. It started with two dogs, Suzy and Oliver, and daily walks rooted in patience, observation, and trust. What began as a reset became a calling.
```

**`about.about-hero.the-name-is-a-promise`** — Paragraph

```text
The name is a promise: your dog won&apos;t ruin your rug because they&apos;ll be properly walked, genuinely cared for, and returned home happy. It&apos;s also a nod to the neighborhood&apos;s sense of humor. We don&apos;t take ourselves too seriously, but we take your dog very seriously.
```

Reads as: The name is a promise: your dog won't ruin your rug because they'll be properly walked, genuinely cared for, and returned home happy. It's also a nod to the neighborhood's sense of humor. We don't take ourselves too seriously, but we take your dog very seriously.

**`about.about-hero.we-ve-never-expanded-beyond`** — Paragraph

```text
We&apos;ve never expanded beyond what we can do well. We don&apos;t dispatch strangers. Every walker on our team is trained, trusted, and familiar with the neighborhood. Most importantly, they know your dog by name.
```

Reads as: We've never expanded beyond what we can do well. We don't dispatch strangers. Every walker on our team is trained, trusted, and familiar with the neighborhood. Most importantly, they know your dog by name.

**`about.about-hero.text-2011`** — Text

```text
2011
```

**`about.about-hero.founded-in-williamsburg`** — Text

```text
Founded in Williamsburg
```

**`about.about-hero.text-5`** — Text

```text
5★
```

_The same wording is used elsewhere: `home.hero.text-5`, `home.featured-reviews.text-5`. Those are separate slots — change them too if they should stay consistent._

**`about.about-hero.avg-rating-across-platforms`** — Text

```text
Avg. rating across platforms
```

**`about.about-hero.the-team`** — Small label

```text
The Team
```

**`about.about-hero.meet-your-dog-s-people`** — Heading

```text
Meet your dog&apos;s people
```

Reads as: Meet your dog's people

**`about.about-hero.how-we-work`** — Small label

```text
How We Work
```

**`about.about-hero.the-principles-behind-every-walk`** — Heading

```text
The principles behind every walk
```

**`about.about-hero.our-walks-are-structured-consistent`** — Paragraph

```text
Our walks are structured, consistent, and responsive. From pickup to drop-off, we give each dog a familiar rhythm while staying present to their pace, mood, leash cues, and body language. That repetition builds trust, helping dogs move with more ease and settle calmly when they return home.
```

### Team section ("Join the team" card)

**`about.about-team.join-the-team`** — Heading

```text
Join the team
```

**`about.about-team.we-hire-experienced-passionate-walkers`** — Paragraph

```text
We hire experienced, passionate walkers who want to build real relationships — not just fill shifts.
```

**`about.about-team.learn-more`** — Button

```text
Learn More
```

**`about.about-team.luis`** — Heading

```text
Luis
```

**`about.about-team.founder-lead-walker`** — Small label

```text
Founder & Lead Walker
```

**`about.about-team.a-former-siriusxm-program-director`** — Paragraph

```text
A former SiriusXM Program Director and Red Bull music strategist, Luis traded the broadcast world for Brooklyn sidewalks. He founded Not The Rug in 2011 after discovering dog walking on the Upper West Side. A Williamsburg resident since 2006, he knows the blocks, the parks, and most of the dogs by name.
```

**`about.about-team.lincoln`** — Heading

```text
Lincoln
```

**`about.about-team.manager-senior-walker`** — Small label

```text
Manager & Senior Walker
```

**`about.about-team.originally-from-south-louisiana-with`** — Paragraph

```text
Originally from South Louisiana, with roots in DownEast Maine, Lincoln grew up surrounded by animals, including dogs, miniature donkeys, and even emus. If it had four legs or feathers, she likely helped care for it. Four years ago, Lincoln moved to Brooklyn with her three Southern pups, bringing her deep respect for animals with her. Her understanding of animal behavior, along with her steady and generous approach, makes her a trusted presence on the team. Now a Williamsburg local, Lincoln feels lucky to do this work every day.
```

**`about.about-team.marcus`** — Heading

```text
Marcus
```

**`about.about-team.senior-walker`** — Small label

```text
Senior Walker
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

**`about.about-team.marcus-has-spent-his-life`** — Paragraph

```text
Marcus has spent his life around animals, from growing up with pets to working as a dog trainer at Petco. He brings a thoughtful understanding of how dogs communicate, learn, and respond. A theater kid, video gamer, curious thinker, and devoted animal lover, Marcus sees every walk as a chance to build trust and connection. Say hello when you see him in the neighborhood — he's always happy to meet pups and their people.
```

**`about.about-team.christian`** — Heading

```text
Christian
```

**`about.about-team.christian-spent-more-than-six`** — Paragraph

```text
Christian spent more than six years working as a chef and kitchen manager, where he developed discipline, focus, and strong attention to detail. Over time, he realized he wanted work that felt more grounded and connected. With a lifelong love for animals, Christian chose a new path that brought more balance into his life. He brings patience, care, and a steady presence to every walk, treating each dog with the same respect he would give his own.
```

**`about.about-team.shawn`** — Heading

```text
Shawn
```

**`about.about-team.walker`** — Small label

```text
Walker
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

**`about.about-team.shawn-brings-care-precision-and`** — Paragraph

```text
Shawn brings care, precision, and a calm presence to every walk. An artist, musician, and visual creator, he approaches dog care with patience and intention. Before joining Not The Rug, Shawn spent two years with another service and came to us wanting a more thoughtful approach to the work. He has been a strong addition to the team, and we're glad to have him.
```

**`about.about-team.yenny`** — Heading

```text
Yenny
```

**`about.about-team.yenny-is-an-experienced-dog`** — Paragraph

```text
Yenny is an experienced dog walker and a returning member of the Not The Rug team. Before joining us, she spent three years managing a doggy daycare in Long Island City, working with dogs of all personalities and energy levels. After stepping away to have her baby, Yenny is back with us and already reconnecting with the neighborhood pups. We're excited to have her back.
```

### How we work (values)

**`about.about-how-we-work.consistency-over-convenience`** — Heading

```text
Consistency Over Convenience
```

**`about.about-how-we-work.we-don-t-take-on`** — Paragraph

```text
We don't take on every client — not to be exclusive, but to protect the quality of care. We only accept new dogs when we can assign a consistent walker with the time and capacity to do the job well. Your dog deserves a familiar person, not a different face every week.
```

**`about.about-how-we-work.small-groups-real-attention`** — Heading

```text
Small Groups, Real Attention
```

**`about.about-how-we-work.three-dogs-maximum-per-walk`** — Paragraph

```text
Three dogs maximum per walk. Always. It's not a marketing line. It's how we keep walks safe, calm, and attentive. Your dog gets real exercise and engagement, not crowd management.
```

**`about.about-how-we-work.neighborhood-expertise`** — Heading

```text
Neighborhood Expertise
```

**`about.about-how-we-work.we-know-the-williamsburg-details`** — Paragraph

```text
We know the Williamsburg details that only come from years of daily walks: which areas of the park flood after rain, which blocks to avoid, which routes help reactive dogs feel calmer, and where to find shade in summer heat. Fifteen years builds that kind of knowledge.
```

**`about.about-how-we-work.real-people-always-reachable`** — Heading

```text
Real People, Always Reachable
```

**`about.about-how-we-work.luis-s-personal-number-is`** — Paragraph

```text
Luis's personal number is on the website, and you can text or call your walker directly. No support tickets. No call centers. Just real people who know your dog and respond when you need them.
```

### /about — search engine + link preview

**`about.about-meta.about-us-not-the-rug`** — Heading

```text
About Us — Not The Rug
```

**`about.about-meta.not-the-rug-was-born`** — Paragraph

```text
Not The Rug was born in Williamsburg and has never left. 15 years of walks, one neighborhood.
```

---

## 6. Safety & Trust

_34 items_

### Safety page hero + certifications heading

**`safety.safety-hero.safety-trust`** — Small label

```text
Safety &amp; Trust
```

Reads as: Safety & Trust

_The same wording is used elsewhere: `global.footer.safety-trust`. Those are separate slots — change them too if they should stay consistent._

**`safety.safety-hero.why-trust-matters-more-than`** — Heading

```text
Why trust matters<br />more than price
```

Reads as: Why trust matters ⏎ more than price

**`safety.safety-hero.every-trust-and-safety-standard`** — Paragraph

```text
Every trust and safety standard we hold ourselves to — and why we hold it.
```

_The same wording is used elsewhere: `safety.safety-meta.every-trust-and-safety-standard`. Those are separate slots — change them too if they should stay consistent._

**`safety.safety-hero.waffles-waffles-nyc`** — Link

```text
Waffles · @waffles_nyc
```

**`safety.safety-hero.certifications-memberships`** — Small label

```text
Certifications &amp; Memberships
```

Reads as: Certifications & Memberships

**`safety.safety-hero.professional-credentials`** — Heading

```text
Professional credentials
```

### Certifications strip (shared: homepage + Safety page)

> Must be factually true. Editing this updates both places it appears.

**`safety.safety-certs.napps-member`** — Small label

```text
NAPPS Member
```

**`safety.safety-certs.background-checked`** — Small label

```text
Background Checked
```

**`safety.safety-certs.fully-insured`** — Small label

```text
Fully Insured
```

**`safety.safety-certs.bonded`** — Small label

```text
Bonded
```

### Safety FAQ (heading)

**`safety.safety-faq.common-questions`** — Small label

```text
Common Questions
```

**`safety.safety-faq.what-families-usually-ask`** — Heading

```text
What families usually ask
```

**`safety.safety-faq.what-happens-if-my-dog`** — Heading

```text
What happens if my dog gets injured on a walk?
```

**`safety.safety-faq.we-contact-you-immediately-provide`** — Paragraph

```text
We contact you immediately, provide basic first aid if needed, and take your dog to your designated vet or the nearest emergency clinic. We document everything clearly and stay with your dog until you can be there. Our insurance covers veterinary costs related to walker negligence.
```

**`safety.safety-faq.will-my-dog-always-have`** — Heading

```text
Will my dog always have the same walker?
```

**`safety.safety-faq.yes-in-the-vast-majority`** — Paragraph

```text
Yes, in the vast majority of cases. We assign a primary walker at onboarding and only introduce a backup walker (who you'll meet in advance) if your regular walker is unavailable. We never send an unknown person to your home.
```

**`safety.safety-faq.what-are-your-vaccination-requirements`** — Heading

```text
What are your vaccination requirements?
```

**`safety.safety-faq.all-dogs-must-be-current`** — Paragraph

```text
All dogs must be current on Rabies, DHPP (distemper/parvo), and Bordetella vaccines. We require documentation at onboarding. This protects your dog, our walkers, and other dogs in our care.
```

**`safety.safety-faq.what-s-your-cancellation-policy`** — Heading

```text
What's your cancellation policy?
```

**`safety.safety-faq.for-individual-walks-we-ask`** — Paragraph

```text
For individual walks, we ask for 24 hours' notice to avoid a charge. For boarding, we ask for 72 hours' notice. We understand life happens and handle special circumstances with flexibility.
```

**`safety.safety-faq.why-do-you-clean-dogs`** — Heading

```text
Why do you clean dogs' paws after every walk?
```

**`safety.safety-faq.we-clean-paws-after-every`** — Paragraph

```text
We clean paws after every walk to help remove dirt, debris, and anything harmful your dog may have stepped in outside. It's a simple step that supports your dog's health and helps keep your home clean.
```

### Safety standards

> Insurance and certification claims — must be factually true.

**`safety.safety-standards.fully-insured-bonded`** — Heading

```text
Fully Insured & Bonded
```

**`safety.safety-standards.not-the-rug-carries-comprehensive`** — Paragraph

```text
Not The Rug carries comprehensive pet care liability insurance and is fully bonded. In the unlikely event of an accident or property issue, you're protected. We'll share proof of insurance on request.
```

**`safety.safety-standards.background-checked-team`** — Heading

```text
Background-Checked Team
```

_The same wording is used elsewhere: `home.trust-bar.background-checked-team`, `home.closing-trust.background-checked-team`. Those are separate slots — change them too if they should stay consistent._

**`safety.safety-standards.every-member-of-our-team`** — Paragraph

```text
Every member of our team undergoes a comprehensive background check before their first walk. We vet our walkers as carefully as you'd vet someone with a key to your home — because that's exactly what they have.
```

**`safety.safety-standards.gps-tracking-on-every-walk`** — Heading

```text
GPS Tracking on Every Walk
```

_The same wording is used elsewhere: `home.closing-trust.gps-tracking-on-every-walk`. Those are separate slots — change them too if they should stay consistent._

**`safety.safety-standards.every-walk-is-gps-logged`** — Paragraph

```text
Every walk is GPS logged. You receive a post-walk route map showing exactly where your dog went, how long they walked, and when they returned. No guessing, no vague check-ins.
```

**`safety.safety-standards.double-leash-safety-method`** — Heading

```text
Double-Leash Safety Method
```

_The same wording is used elsewhere: `home.closing-trust.double-leash-safety-method`. Those are separate slots — change them too if they should stay consistent._

**`safety.safety-standards.every-dog-is-walked-with`** — Paragraph

```text
Every dog is walked with our secure collar-and-harness system, supported by a leash belt for added protection. Two points of contact help keep your dog safe, and every walker follows our no-phone-while-walking policy, completes hands-on safety training, and receives regular gear checks.
```

**`safety.safety-standards.max-3-dogs-per-walk`** — Heading

```text
Max 3 Dogs Per Walk
```

_The same wording is used elsewhere: `home.trust-bar.max-3-dogs-per-walk`. Those are separate slots — change them too if they should stay consistent._

**`safety.safety-standards.we-cap-every-group-walk`** — Paragraph

```text
We cap every group walk at three dogs. This is a safety standard and a quality standard. Your dog gets genuine attention — not a chaotic pack of strangers that can't be safely managed.
```

### /safety — search engine + link preview

**`safety.safety-meta.safety-trust-not-the-rug`** — Heading

```text
Safety & Trust — Not The Rug
```

**`safety.safety-meta.every-trust-and-safety-standard`** — Paragraph

```text
Every trust and safety standard we hold ourselves to — and why we hold it.
```

_The same wording is used elsewhere: `safety.safety-hero.every-trust-and-safety-standard`. Those are separate slots — change them too if they should stay consistent._

---

## 7. Williamsburg

_29 items_

### Neighborhoods page hero

**`neighborhoods.hoods-hero.service-areas`** — Small label

```text
Service Areas
```

**`neighborhoods.hoods-hero.williamsburg-is-our-backyard`** — Heading

```text
Williamsburg is our<br />backyard
```

Reads as: Williamsburg is our ⏎ backyard

**`neighborhoods.hoods-hero.we-re-a-williamsburg-service`** — Paragraph

```text
We&apos;re a Williamsburg service through and through — we know every park, shortcut, and puddle to avoid.
```

Reads as: We're a Williamsburg service through and through — we know every park, shortcut, and puddle to avoid.

**`neighborhoods.hoods-hero.pepper-pepper-bklyn`** — Link

```text
Pepper · @pepper_bklyn
```

### Williamsburg detail

> Williamsburg is the only neighborhood page by design.

**`neighborhoods.hoods-williamsburg.dog-walking-in`** — Heading

```text
Dog Walking in<br />
```

Reads as: Dog Walking in ⏎

**`neighborhoods.hoods-williamsburg.parks-we-walk`** — Text

```text
Parks We Walk
```

**`neighborhoods.hoods-williamsburg.book-a-walk-in`** — Button

```text
Book a Walk in
```

**`neighborhoods.hoods-williamsburg.ask-about`** — Button

```text
Ask About
```

**`neighborhoods.hoods-williamsburg.coverage`** — Button

```text
Coverage
```

**`neighborhoods.hoods-williamsburg.your-assigned-walker`** — Heading

```text
Your Assigned Walker
```

**`neighborhoods.hoods-williamsburg.we-match-you-with-a`** — Paragraph

```text
We match you with a walker who lives or regularly works in
```

**`neighborhoods.hoods-williamsburg.they-know-the-neighborhood-the`** — Paragraph

```text
— they know the neighborhood the way you know your apartment.
```

**`neighborhoods.hoods-williamsburg.local-park-routes`** — Heading

```text
Local Park Routes
```

**`neighborhoods.hoods-williamsburg.our-walkers-have-season-calibrated`** — Paragraph

```text
Our walkers have season-calibrated routes for
```

**`neighborhoods.hoods-williamsburg.shaded-summer-paths-dry-winter`** — Paragraph

```text
— shaded summer paths, dry winter routes, and parks with good off-leash hours.
```

**`neighborhoods.hoods-williamsburg.fast-availability`** — Heading

```text
Fast Availability
```

**`neighborhoods.hoods-williamsburg.we-typically-have-walker-availability`** — Paragraph

```text
We typically have walker availability in
```

**`neighborhoods.hoods-williamsburg.within-1-2-weeks-of`** — Paragraph

```text
within 1–2 weeks of inquiry. Contact us to check current capacity.
```

**`neighborhoods.hoods-williamsburg.williamsburg`** — Heading

```text
Williamsburg
```

_The same wording is used elsewhere: `global.footer.williamsburg`. Those are separate slots — change them too if they should stay consistent._

**`neighborhoods.hoods-williamsburg.our-home-neighborhood-since-2011`** — Small label

```text
Our home neighborhood since 2011
```

**`neighborhoods.hoods-williamsburg.williamsburg-is-where-not-the`** — Paragraph

```text
Williamsburg is where Not The Rug was born, and it remains the heart of our operation. We know every building, every doorman, every park bench, and every dog on every block. When it comes to Williamsburg dog walking, nobody knows these streets better.
```

**`neighborhoods.hoods-williamsburg.mccarren-park`** — List item

```text
McCarren Park
```

**`neighborhoods.hoods-williamsburg.east-river-state-park`** — List item

```text
East River State Park
```

**`neighborhoods.hoods-williamsburg.domino-park`** — List item

```text
Domino Park
```

**`neighborhoods.hoods-williamsburg.n-5th-st-dog-run`** — List item

```text
N 5th St Dog Run
```

**`neighborhoods.hoods-williamsburg.marcy-park`** — List item

```text
Marcy Park
```

**`neighborhoods.hoods-williamsburg.dog-walker-williamsburg-brooklyn`** — Search phrase

```text
Dog walker Williamsburg Brooklyn
```

### /neighborhoods/williamsburg — search engine + link preview

**`neighborhoods.hoods-meta.dog-walking-in-williamsburg-brooklyn`** — Heading

```text
Dog Walking in Williamsburg, Brooklyn — Not The Rug
```

**`neighborhoods.hoods-meta.we-re-a-williamsburg-service`** — Paragraph

```text
We're a Williamsburg service through and through — we know every park, shortcut, and puddle to avoid.
```

---

## 8. Reviews

_24 items_

### Reviews page hero

**`reviews.reviews-hero.client-reviews`** — Small label

```text
Client Reviews
```

**`reviews.reviews-hero.what-brooklyn-dog-owners-say`** — Heading

```text
What Brooklyn<br />dog owners say
```

Reads as: What Brooklyn ⏎ dog owners say

**`reviews.reviews-hero.text-5-0`** — Text

```text
5.0
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

**`reviews.reviews-hero.google-rating`** — Small label

```text
Google Rating
```

**`reviews.reviews-hero.yelp-rating-34-reviews`** — Small label

```text
Yelp Rating · 34 Reviews
```

**`reviews.reviews-hero.text-15`** — Text

```text
15
```

**`reviews.reviews-hero.years-of-5-star-service`** — Small label

```text
Years of 5-star service
```

**`reviews.reviews-hero.beans-beans-wlmsbg`** — Link

```text
Beans · @beans_wlmsbg
```

**`reviews.reviews-hero.leave-a-review`** — Small label

```text
Leave a Review
```

**`reviews.reviews-hero.loved-working-with-us`** — Heading

```text
Loved working with us?
```

**`reviews.reviews-hero.your-review-helps-other-brooklyn`** — Paragraph

```text
Your review helps other Brooklyn dog owners find trustworthy care — and it means the world to our team.
```

**`reviews.reviews-hero.review-on-google`** — Button

```text
Review on Google
```

**`reviews.reviews-hero.review-on-yelp`** — Button

```text
Review on Yelp
```

### Review cards

> Real customer quotes — only edit if inaccurate.

**`reviews.reviews-list.jessica-y`** — Heading

```text
Jessica Y.
```

_The same wording is used elsewhere: `home.featured-reviews.jessica-y`. Those are separate slots — change them too if they should stay consistent._

**`reviews.reviews-list.williamsburg-yelp`** — Small label

```text
Williamsburg · Yelp
```

_Written 4 times in this section by design (the strip loops). One edit updates all of them._

**`reviews.reviews-list.luis-and-team-are-truly`** — Small label

```text
Luis and team are truly the best of the best. It's not easy to trust just anyone with our beloved fur baby, but Luis's professionalism and kindness combined with the GPS tracking he provides puts even the most nervous pet parent (me!!!) at ease.
```

**`reviews.reviews-list.jayne-a`** — Heading

```text
Jayne A.
```

_The same wording is used elsewhere: `home.featured-reviews.jayne-a`. Those are separate slots — change them too if they should stay consistent._

**`reviews.reviews-list.luis-is-the-guy-you`** — Small label

```text
Luis is the guy you want your fur babies to be taken care of by. We have used him for over two years now and couldn't even begin to tell you how grateful we are to have him! He has saved us so many times with our busy work schedules. From their normal walk, we get text updates and pics every day. He's even helped us with the rehab of one of our dogs recovering from surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug. They won't disappoint.
```

**`reviews.reviews-list.kassie-t`** — Heading

```text
Kassie T.
```

_The same wording is used elsewhere: `home.featured-reviews.kassie-t`. Those are separate slots — change them too if they should stay consistent._

**`reviews.reviews-list.luis-and-his-amazing-team`** — Small label

```text
Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own. He is also flexible and accommodating with schedule changes. Your dogs will be in great hands!
```

**`reviews.reviews-list.hayley-m`** — Heading

```text
Hayley M.
```

**`reviews.reviews-list.they-were-so-awesome-with`** — Small label

```text
They were so awesome with my dog and super patient with me. Daily updates on how the walk went, cute photos, and the price is really nice for a longer walk duration. My dog LOVES Nuria!
```

### /reviews — search engine + link preview

**`reviews.reviews-meta.client-reviews-not-the-rug`** — Heading

```text
Client Reviews — Not The Rug
```

**`reviews.reviews-meta.what-brooklyn-dog-owners-say`** — Paragraph

```text
What Brooklyn dog owners say about Not The Rug — 5-star ratings on Yelp and Google, 15 years of service.
```

---

## 9. Book a Walk

_6 items_

### /book — page content

**`book.bookpage-hero.not-the-rug`** — Image description (not visible — read by screen readers and Google)

```text
Not The Rug
```

_The same wording is used elsewhere: `global.nav-standalone.not-the-rug`, `global.footer.not-the-rug`. Those are separate slots — change them too if they should stay consistent._

**`book.bookpage-hero.get-started`** — Small label

```text
Get Started
```

**`book.bookpage-hero.book-your-free-meet-greet`** — Heading

```text
Book your free<br />Meet &amp; Greet
```

Reads as: Book your free ⏎ Meet & Greet

**`book.bookpage-hero.no-commitment-no-charge-we`** — Paragraph

```text
No commitment, no charge. We come to you, meet your dog, and answer every question.
```

_The same wording is used elsewhere: `book.book-meta.no-commitment-no-charge-we`, `layout.site-meta.no-commitment-no-charge-we`. Those are separate slots — change them too if they should stay consistent._

### /book — search engine + link preview

> Title shows in the browser tab and in Google results. Keep under ~60 characters.

**`book.book-meta.book-a-walk-free-meet`** — Heading

```text
Book a Walk — Free Meet & Greet · Not The Rug
```

_The same wording is used elsewhere: `layout.site-meta.book-a-walk-free-meet`. Those are separate slots — change them too if they should stay consistent._

**`book.book-meta.no-commitment-no-charge-we`** — Paragraph

```text
No commitment, no charge. We come to you, meet your dog, and answer every question.
```

_The same wording is used elsewhere: `book.bookpage-hero.no-commitment-no-charge-we`, `layout.site-meta.no-commitment-no-charge-we`. Those are separate slots — change them too if they should stay consistent._

---

## 10. Contact

_21 items_

### /contact — hero

**`contact.contactpage-hero.get-in-touch`** — Small label

```text
Get In Touch
```

**`contact.contactpage-hero.we-re-real-people-with`** — Heading

```text
We&apos;re real people<br />with a real number
```

Reads as: We're real people ⏎ with a real number

**`contact.contactpage-hero.no-chatbots-no-ticket-queues`** — Paragraph

```text
No chatbots, no ticket queues. Text us, call us, or fill out the form.
```

_The same wording is used elsewhere: `contact.contact-meta.no-chatbots-no-ticket-queues`. Those are separate slots — change them too if they should stay consistent._

**`contact.contactpage-hero.send-a-message`** — Small label

```text
Send a Message
```

**`contact.contactpage-hero.tell-us-about-your-dog`** — Heading

```text
Tell us about your dog
```

### Contact details

> Phone, email and hours — check these are current.

**`contact.contactpage-body.call-or-text`** — Heading

```text
Call or Text
```

**`contact.contactpage-body.the-fastest-way-to-reach`** — Paragraph

```text
The fastest way to reach us. Luis personally responds to all messages.
```

**`contact.contactpage-body.email`** — Heading

```text
Email
```

**`contact.contactpage-body.for-new-client-intake-less`** — Paragraph

```text
For new client intake, less urgent inquiries, or detailed questions.
```

**`contact.contactpage-body.service-area`** — Heading

```text
Service Area
```

_The same wording is used elsewhere: `global.footer.service-area`. Those are separate slots — change them too if they should stay consistent._

**`contact.contactpage-body.response-hours`** — Heading

```text
Response Hours
```

**`contact.contactpage-body.follow-us-on-instagram`** — Heading

```text
Follow us on Instagram
```

**`contact.contactpage-body.daily-walk-photos-dog-spotlights`** — Paragraph

```text
Daily walk photos, dog spotlights, neighborhood content, and the occasional chaos.
```

**`contact.contactpage-body.luis-nottherug-com`** — Text

```text
luis@nottherug.com
```

**`contact.contactpage-body.281-n-7th-st-ste`** — Text

```text
281 N 7th St, Ste 13, Brooklyn, NY 11211
```

**`contact.contactpage-body.b-t-havemeyer-st-meeker`** — Text

```text
b/t Havemeyer St & Meeker Ave · Williamsburg North Side
```

**`contact.contactpage-body.mon-fri-9-am-7`** — Text

```text
Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM
```

**`contact.contactpage-body.typically-reply-within-2-hours`** — Text

```text
Typically reply within 2 hours on weekdays
```

**`contact.contactpage-body.we-re-based-in-williamsburg`** — Text

```text
We're based in Williamsburg and serve North Williamsburg and much of South Williamsburg. We do our best to cover as much of the neighborhood as possible, but some areas may depend on staff availability.
```

### /contact — search engine + link preview

**`contact.contact-meta.we-re-real-people-with`** — Heading

```text
We're real people with a real number — Not The Rug
```

**`contact.contact-meta.no-chatbots-no-ticket-queues`** — Paragraph

```text
No chatbots, no ticket queues. Text us, call us, or fill out the form.
```

_The same wording is used elsewhere: `contact.contactpage-hero.no-chatbots-no-ticket-queues`. Those are separate slots — change them too if they should stay consistent._

---

## 11. Meet & Greet form

_29 items_

### Meet & Greet form

> Field labels, helper text, buttons and confirmation messages.

**`MeetGreetForm.form.website`** — Text

```text
Website
```

**`MeetGreetForm.form.step`** — Text

```text
Step
```

**`MeetGreetForm.form.of`** — Text

```text
of
```

**`MeetGreetForm.form.form-steps`** — Image description (not visible — read by screen readers and Google)

```text
Form steps
```

**`MeetGreetForm.form.your-name`** — Text

```text
Your Name
```

**`MeetGreetForm.form.first-last-name`** — Image description (not visible — read by screen readers and Google)

```text
First & last name
```

**`MeetGreetForm.form.phone-number`** — Text

```text
Phone Number
```

**`MeetGreetForm.form.email-address`** — Text

```text
Email Address
```

**`MeetGreetForm.form.you-email-com`** — Image description (not visible — read by screen readers and Google)

```text
you@email.com
```

**`MeetGreetForm.form.neighborhood`** — Text

```text
Neighborhood
```

**`MeetGreetForm.form.dog-s-name`** — Text

```text
Dog&apos;s Name
```

Reads as: Dog's Name

**`MeetGreetForm.form.what-s-their-name`** — Image description (not visible — read by screen readers and Google)

```text
What's their name?
```

**`MeetGreetForm.form.breed-age`** — Text

```text
Breed &amp; Age
```

Reads as: Breed & Age

**`MeetGreetForm.form.e-g-golden-3-years`** — Image description (not visible — read by screen readers and Google)

```text
e.g. Golden, 3 years
```

**`MeetGreetForm.form.is-your-dog-up-to`** — Text

```text
Is your dog up to date on vaccinations?
```

**`MeetGreetForm.form.service-interested-in`** — Text

```text
Service Interested In
```

**`MeetGreetForm.form.preferred-walk-frequency`** — Text

```text
Preferred walk frequency
```

**`MeetGreetForm.form.is-your-dog-fearful-or`** — Text

```text
Is your dog fearful or reactive around any of the following?
```

**`MeetGreetForm.form.select-all-that-apply`** — Paragraph

```text
Select all that apply
```

_Written 2 times in this section by design (the strip loops). One edit updates all of them._

**`MeetGreetForm.form.is-your-dog-allergic-to`** — Text

```text
Is your dog allergic to anything?
```

**`MeetGreetForm.form.anything-we-should-know`** — Text

```text
Anything we should know?
```

**`MeetGreetForm.form.quirks-anxieties-medication-needs-building`** — Image description (not visible — read by screen readers and Google)

```text
Quirks, anxieties, medication needs, building access info — anything helpful
```

**`MeetGreetForm.form.request-a-phone-consultation-instead`** — Text

```text
Request a phone consultation instead
```

**`MeetGreetForm.form.prefer-to-talk-first-we`** — Text

```text
Prefer to talk first? We&apos;ll call you to answer questions before scheduling.
```

Reads as: Prefer to talk first? We'll call you to answer questions before scheduling.

### Meet & Greet form — scheduling dialog

> Shown after the form is submitted, to book a Calendly time.

**`MeetGreetForm.form-scheduling.step-2-of-2`** — Text

```text
Step 2 of 2
```

**`MeetGreetForm.form-scheduling.schedule-your-meet-greet`** — Text

```text
Schedule your Meet &amp; Greet
```

Reads as: Schedule your Meet & Greet

**`MeetGreetForm.form-scheduling.close`** — Image description (not visible — read by screen readers and Google)

```text
Close
```

**`MeetGreetForm.form-scheduling.close-2`** — Button

```text
Close ×
```

**`MeetGreetForm.form-scheduling.calendly-scheduling`** — Image description (not visible — read by screen readers and Google)

```text
Calendly scheduling
```

---

## 12. Search engine + social previews (site-wide fallback)

_2 items_

### Site-wide search engine + link preview (root fallback)

> Every page now sets its own title/description; this is only the fallback if one is ever missing.

**`layout.site-meta.book-a-walk-free-meet`** — Browser tab + Google result title

```text
Book a Walk — Free Meet & Greet · Not The Rug
```

_The same wording is used elsewhere: `book.book-meta.book-a-walk-free-meet`. Those are separate slots — change them too if they should stay consistent._

**`layout.site-meta.no-commitment-no-charge-we`** — Google result description

```text
No commitment, no charge. We come to you, meet your dog, and answer every question.
```

_The same wording is used elsewhere: `book.bookpage-hero.no-commitment-no-charge-we`, `book.book-meta.no-commitment-no-charge-we`. Those are separate slots — change them too if they should stay consistent._

---

## What this file cannot change

These are real requests — they just are not copy edits, so they go in the
`## Requests that need a developer` block instead:

- Adding or removing a section, page, service card, team member, FAQ question or review
- Changing photos, illustrations, colours, fonts, layout or animation
- Changing what a button does, where a link goes, or how the booking form works
- Anything about pricing logic, scheduling, or the admin dashboard

---

_Generated by `scripts/copy/extract-copy.mjs` on 2026-09-15. If the website code changes, regenerate this file rather than editing it by hand._
