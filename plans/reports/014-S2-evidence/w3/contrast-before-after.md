# S2/W3 contrast before -> after

Rows = elements that failed before or after (mean-pixel ratio; p5 = 5th-percentile pixel ratio). Method: text hidden (inline !important transparent, transition none), real rendered pixels under each text rect sampled, ratio = blended fg vs mean bg. Required: 4.5 body, 3 large (>=24px, or >=18.66px bold). Disabled controls excluded.

Scanned (rows): before 1687, after 1688; unique element keys 1633.
Failing (all rows): before 586, after 70. Failing (unique keys, worst case): before 563, after 46.

| route | vp | selector | text | size/wt | fg alpha b->a | ratio b->a | p5 b->a | req | before | after |
|---|---|---|---|---|---|---|---|---|---|---|
| / | 1440 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.51 -> 4.94 | 3.45 -> 4.85 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > a | The Team | 14/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > a | Safety & Trust | 14/400 | 0.8 -> 0.92 | 3.75 -> 4.93 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > a | Instagram | 14/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.65 -> 4.84 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > a | How It Works | 14/400 | 0.8 -> 0.92 | 3.74 -> 4.93 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > a | Sign Up | 14/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 14/400 | 0.8 -> 0.92 | 3.93 -> 5.13 | 3.77 -> 4.91 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 14/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 14/400 | 0.8 -> 0.92 | 4.06 -> 5.26 | 3.71 -> 4.91 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.18 -> 5.01 | 3.14 -> 4.91 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.26 -> 5.12 | 3.12 -> 4.91 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.26 -> 5.12 | 3.16 -> 4.98 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.3 -> 5.17 | 3.15 -> 4.98 | 4.5 | FAIL | pass |
| / | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.29 -> 5.43 | 3.97 -> 5.11 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 14/400 | 0.8 -> 0.92 | 3.77 -> 4.98 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 14/400 | 0.8 -> 0.92 | 3.76 -> 4.97 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 14/400 | 0.8 -> 0.92 | 3.77 -> 4.98 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 1440 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 14/400 | 0.8 -> 0.92 | 3.79 -> 4.99 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 1440 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 3.77 -> 5.08 | 3.58 -> 4.84 | 4.5 | FAIL | pass |
| / | 1440 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.36 -> 4.82 | 3.28 -> 4.72 | 4.5 | FAIL | pass |
| / | 1440 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.38 -> 4.84 | 3.31 -> 4.72 | 4.5 | FAIL | pass |
| / | 1440 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.38 -> 4.83 | 3.31 -> 4.72 | 4.5 | FAIL | pass |
| / | 1440 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.46 -> 5.39 | 3.18 -> 5.03 | 4.5 | FAIL | pass |
| / | 1440 | #home-always-included-grid > div.home-included-item > p | Live route map sent after every walk so  | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | #home-always-included-grid > div.home-included-item > p | Post-walk update with photos, mood notes | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | #home-always-included-grid > div.home-included-item > p | Text or call your walker directly — no s | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | #home-always-included-grid > div.home-included-item > p | Our signature dual collar-and-harness me | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | div > div > p | Comprehensive pet care liability insuran | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | div > div > p | We carefully vet every walker before the | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.2 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | div > div > p | A post-walk route map showing exactly wh | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.18 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | div > div > p | We connect our leash to both their colla | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.73 | 3.18 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | #home-closing-williamsburg-pitch > #home-closing-parks-row > #home-closing-parks-label | Parks We Walk | 12/500 | 1 -> 1 | 3.91 -> 5.18 | 3.83 -> 5.06 | 4.5 | FAIL | pass |
| / | 1440 | #home-closing-williamsburg-pitch > #home-closing-parks-row > #home-closing-parks-note | Our home neighborhood since 2011 | 13/400 | 0.7 -> 0.92 | 3.27 -> 4.75 | 3.2 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | div.container > #home-always-included > #home-always-included-lead | Experienced walkers who get to know your | 18/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | McCarren Park | 13/500 | 1 -> 1 | 3.96 -> 4.51 | 3.9 -> 4.43 | 4.5 | FAIL | pass |
| / | 1440 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | Bushwick Inlet Park | 13/500 | 1 -> 1 | 3.98 -> 4.54 | 3.87 -> 4.43 | 4.5 | FAIL | pass |
| / | 1440 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | Domino Park | 13/500 | 1 -> 1 | 3.95 -> 4.51 | 3.85 -> 4.43 | 4.5 | FAIL | pass |
| / | 1440 | #hero-stats-strip > #hero-stat-google > div.hero-stat-label | Google | 11/500 | 0.62 -> 0.74 | 4.43 -> 5.56 | 4.35 -> 5.47 | 4.5 | FAIL | pass |
| / | 1440 | #hero-stats-strip > #hero-stat-reddit > div.hero-stat-label | Upvotes | 11/500 | 0.62 -> 0.74 | 4.44 -> 5.57 | 4.35 -> 5.47 | 4.5 | FAIL | pass |
| / | 1440 | #hero-stats-strip > #hero-stat-years > div.hero-stat-label | Years in | 11/500 | 0.62 -> 0.74 | 4.43 -> 5.56 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 1440 | #hero-stats-strip > #hero-stat-yelp > div.hero-stat-label | Yelp | 11/500 | 0.62 -> 0.74 | 4.41 -> 5.54 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 1440 | div.container > #home-instagram-header > div.stamp-label | Roll 02 · Instagram | 12/500 | 1 -> 1 | 3.9 -> 5.16 | 3.83 -> 5.06 | 4.5 | FAIL | pass |
| / | 1440 | div.nav-inner > #nav-bar-links > #nav-contact-us-trigger | Contact | 13.5/500 | 0.7 -> 0.9 | 4.29 -> 5.86 | 4.29 -> 5.86 | 4.5 | FAIL | pass |
| / | 1440 | div.nav-inner > #nav-bar-links > a | Services | 13.5/500 | 0.7 -> 0.9 | 4.29 -> 5.86 | 4.29 -> 5.86 | 4.5 | FAIL | pass |
| / | 1440 | div.nav-inner > #nav-bar-links > a | About | 13.5/500 | 0.7 -> 0.9 | 4.29 -> 5.86 | 4.29 -> 5.86 | 4.5 | FAIL | pass |
| / | 1440 | div.nav-inner > #nav-bar-links > a | Reviews | 13.5/500 | 0.7 -> 0.9 | 4.29 -> 5.86 | 4.29 -> 5.86 | 4.5 | FAIL | pass |
| / | 1440 | div.nav-inner > #nav-bar-links > a | Join Our Team | 13.5/500 | 0.7 -> 0.9 | 4.29 -> 5.86 | 4.29 -> 5.86 | 4.5 | FAIL | pass |
| / | 1440 | #home-closing-trust-grid > #home-closing-williamsburg-pitch > p | We know every park, shortcut, and puddle | 16/400 | 0.7 -> 0.92 | 3.29 -> 4.78 | 3.2 -> 4.64 | 4.5 | FAIL | pass |
| / | 1440 | #home-featured-reviews-grid > figure.review-card > div.stars | ★★★★★ | 14/400 | 1 -> 1 | 1.8 -> 3.25 | 1.59 -> 2.86 | 4.5 | FAIL | FAIL |
| / | 1440 | #home-featured-reviews-grid > figure.review-card > div.stars | 8 upvotes · Reddit | 14/600 | 1 -> 1 | 1.69 -> 5.23 | 1.5 -> 4.65 | 4.5 | FAIL | pass |
| / | 1440 | #home-team-block > div.home-band-block-header > div.stamp-label | NTR 01 · The Team | 12/500 | 1 -> 1 | 4.2 -> 5.1 | 4.04 -> 4.9 | 4.5 | FAIL | pass |
| / | 390 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.52 -> 4.96 | 3.45 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 390 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.96 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 390 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 3.78 -> 4.99 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 3.74 -> 4.93 | 3.66 -> 4.85 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.93 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.18 -> 4.99 | 3.14 -> 4.91 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.19 -> 5.01 | 3.13 -> 4.91 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.19 -> 5.01 | 3.13 -> 4.91 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.19 -> 5.02 | 3.13 -> 4.91 | 4.5 | FAIL | pass |
| / | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.01 -> 5.15 | 3.94 -> 5.04 | 4.5 | FAIL | pass |
| / | 390 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.65 -> 4.85 | 4.5 | FAIL | pass |
| / | 390 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 3.69 -> 4.99 | 3.59 -> 4.84 | 4.5 | FAIL | pass |
| / | 390 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.82 | 3.31 -> 4.72 | 4.5 | FAIL | pass |
| / | 390 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.82 | 3.31 -> 4.72 | 4.5 | FAIL | pass |
| / | 390 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.82 | 3.31 -> 4.72 | 4.5 | FAIL | pass |
| / | 390 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.11 -> 4.72 | 1.23 -> 1.11 | 4.5 | FAIL | pass |
| / | 390 | #home-always-included-grid > div.home-included-item > p | Live route map sent after every walk so  | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | #home-always-included-grid > div.home-included-item > p | Post-walk update with photos, mood notes | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.73 | 3.18 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | #home-always-included-grid > div.home-included-item > p | Our signature dual collar-and-harness me | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.73 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | #home-always-included-grid > div.home-included-item > p | Text or call your walker directly — no s | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | div > div > p | Comprehensive pet care liability insuran | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.73 | 3.17 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | div > div > p | We carefully vet every walker before the | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | div > div > p | A post-walk route map showing exactly wh | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.73 | 3.22 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | div > div > p | We connect our leash to both their colla | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.73 | 3.17 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | #home-closing-williamsburg-pitch > #home-closing-parks-row > #home-closing-parks-label | Parks We Walk | 12/500 | 1 -> 1 | 3.91 -> 5.17 | 3.79 -> 5.05 | 4.5 | FAIL | pass |
| / | 390 | #home-closing-williamsburg-pitch > #home-closing-parks-row > #home-closing-parks-note | Our home neighborhood since 2011 | 13/400 | 0.7 -> 0.92 | 3.27 -> 4.75 | 3.2 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | div.container > #home-always-included > #home-always-included-lead | Experienced walkers who get to know your | 15/400 | 0.7 -> 0.92 | 3.25 -> 4.74 | 3.17 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | McCarren Park | 13/500 | 1 -> 1 | 3.99 -> 4.55 | 3.86 -> 4.43 | 4.5 | FAIL | pass |
| / | 390 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | Bushwick Inlet Park | 13/500 | 1 -> 1 | 3.96 -> 4.51 | 3.9 -> 4.43 | 4.5 | FAIL | pass |
| / | 390 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | Domino Park | 13/500 | 1 -> 1 | 3.98 -> 4.54 | 3.9 -> 4.43 | 4.5 | FAIL | pass |
| / | 390 | #hero-stats-strip > #hero-stat-google > div.hero-stat-label | Google | 9/500 | 0.62 -> 0.74 | 4.41 -> 5.54 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 390 | #hero-stats-strip > #hero-stat-reddit > div.hero-stat-label | Upvotes | 9/500 | 0.62 -> 0.74 | 4.43 -> 5.56 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 390 | #hero-stats-strip > #hero-stat-years > div.hero-stat-label | Years in | 9/500 | 0.62 -> 0.74 | 4.41 -> 5.54 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 390 | #hero-stats-strip > #hero-stat-yelp > div.hero-stat-label | Yelp | 9/500 | 0.62 -> 0.74 | 4.42 -> 5.54 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 390 | div.container > #home-instagram-header > div.stamp-label | Roll 02 · Instagram | 12/500 | 1 -> 1 | 3.88 -> 5.15 | 3.79 -> 5.05 | 4.5 | FAIL | pass |
| / | 390 | #proof-track > div.proof-item > div.stars | ★★★★★ | 14/400 | 1 -> 1 | 1.99 -> 3.58 | 1.99 -> 3.58 | 4.5 | FAIL | FAIL |
| / | 390 | #home-closing-trust-grid > #home-closing-williamsburg-pitch > p | We know every park, shortcut, and puddle | 16/400 | 0.7 -> 0.92 | 3.27 -> 4.75 | 3.2 -> 4.64 | 4.5 | FAIL | pass |
| / | 390 | #home-featured-reviews-grid > figure.review-card > div.stars | 8 upvotes · Reddit | 14/600 | 1 -> 1 | 1.7 -> 5.26 | 1.5 -> 4.65 | 4.5 | FAIL | pass |
| / | 390 | #home-team-block > div.home-band-block-header > div.stamp-label | NTR 01 · The Team | 12/500 | 1 -> 1 | 4.08 -> 4.96 | 3.98 -> 4.83 | 4.5 | FAIL | pass |
| / | 768 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.52 -> 4.96 | 3.45 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 3.74 -> 4.93 | 3.66 -> 4.85 | 4.5 | FAIL | pass |
| / | 768 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.96 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.96 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.93 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.96 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.2 -> 5.03 | 3.13 -> 4.91 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.18 -> 5 | 3.14 -> 4.91 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.18 -> 5 | 3.14 -> 4.91 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.19 -> 5.01 | 3.14 -> 4.91 | 4.5 | FAIL | pass |
| / | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.16 -> 5.3 | 3.93 -> 5.04 | 4.5 | FAIL | pass |
| / | 768 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 768 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.93 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 768 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.94 | 3.69 -> 4.85 | 4.5 | FAIL | pass |
| / | 768 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.95 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 3.66 -> 4.96 | 3.59 -> 4.84 | 4.5 | FAIL | pass |
| / | 768 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.35 -> 4.8 | 3.28 -> 4.72 | 4.5 | FAIL | pass |
| / | 768 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.82 | 3.31 -> 4.72 | 4.5 | FAIL | pass |
| / | 768 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.36 -> 4.79 | 3.32 -> 4.72 | 4.5 | FAIL | pass |
| / | 768 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.43 -> 5.35 | 3.19 -> 5.03 | 4.5 | FAIL | pass |
| / | 768 | #home-always-included-grid > div.home-included-item > p | Live route map sent after every walk so  | 12/400 | 0.7 -> 0.92 | 3.23 -> 4.68 | 3.19 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | #home-always-included-grid > div.home-included-item > p | Post-walk update with photos, mood notes | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | #home-always-included-grid > div.home-included-item > p | Our signature dual collar-and-harness me | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | #home-always-included-grid > div.home-included-item > p | Text or call your walker directly — no s | 12/400 | 0.7 -> 0.92 | 3.26 -> 4.73 | 3.17 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | div > div > p | Comprehensive pet care liability insuran | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.17 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | div > div > p | We carefully vet every walker before the | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | div > div > p | A post-walk route map showing exactly wh | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | div > div > p | We connect our leash to both their colla | 16/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.21 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | #home-closing-williamsburg-pitch > #home-closing-cta-row > #home-closing-book-luis-cta | Book a Meet & Greet | 14/500 | 1 -> 1 | 4.11 -> 4.11 | 1 -> 1 | 4.5 | FAIL | FAIL |
| / | 768 | #home-closing-williamsburg-pitch > #home-closing-parks-row > #home-closing-parks-label | Parks We Walk | 12/500 | 1 -> 1 | 3.97 -> 5.24 | 3.83 -> 5.06 | 4.5 | FAIL | pass |
| / | 768 | #home-closing-williamsburg-pitch > #home-closing-parks-row > #home-closing-parks-note | Our home neighborhood since 2011 | 13/400 | 0.7 -> 0.92 | 3.3 -> 4.79 | 3.16 -> 4.63 | 4.5 | FAIL | pass |
| / | 768 | div.container > #home-always-included > #home-always-included-lead | Experienced walkers who get to know your | 15/400 | 0.7 -> 0.92 | 3.26 -> 4.74 | 3.2 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | McCarren Park | 13/500 | 1 -> 1 | 4.04 -> 4.6 | 3.85 -> 4.43 | 4.5 | FAIL | pass |
| / | 768 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | Bushwick Inlet Park | 13/500 | 1 -> 1 | 4 -> 4.55 | 3.87 -> 4.43 | 4.5 | FAIL | pass |
| / | 768 | #home-closing-parks-row > #home-closing-parks-list > span.trust-park-tag | Domino Park | 13/500 | 1 -> 1 | 3.97 -> 4.53 | 3.9 -> 4.43 | 4.5 | FAIL | pass |
| / | 768 | #hero-stats-strip > #hero-stat-google > div.hero-stat-label | Google | 9/500 | 0.62 -> 0.74 | 4.42 -> 5.55 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 768 | #hero-stats-strip > #hero-stat-reddit > div.hero-stat-label | Upvotes | 9/500 | 0.62 -> 0.74 | 4.42 -> 5.55 | 4.36 -> 5.47 | 4.5 | FAIL | pass |
| / | 768 | #hero-stats-strip > #hero-stat-years > div.hero-stat-label | Years in | 9/500 | 0.62 -> 0.74 | 4.43 -> 5.57 | 4.35 -> 5.47 | 4.5 | FAIL | pass |
| / | 768 | #hero-stats-strip > #hero-stat-yelp > div.hero-stat-label | Yelp | 9/500 | 0.62 -> 0.74 | 4.41 -> 5.53 | 4.36 -> 5.48 | 4.5 | FAIL | pass |
| / | 768 | div.container > #home-instagram-header > div.stamp-label | Roll 02 · Instagram | 12/500 | 1 -> 1 | 3.88 -> 5.16 | 3.79 -> 5.05 | 4.5 | FAIL | pass |
| / | 768 | #home-closing-trust-grid > #home-closing-williamsburg-pitch > p | We know every park, shortcut, and puddle | 16/400 | 0.7 -> 0.92 | 3.28 -> 4.77 | 3.17 -> 4.64 | 4.5 | FAIL | pass |
| / | 768 | #home-featured-reviews-grid > figure.review-card > div.stars | 8 upvotes · Reddit | 14/600 | 1 -> 1 | 1.7 -> 5.27 | 1.5 -> 4.65 | 4.5 | FAIL | pass |
| / | 768 | #home-featured-reviews-grid > figure.review-card > div.stars | ★★★★★ | 14/400 | 1 -> 1 | 1.82 -> 3.27 | 1.59 -> 2.86 | 4.5 | FAIL | FAIL |
| / | 768 | #home-team-block > div.home-band-block-header > div.stamp-label | NTR 01 · The Team | 12/500 | 1 -> 1 | 4.11 -> 4.99 | 3.98 -> 4.83 | 4.5 | FAIL | pass |
| /about | 1440 | #about-hero-section > div.container > div.label | Our Story | 15/300 | 1 -> 1 | 3.51 -> 4.95 | 3.17 -> 4.47 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 4.02 -> 5.36 | 3.74 -> 5.03 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > a | The Team | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > a | Safety & Trust | 14/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > a | Instagram | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > a | How It Works | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > a | Sign Up | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 14/400 | 0.8 -> 0.92 | 4.22 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /about | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 1440 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 14/400 | 0.8 -> 0.92 | 4.21 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /about | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.53 -> 5.31 | 3.39 -> 5.12 | 4.5 | FAIL | pass |
| /about | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.56 -> 5.36 | 3.43 -> 5.18 | 4.5 | FAIL | pass |
| /about | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.64 -> 5.48 | 3.41 -> 5.17 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 1440 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 1440 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4.06 -> 5.2 | 3.88 -> 5.04 | 4.5 | FAIL | pass |
| /about | 1440 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.64 -> 4.98 | 3.58 -> 4.9 | 4.5 | FAIL | pass |
| /about | 1440 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /about | 1440 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.68 -> 5 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /about | 1440 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.7 -> 5.55 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /about | 1440 | div.values-grid > div.value-cell > div.value-num | 01 | 48/400 | 1 -> 1 | 1.31 -> 1.31 | 1.31 -> 1.31 | 3 | FAIL | FAIL |
| /about | 1440 | div.values-grid > div.value-cell > div.value-num | 02 | 48/400 | 1 -> 1 | 1.25 -> 1.25 | 1.25 -> 1.25 | 3 | FAIL | FAIL |
| /about | 1440 | div.values-grid > div.value-cell > div.value-num | 03 | 48/400 | 1 -> 1 | 1.25 -> 1.25 | 1.25 -> 1.25 | 3 | FAIL | FAIL |
| /about | 1440 | div.values-grid > div.value-cell > div.value-num | 04 | 48/400 | 1 -> 1 | 1.31 -> 1.31 | 1.31 -> 1.31 | 3 | FAIL | FAIL |
| /about | 1440 | div.team-card > div.team-info > div.team-role | Founder | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 1440 | div.team-card > div.team-info > div.team-role | Manager | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 1440 | div.team-card > div.team-info > div.team-role | Sr Walker | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 1440 | div.team-card > div.team-info > div.team-role | Walker | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.83 -> 5.13 | 3.73 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.15 | 4 -> 5.06 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.44 -> 5.18 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.41 -> 5.34 | 4.29 -> 5.24 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 4.09 -> 5.11 | 4.01 -> 4.98 | 4.5 | FAIL | pass |
| /about | 390 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4.03 -> 5.17 | 3.89 -> 5.04 | 4.5 | FAIL | pass |
| /about | 390 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.68 -> 5.01 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /about | 390 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /about | 390 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.67 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /about | 390 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.32 -> 4.85 | 1.25 -> 1.11 | 4.5 | FAIL | pass |
| /about | 390 | div.values-grid > div.value-cell > div.value-num | 01 | 48/400 | 1 -> 1 | 1.31 -> 1.31 | 1.31 -> 1.31 | 3 | FAIL | FAIL |
| /about | 390 | div.values-grid > div.value-cell > div.value-num | 02 | 48/400 | 1 -> 1 | 1.25 -> 1.25 | 1.25 -> 1.25 | 3 | FAIL | FAIL |
| /about | 390 | div.values-grid > div.value-cell > div.value-num | 03 | 48/400 | 1 -> 1 | 1.25 -> 1.25 | 1.25 -> 1.25 | 3 | FAIL | FAIL |
| /about | 390 | div.values-grid > div.value-cell > div.value-num | 04 | 48/400 | 1 -> 1 | 1.31 -> 1.31 | 1.31 -> 1.31 | 3 | FAIL | FAIL |
| /about | 390 | div.team-card > div.team-info > div.team-role | Founder | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 390 | div.team-card > div.team-info > div.team-role | Manager | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 390 | div.team-card > div.team-info > div.team-role | Sr Walker | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 390 | div.team-card > div.team-info > div.team-role | Walker | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.96 -> 5.29 | 3.75 -> 5.05 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.14 -> 5.15 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /about | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 768 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.44 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.21 | 3.37 -> 5.12 | 4.5 | FAIL | pass |
| /about | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.05 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.15 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /about | 768 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.12 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /about | 768 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4 -> 5.14 | 3.89 -> 5.04 | 4.5 | FAIL | pass |
| /about | 768 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.57 -> 4.92 | 4.5 | FAIL | pass |
| /about | 768 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /about | 768 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /about | 768 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.67 -> 5.5 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /about | 768 | div.values-grid > div.value-cell > div.value-num | 01 | 48/400 | 1 -> 1 | 1.31 -> 1.31 | 1.31 -> 1.31 | 3 | FAIL | FAIL |
| /about | 768 | div.values-grid > div.value-cell > div.value-num | 02 | 48/400 | 1 -> 1 | 1.25 -> 1.25 | 1.25 -> 1.25 | 3 | FAIL | FAIL |
| /about | 768 | div.values-grid > div.value-cell > div.value-num | 03 | 48/400 | 1 -> 1 | 1.25 -> 1.25 | 1.25 -> 1.25 | 3 | FAIL | FAIL |
| /about | 768 | div.values-grid > div.value-cell > div.value-num | 04 | 48/400 | 1 -> 1 | 1.31 -> 1.31 | 1.31 -> 1.31 | 3 | FAIL | FAIL |
| /about | 768 | div.team-card > div.team-info > div.team-role | Founder | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 768 | div.team-card > div.team-info > div.team-role | Manager | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /about | 768 | div.team-card > div.team-info > div.team-role | Sr Walker | 13/500 | 1 -> 1 | 2.87 -> 4.53 | 2.43 -> 3.58 | 4.5 | FAIL | pass |
| /about | 768 | div.team-card > div.team-info > div.team-role | Walker | 13/500 | 1 -> 1 | 3.1 -> 4.89 | 3.1 -> 4.89 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 4.02 -> 5.36 | 3.74 -> 5.03 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > a | The Team | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > a | Safety & Trust | 14/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > a | Instagram | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > a | How It Works | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > a | Sign Up | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 14/400 | 0.8 -> 0.92 | 4.22 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 14/400 | 0.8 -> 0.92 | 4.21 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.53 -> 5.31 | 3.39 -> 5.12 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.56 -> 5.36 | 3.43 -> 5.18 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.64 -> 5.48 | 3.41 -> 5.17 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4.06 -> 5.2 | 3.88 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.64 -> 4.98 | 3.58 -> 4.9 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.68 -> 5 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.7 -> 5.55 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | div.hood-card-overlay > div.hood-card-label > div.hood-card-desc | Our home since 2011 | 13/400 | 0.8 -> 0.8 | 2.9 -> 4.71 | 2.89 -> 4.6 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | #neighborhoods-williamsburg-hero-section > div.container > div.label | Service Areas | 15/300 | 1 -> 1 | 3.57 -> 5.04 | 3.12 -> 4.4 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 1440 | div > h2 > span | Williamsburg | 50.4/400 | 1 -> 1 | 2.24 -> 2.24 | 1.99 -> 1.99 | 3 | FAIL | FAIL |
| /neighborhoods/williamsburg | 390 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.83 -> 5.13 | 3.73 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.15 | 4 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.44 -> 5.18 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.41 -> 5.34 | 4.29 -> 5.24 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 4.09 -> 5.11 | 4.01 -> 4.98 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 3.9 -> 4.98 | 3.91 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.68 -> 5.01 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.67 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.32 -> 4.85 | 1.25 -> 1.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div.hood-card-overlay > div.hood-card-label > div.hood-card-desc | Our home since 2011 | 12/400 | 0.8 -> 0.8 | 2.9 -> 4.79 | 2.89 -> 4.67 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div.hood-card-overlay > div.hood-card-label > div.hood-card-name | Williamsburg | 16.77/400 | 1 -> 1 | 3.57 -> 5.9 | 3.56 -> 5.69 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 390 | div > h2 > span | Williamsburg | 32/400 | 1 -> 1 | 2.24 -> 2.24 | 1.99 -> 1.99 | 3 | FAIL | FAIL |
| /neighborhoods/williamsburg | 768 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.94 -> 5.26 | 3.75 -> 5.05 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.15 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.44 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.05 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4 -> 5.14 | 3.89 -> 5.04 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.57 -> 4.92 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.67 -> 5.5 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div.hood-card-overlay > div.hood-card-label > div.hood-card-desc | Our home since 2011 | 12/400 | 0.8 -> 0.8 | 2.89 -> 4.99 | 2.89 -> 4.92 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div.hood-card-overlay > div.hood-card-label > div.hood-card-name | Williamsburg | 22/400 | 1 -> 1 | 3.57 -> 6.4 | 3.56 -> 6.28 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | #neighborhoods-williamsburg-hero-section > div.container > div.label | Service Areas | 15/300 | 1 -> 1 | 4.49 -> 6.34 | 3.01 -> 4.25 | 4.5 | FAIL | pass |
| /neighborhoods/williamsburg | 768 | div > h2 > span | Williamsburg | 32/400 | 1 -> 1 | 2.24 -> 2.24 | 1.99 -> 1.99 | 3 | FAIL | FAIL |
| /reviews | 1440 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 4.02 -> 5.36 | 3.74 -> 5.03 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > a | The Team | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > a | Safety & Trust | 14/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > a | Instagram | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > a | How It Works | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > a | Sign Up | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 14/400 | 0.8 -> 0.92 | 4.22 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 1440 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 14/400 | 0.8 -> 0.92 | 4.21 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.53 -> 5.31 | 3.39 -> 5.12 | 4.5 | FAIL | pass |
| /reviews | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.56 -> 5.36 | 3.43 -> 5.18 | 4.5 | FAIL | pass |
| /reviews | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.64 -> 5.48 | 3.41 -> 5.17 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 1440 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4.06 -> 5.2 | 3.88 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.64 -> 4.98 | 3.58 -> 4.9 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.68 -> 5 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.7 -> 5.54 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.reviews-hero-stats > #reviews-hero-google-rating > div.review-source-label | Google Rating · | 13/400 | 0.5 -> 0.85 | 2.9 -> 5.14 | 2.8 -> 4.96 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.reviews-hero-stats > #reviews-hero-google-rating > div.stars | ★★★★★ | 20/400 | 1 -> 1 | 1.88 -> 1.56 | 1.75 -> 1.45 | 4.5 | FAIL | FAIL |
| /reviews | 1440 | div.reviews-hero-stats > #reviews-hero-yelp-rating > div.review-source-label | Yelp Rating · | 13/400 | 0.5 -> 0.85 | 3.33 -> 6.28 | 2.1 -> 3.97 | 4.5 | FAIL | pass |
| /reviews | 1440 | div.reviews-masonry > div.review-card > div.review-mark | " | 48/400 | 0.07 -> 0.07 | 1.17 -> 1.17 | 1.06 -> 1.04 | 3 | FAIL | FAIL |
| /reviews | 1440 | div.review-author > div.review-avatar > div.review-avatar-ph | ZD | 15/700 | 1 -> 1 | 2.41 -> 2.41 | 2.19 -> 2.19 | 4.5 | FAIL | FAIL |
| /reviews | 1440 | div.review-author > div.review-avatar > div.review-avatar-ph | JY | 15/700 | 1 -> 1 | 2.41 -> 2.41 | 2.18 -> 2.18 | 4.5 | FAIL | FAIL |
| /reviews | 1440 | div.review-author > div.review-avatar > div.review-avatar-ph | HM | 15/700 | 1 -> 1 | 2.43 -> 2.43 | 2.19 -> 2.19 | 4.5 | FAIL | FAIL |
| /reviews | 1440 | div.review-author > div.review-avatar > div.review-avatar-ph | KT | 15/700 | 1 -> 1 | 2.43 -> 2.43 | 2.19 -> 2.19 | 4.5 | FAIL | FAIL |
| /reviews | 1440 | div.review-author > div.review-avatar > div.review-avatar-ph | JA | 15/700 | 1 -> 1 | 2.4 -> 2.4 | 2.17 -> 2.17 | 4.5 | FAIL | FAIL |
| /reviews | 390 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.83 -> 5.13 | 3.73 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.15 | 4 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.21 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.41 -> 5.34 | 4.29 -> 5.24 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 2.58 -> 3 | 1.03 -> 1.09 | 4.5 | FAIL | FAIL |
| /reviews | 390 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4.02 -> 5.17 | 3.89 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 390 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.68 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /reviews | 390 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /reviews | 390 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.67 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /reviews | 390 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.32 -> 4.85 | 1.25 -> 1.11 | 4.5 | FAIL | pass |
| /reviews | 390 | div.reviews-hero-stats > #reviews-hero-google-rating > div.review-source-label | Google Rating · | 13/400 | 0.5 -> 0.85 | 4.43 -> 9.61 | 3.52 -> 7.64 | 4.5 | FAIL | pass |
| /reviews | 390 | div.reviews-hero-stats > #reviews-hero-yelp-rating > div.review-source-label | Yelp Rating · | 13/400 | 0.5 -> 0.85 | 4.02 -> 8.29 | 3.14 -> 6.46 | 4.5 | FAIL | pass |
| /reviews | 390 | div.reviews-hero-stats > #reviews-hero-yelp-rating > div.stars | ★★★★★ | 20/400 | 1 -> 1 | 6.21 -> 3.44 | 4.42 -> 2.45 | 4.5 | pass | FAIL |
| /reviews | 390 | div.reviews-hero-stats > div > div.review-source-label | Years of 5-star service | 13/400 | 0.5 -> 0.85 | 3.53 -> 6.83 | 2.11 -> 4.08 | 4.5 | FAIL | pass |
| /reviews | 390 | div.reviews-masonry > div.review-card > div.review-mark | " | 48/400 | 0.07 -> 0.07 | 1.17 -> 1.17 | 1.02 -> 1.02 | 3 | FAIL | FAIL |
| /reviews | 390 | div.review-author > div.review-avatar > div.review-avatar-ph | ZD | 15/700 | 1 -> 1 | 2.38 -> 2.38 | 2.17 -> 2.17 | 4.5 | FAIL | FAIL |
| /reviews | 390 | div.review-author > div.review-avatar > div.review-avatar-ph | JY | 15/700 | 1 -> 1 | 2.41 -> 2.41 | 2.19 -> 2.19 | 4.5 | FAIL | FAIL |
| /reviews | 390 | div.review-author > div.review-avatar > div.review-avatar-ph | HM | 15/700 | 1 -> 1 | 2.28 -> 2.28 | 1.18 -> 1.18 | 4.5 | FAIL | FAIL |
| /reviews | 390 | div.review-author > div.review-avatar > div.review-avatar-ph | JA | 15/700 | 1 -> 1 | 2.42 -> 2.42 | 2.19 -> 2.19 | 4.5 | FAIL | FAIL |
| /reviews | 390 | div.review-author > div.review-avatar > div.review-avatar-ph | KT | 15/700 | 1 -> 1 | 2.41 -> 2.41 | 2.18 -> 2.18 | 4.5 | FAIL | FAIL |
| /reviews | 768 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.94 -> 5.26 | 3.75 -> 5.05 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.14 -> 5.15 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /reviews | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 768 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.44 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.21 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.21 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.15 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 768 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.12 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /reviews | 768 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4 -> 5.14 | 3.89 -> 5.04 | 4.5 | FAIL | pass |
| /reviews | 768 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.57 -> 4.92 | 4.5 | FAIL | pass |
| /reviews | 768 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /reviews | 768 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.68 -> 5 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /reviews | 768 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.68 -> 5.51 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /reviews | 768 | div.reviews-hero-stats > #reviews-hero-google-rating > div.review-source-label | Google Rating · | 13/400 | 0.5 -> 0.85 | 3.18 -> 5.88 | 2.25 -> 4.16 | 4.5 | FAIL | pass |
| /reviews | 768 | div.reviews-hero-stats > #reviews-hero-google-rating > div.stars | ★★★★★ | 20/400 | 1 -> 1 | 3.09 -> 1.72 | 2.18 -> 1.21 | 4.5 | FAIL | FAIL |
| /reviews | 768 | div.reviews-hero-stats > #reviews-hero-yelp-rating > div.review-source-label | Yelp Rating · | 13/400 | 0.5 -> 0.85 | 2.85 -> 5 | 2.19 -> 3.85 | 4.5 | FAIL | pass |
| /reviews | 768 | div.reviews-masonry > div.review-card > div.review-mark | " | 48/400 | 0.07 -> 0.07 | 1.17 -> 1.17 | 1.04 -> 1.04 | 3 | FAIL | FAIL |
| /reviews | 768 | div.review-author > div.review-avatar > div.review-avatar-ph | ZD | 15/700 | 1 -> 1 | 2.41 -> 2.41 | 2.19 -> 2.19 | 4.5 | FAIL | FAIL |
| /reviews | 768 | div.review-author > div.review-avatar > div.review-avatar-ph | JY | 15/700 | 1 -> 1 | 2.41 -> 2.41 | 2.19 -> 2.19 | 4.5 | FAIL | FAIL |
| /reviews | 768 | div.review-author > div.review-avatar > div.review-avatar-ph | HM | 15/700 | 1 -> 1 | 2.45 -> 2.45 | 2.21 -> 2.21 | 4.5 | FAIL | FAIL |
| /reviews | 768 | div.review-author > div.review-avatar > div.review-avatar-ph | JA | 15/700 | 1 -> 1 | 2.43 -> 2.43 | 2.21 -> 2.21 | 4.5 | FAIL | FAIL |
| /reviews | 768 | div.review-author > div.review-avatar > div.review-avatar-ph | KT | 15/700 | 1 -> 1 | 2.41 -> 2.41 | 2.18 -> 2.18 | 4.5 | FAIL | FAIL |
| /safety | 1440 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 4.02 -> 5.36 | 3.74 -> 5.03 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > a | The Team | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > a | Safety & Trust | 14/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > a | Instagram | 14/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > a | How It Works | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > a | Sign Up | 14/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 14/400 | 0.8 -> 0.92 | 4.22 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 1440 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 14/400 | 0.8 -> 0.92 | 4.21 -> 5.24 | 4.1 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.53 -> 5.31 | 3.39 -> 5.12 | 4.5 | FAIL | pass |
| /safety | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.56 -> 5.36 | 3.43 -> 5.18 | 4.5 | FAIL | pass |
| /safety | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.64 -> 5.48 | 3.41 -> 5.17 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 14/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 1440 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 14/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 1440 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4.06 -> 5.2 | 3.88 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 1440 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.64 -> 4.98 | 3.58 -> 4.9 | 4.5 | FAIL | pass |
| /safety | 1440 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.66 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /safety | 1440 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.68 -> 5 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /safety | 1440 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.7 -> 5.55 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /safety | 1440 | #safety-hero-section > div.container > div.label | Safety & Trust | 15/300 | 1 -> 1 | 3.73 -> 5.26 | 3.37 -> 4.75 | 4.5 | FAIL | pass |
| /safety | 1440 | #safety-hero-section > div.container > p | Every trust and safety standard we hold  | 18/400 | 0.65 -> 0.85 | 3.93 -> 5.44 | 3.33 -> 4.61 | 4.5 | FAIL | pass |
| /safety | 1440 | details > summary > span | + | 15/600 | 1 -> 1 | 3.1 -> 3.1 | 3.1 -> 3.1 | 4.5 | FAIL | FAIL |
| /safety | 390 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.83 -> 5.13 | 3.73 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.15 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.15 | 4 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 2.88 -> 4.11 | 1.25 -> 1.09 | 4.5 | FAIL | FAIL |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.45 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.41 -> 5.34 | 4.29 -> 5.24 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.09 -> 5.12 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 4.09 -> 5.11 | 4.01 -> 4.98 | 4.5 | FAIL | pass |
| /safety | 390 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4.03 -> 5.17 | 3.89 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 390 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.68 -> 5.01 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /safety | 390 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 1.47 -> 1.6 | 1.03 -> 1.12 | 4.5 | FAIL | FAIL |
| /safety | 390 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.67 -> 5 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /safety | 390 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.32 -> 4.85 | 1.25 -> 1.11 | 4.5 | FAIL | pass |
| /safety | 390 | #safety-hero-section > div.container > div.label | Safety & Trust | 15/300 | 1 -> 1 | 3.54 -> 5 | 3.16 -> 4.46 | 4.5 | FAIL | pass |
| /safety | 390 | details > summary > span | + | 15/600 | 1 -> 1 | 3.1 -> 3.1 | 3.1 -> 3.1 | 4.5 | FAIL | FAIL |
| /safety | 768 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.94 -> 5.26 | 3.75 -> 5.05 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 4.13 -> 5.15 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.13 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 4.14 -> 5.15 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 4.1 -> 5.13 | 4.01 -> 5.05 | 4.5 | FAIL | pass |
| /safety | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 768 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.44 -> 5.19 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.46 -> 5.2 | 3.37 -> 5.11 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.14 | 4 -> 5.05 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.13 | 4.01 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 4.12 -> 5.14 | 4 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 768 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 4.11 -> 5.12 | 4.05 -> 5.06 | 4.5 | FAIL | pass |
| /safety | 768 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 4 -> 5.14 | 3.89 -> 5.04 | 4.5 | FAIL | pass |
| /safety | 768 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.57 -> 4.92 | 4.5 | FAIL | pass |
| /safety | 768 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.57 -> 4.9 | 4.5 | FAIL | pass |
| /safety | 768 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.67 -> 4.99 | 3.61 -> 4.92 | 4.5 | FAIL | pass |
| /safety | 768 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.67 -> 5.5 | 3.44 -> 5.24 | 4.5 | FAIL | pass |
| /safety | 768 | #safety-hero-section > div.container > div.label | Safety & Trust | 15/300 | 1 -> 1 | 4.31 -> 6.08 | 3.51 -> 4.96 | 4.5 | FAIL | pass |
| /safety | 768 | #safety-hero-section > div.container > p | Every trust and safety standard we hold  | 18/400 | 0.65 -> 0.85 | 4.37 -> 6.16 | 3.32 -> 4.68 | 4.5 | FAIL | pass |
| /safety | 768 | details > summary > span | + | 15/600 | 1 -> 1 | 3.1 -> 3.1 | 3.1 -> 3.1 | 4.5 | FAIL | FAIL |
| /signup | 1440 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.51 -> 4.91 | 3.45 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > a | The Team | 14/400 | 0.8 -> 0.92 | 3.74 -> 4.92 | 3.65 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > a | Safety & Trust | 14/400 | 0.8 -> 0.92 | 3.75 -> 4.9 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > a | Instagram | 14/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > a | How It Works | 14/400 | 0.8 -> 0.92 | 3.74 -> 4.91 | 3.66 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > a | Sign Up | 14/400 | 0.8 -> 0.92 | 3.76 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 14/400 | 0.8 -> 0.92 | 3.83 -> 5.01 | 3.68 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 14/400 | 0.8 -> 0.92 | 3.75 -> 4.93 | 3.69 -> 4.84 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 14/400 | 0.8 -> 0.92 | 4.03 -> 5.22 | 3.71 -> 4.89 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.19 -> 5.01 | 3.13 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.18 -> 4.97 | 3.14 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.25 -> 5.1 | 3.17 -> 4.97 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.28 -> 5.13 | 3.16 -> 4.95 | 4.5 | FAIL | pass |
| /signup | 1440 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.29 -> 5.41 | 3.97 -> 5.1 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 14/400 | 0.8 -> 0.92 | 3.77 -> 4.96 | 3.69 -> 4.89 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 14/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 14/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 14/400 | 0.8 -> 0.92 | 3.77 -> 4.96 | 3.69 -> 4.89 | 4.5 | FAIL | pass |
| /signup | 1440 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 3.77 -> 5.05 | 3.58 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 1440 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.38 -> 4.81 | 3.31 -> 4.7 | 4.5 | FAIL | pass |
| /signup | 1440 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.38 -> 4.82 | 3.31 -> 4.71 | 4.5 | FAIL | pass |
| /signup | 1440 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.48 -> 4.94 | 3.29 -> 4.7 | 4.5 | FAIL | pass |
| /signup | 1440 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.45 -> 5.37 | 3.18 -> 5.02 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.51 -> 4.93 | 3.45 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.91 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.93 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.93 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.93 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.65 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 3.74 -> 4.91 | 3.66 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.91 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.18 -> 4.97 | 3.14 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.18 -> 4.98 | 3.14 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.19 -> 4.98 | 3.13 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.19 -> 5 | 3.13 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 390 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.01 -> 5.13 | 3.94 -> 5.03 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.93 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.94 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.91 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 3.68 -> 4.95 | 3.59 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 390 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.8 | 3.31 -> 4.7 | 4.5 | FAIL | pass |
| /signup | 390 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.79 | 3.28 -> 4.7 | 4.5 | FAIL | pass |
| /signup | 390 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.8 | 3.28 -> 4.7 | 4.5 | FAIL | pass |
| /signup | 390 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.38 -> 5.27 | 3.2 -> 5.03 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > #footer-company-contact-link | Contact Us | 14/400 | 0.75 -> 0.92 | 3.52 -> 4.95 | 3.45 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > a | The Team | 13/400 | 0.8 -> 0.92 | 3.74 -> 4.91 | 3.66 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > a | Safety & Trust | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.94 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > a | Reviews | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.93 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > a | Instagram | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.94 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > a | How It Works | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > a | Sign Up | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.95 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-email-link | luis@nottherug.com | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > #footer-contact-phone-link | (347) 610-9676 | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.93 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > a.footer-contact-value | Williamsburg | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.95 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Call or Text | 10/400 | 0.68 -> 0.93 | 3.2 -> 5.02 | 3.13 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Email | 10/400 | 0.68 -> 0.93 | 3.18 -> 4.98 | 3.14 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Service Area | 10/400 | 0.68 -> 0.93 | 3.18 -> 4.98 | 3.14 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-label | Response Hours | 10/400 | 0.68 -> 0.93 | 3.19 -> 4.98 | 3.14 -> 4.9 | 4.5 | FAIL | pass |
| /signup | 768 | #footer-contact-list > li.footer-contact-item > span.footer-contact-value | Mon–Fri, 9 AM–7 PM · Sat–Sun, 10 AM–4 PM | 14/400 | 0.85 -> 0.95 | 4.16 -> 5.28 | 3.93 -> 5.02 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > #footer-rates-link-boarding-dog-sitting | Boarding & Dog Sitting | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > #footer-rates-link-dog-walking | Dog Walking | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.9 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > #footer-rates-link-puppy-walks | Puppy Visits | 13/400 | 0.8 -> 0.92 | 3.75 -> 4.92 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | ul > li > #footer-rates-link-senior-special-needs | Senior & Special Needs | 13/400 | 0.8 -> 0.92 | 3.76 -> 4.93 | 3.69 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | div.footer-grid > #footer-brand-block > p.footer-tagline | Brooklyn's most trusted neighborhood dog | 15/400 | 0.78 -> 0.92 | 3.66 -> 4.94 | 3.59 -> 4.83 | 4.5 | FAIL | pass |
| /signup | 768 | div.footer-grid > #footer-col-company > h4 | Company | 13/500 | 0.72 -> 0.9 | 3.35 -> 4.78 | 3.28 -> 4.71 | 4.5 | FAIL | pass |
| /signup | 768 | div.footer-grid > #footer-col-contact > h4 | Contact | 13/500 | 0.72 -> 0.9 | 3.37 -> 4.8 | 3.31 -> 4.7 | 4.5 | FAIL | pass |
| /signup | 768 | div.footer-grid > #footer-col-rates > h4 | Services | 13/500 | 0.72 -> 0.9 | 3.36 -> 4.78 | 3.32 -> 4.71 | 4.5 | FAIL | pass |
| /signup | 768 | div.footer-grid > div.footer-bottom > div.footer-copy | © 2026 Not The Rug · 281 N 7th St, Ste 1 | 13/400 | 0.7 -> 0.95 | 3.43 -> 5.34 | 3.19 -> 5.02 | 4.5 | FAIL | pass |
