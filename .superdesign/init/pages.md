# Page dependency trees (2026-10-12)

- `/`: RaceSearch, RaceCard, RaceSpotCard, siteConfig, races, race-schedule, db/data.
- `/races`: RaceSearch, RaceCard, race-schedule.
- `/races/[slug]`: race-page, race-experience, map/elevation/pace plan, RaceReviews, db/race-reviews.
- `/about`: siteConfig, Next Image, Link, lucide icons. Same root Header/Footer.
- `/u/[handle]`: profile and existing spot widgets; owner-only links to races and /me/race-reviews.
- `/me/race-reviews`: requireUser, getUserRaceReviews, OwnRaceReviewCard, race definitions. Owner data must never render on a public route.
- `/contact`: ContactForm, actions, Turnstile.
- `/spots`: search filters, SpotCard, map, db/data.

Read the current source before changes; this index is a starting point. Product authority: root DESIGN.md.
