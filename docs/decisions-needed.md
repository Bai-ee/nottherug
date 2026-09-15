# Decisions needed from the owner

One list. Everything else in this cleanup is either done or does not need a person.

Split into decisions that **block** verification and launch, and facts that need approval
but do not block engineering.

---

## Blocking

### 1. What host will serve the site?

`PUBLIC_BASE_URL` defaults to `https://nottherug.com`, but that domain is **not attached
to this Vercel project**. The project serves `nottherug-ten.vercel.app` and
`nottherug-baiees-projects.vercel.app`, and reports `live: false`.

So every canonical URL, the sitemap, and every OG image URL currently point at a host this
deployment does not answer for. Indexing cannot be verified until this is settled.

- **Attach `nottherug.com` to the project**, or
- **Set `PUBLIC_BASE_URL`** to whichever host will actually serve it.

### 2. Which Firebase project should the preview use?

A separate non-production project is strongly preferred. Otherwise test leads are written
to the real `leads` collection and test uploads to the real bucket, and they will be
indistinguishable from customer data afterwards.

### 3. An approved test recipient for notification email

Verification needs one address that is safe to email. No email will be sent anywhere until
this exists. The real founder address should not be used for test traffic.

### 4. Authorization for one paid brief generation

The brief pipeline has never run. Its routes declare a 60-second limit while a real run
makes at least five sequential model calls, several using web search. One authorized run
records its own `durationMs` and settles it. Until then, **scheduled generation stays
disabled** — `vercel.json` has an empty `crons` array.

### 5. Push access

44 commits are unpushed on `main`. Nothing can deploy until they reach the remote. Push
`main` directly, or open a branch and PR?

---

## Approval needed, not blocking

These are facts already published on the site. The full detail is in
[docs/launch-facts-review.md](launch-facts-review.md); this is the summary.

| # | Item | What is needed |
| --- | --- | --- |
| 6 | **"NAPPS Certified" and "NAPPS Member"** both appear. These are different claims. | Say which is accurate. The other is removed. |
| 7 | **Eight `instagram.com/placeholder` links** on every page hero, each with a dog handle (`@biscuit_bklyn` etc.). | Supply the real URL, or the badges go. |
| 8 | **Four Yelp reviews** published with names and "Williamsburg · Yelp" attribution, plus hard-coded five-star ratings. Staff are named inside the quotes. | Confirm they are genuine and that republishing them is agreed. |
| 9 | **Prices** ($33, $60, $35, $100/night) and an inconsistency where the same service reads "per walk" in one place and "/visit" in another. No sales-tax wording anywhere. | Approve or correct. |
| 10 | **Coverage area** offers Park Slope, Bed-Stuy and Bushwick in the booking form, against Williamsburg/Greenpoint positioning. | Confirm the real service area. |
| 11 | **Insurance, bonding, background checks, "professionally trained team", "respond within 2 hours on weekdays"** — the last appears in the form's success message. | Confirm each is currently true. |
| 12 | **Two copy changes** made during the route extraction: `/contact`'s hero, and a new contact sentence on `/services`. | Approve or reword. |
| 13 | **The public form invites "building access info"** in a free-text field, and the site says "your info stays private" with no privacy statement anywhere. | Recommend removing that invitation and publishing a short plain-language note. |
| 14 | **Founder brief email** is not scheduled. The default is one digest after a successful generation. | Confirm whether it should run, and when. |
| 15 | **Existing public download tokens** on already-published brief reports and photos were not revoked. Revoking breaks any link already shared. | Leave as-is, or revoke. |

---

## Explicitly not a decision

- **12.3 MB of unreferenced images** in `public/img`. No page requests them, so they cost
  nothing in page weight — only deploy upload size. Cleanup is optional and does not block
  launch.
- **Splitting `app/globals.css`**, deleting the disabled service-card carousel, and the
  welcome-modal proposal. All recorded as deferred work in the tracker.
