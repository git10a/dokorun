# Routes

| URL | File | Layout | Summary |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Root layout | Search hero, tags, newest cards, prefecture links |
| `/spots` | `src/app/spots/page.tsx` | Root layout | Filters, paginated cards, all-result map |
| `/spots/[slug]` | `src/app/spots/[slug]/page.tsx` | Root layout | Spot title, gallery, course map/specs, facilities, description, nearby cards |
| `/about` | `src/app/about/page.tsx` | Root layout | Service explanation |
| `/admin/login` | `src/app/admin/login/page.tsx` | Root layout | Admin login |
| `/admin` | `src/app/admin/page.tsx` | Root layout, guarded | Admin spot list |
| `/admin/spots/new` | `src/app/admin/spots/new/page.tsx` | Root layout, guarded | Spot creation form |
| `/admin/spots/[id]/edit` | `src/app/admin/spots/[id]/edit/page.tsx` | Root layout, guarded | Spot editing form |
| `/sitemap.xml` | `src/app/sitemap.ts` | Metadata route | Fixed and spot URLs |
| `/robots.txt` | `src/app/robots.ts` | Metadata route | Crawl rules |
