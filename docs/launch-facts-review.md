# Owner review: facts published on the site

Every claim below is already live in the current code. Nothing here was invented, and
nothing will be changed without an answer in the **Owner decision** column.

Extracted from `app/page.tsx` at the integration baseline (`711fbe1`).

## Pricing

| Service | Price shown | Where | Owner decision |
| --- | --- | --- | --- |
| Small group walk | $33 / visit | services, booking select | Approve / correct |
| Solo visit | $60 / visit | services, booking select | Approve / correct |
| Puppy visit | $35 / visit | services, booking select | Approve / correct |
| Senior dog visit | $35 / visit | services, booking select | Approve / correct |
| Cat / drop-in visit | $35 / visit | services | Approve / correct |
| Boarding, overnight sitting | $100 / night | services, booking select | Approve / correct |

The same service appears with two different unit labels in different sections
("per walk" vs "/visit"). Confirm which is correct so it reads the same everywhere.
No sales-tax wording appears anywhere on the site — confirm whether any is required.

## Contact and destinations

| Item | Current value | Owner decision |
| --- | --- | --- |
| Phone | (347) 610-9676 (`tel:+13476109676`) | Confirm this is the number to publish |
| Email | luis@nottherug.com | Confirm |
| Instagram (footer) | instagram.com/nottherug/ | Confirm |
| Instagram (8 page-hero labels) | **instagram.com/placeholder** — a dead link on every section hero | Supply the real URL, or these labels get removed |
| Dog handles in hero labels | @biscuit_bklyn, @mochi_wlmsbg, @scout_bklyn, @waffles_nyc, @pepper_bklyn, @beans_wlmsbg, @noodle_bklyn, @archie_bklyn | Confirm these are real accounts with permission, or they get removed |
| Calendly | `NEXT_PUBLIC_CALENDLY_URL` env var | Confirm the live scheduling link |
| Time To Pet | Referenced only by the fake booking buttons being removed | Supply a working URL to keep it, or it stays out |

## Credentials and guarantees

| Claim | Where | Owner decision |
| --- | --- | --- |
| "NAPPS Certified" **and** "NAPPS Member" | Two different badges on the site | These are different things. Confirm which is accurate; the other is removed |
| "Fully Insured & Bonded", "Comprehensive pet care liability insurance, fully bonded. Proof shared on request." | Safety, home | Confirm carrier/coverage is current |
| "Background Checked" / "Every member of our team undergoes a comprehensive background check before their first walk" | Safety, home | Confirm this holds for every current walker |
| "Professionally Trained Team" | Home | Confirm what the training is, so the claim is defensible |
| "We respond within 2 hours on weekdays" / "Typically reply within 2 hours" | Booking form, how-it-works, contact | Confirm this is a promise the business can keep. It appears on the form's success message |
| Founded 2011; Luis a Williamsburg resident since 2006; SiriusXM Program Director; Red Bull music strategy | About | Confirm |

## Reviews

Four reviews are published with full first name, last initial, and the attribution
"Williamsburg · Yelp": Jessica Y., Jayne A., Kassie T., and one more.

| Question | Owner decision |
| --- | --- |
| Are these verbatim quotes from real Yelp reviews? | Yes / No |
| Is republishing them on the site agreed? | Yes / No |
| Staff named inside review text (Reana, Nuria) — still current, still willing to be named? | Yes / No |

Star ratings are hard-coded as five stars with no source. Confirm or they become
unattributed quotes.

## Service area

"Williamsburg-based since 2011" is the positioning. The booking form's neighborhood
select offers: North Williamsburg, South Williamsburg, West Williamsburg, East
Williamsburg, Greenpoint, Bushwick, Bed-Stuy, Park Slope, Other.

Confirm the real coverage area. Park Slope in particular is well outside the
Williamsburg/Greenpoint positioning, and offering it in the form implies service there.

## Lead-form data handling

The form invites "building access info" in its free-text notes field, and the site
tells customers "your info stays private". There is no privacy statement anywhere
explaining what is actually collected or how long it is kept.

| Question | Owner decision |
| --- | --- |
| Remove the door/access-code invitation from the public form? | Recommended: yes — collect access details after the meet & greet, not in a public web form |
| Publish a short plain-language note on what is collected and who sees it? | Recommended: yes |


## Copy changes made during the route extraction (need sign-off)

These are the only two places where visible copy changed while the site was being
split into real routes. Everything else was moved verbatim.

| Page | What changed | Why | Owner decision |
| --- | --- | --- | --- |
| `/contact` hero | Was "Book your free Meet & Greet" (a duplicate of `/book`'s hero). Now "We're real people with a real number / No chatbots, no ticket queues…" | That second headline was already live on the old `?page=contact` view. The standalone `/contact` route had the wrong hero pasted in. The two views are now one page and could not keep both. | Approve / restore the old hero |
| `/services` | New sentence where the fake "Book a Service" / "Ask a Question" tabs used to be: "Already a client, or have a quick question first? Call or text (347) 610-9676, email luis@nottherug.com, or visit our contact page." | The removed tabs were mock forms that alerted a fake success. Something had to tell an existing client where to go. The phone and email are the ones already published in the footer — nothing new was invented. | Approve / reword |

`/contact` also gained the real contact card (phone, email, address, hours, Instagram).
That block was already written and live on `?page=contact`; the standalone route just
never showed it.

## How these get closed

Answer in place, or reply with corrections. Unanswered rows stay open on the launch
gate — they are not filled in with assumptions.
