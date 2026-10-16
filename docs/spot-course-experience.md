# Running spot course experience — 2026-10-16

Target: all 251 published spots, two or three reviewed scenery images per spot, and the same interactive elevation chart as race pages. This work is not complete and has not been deployed.

## Implemented

- `RaceElevationChart` reused for running spots. Tapping/dragging or arrow/Home/End keys selects a distance and the corresponding map position.
- Coordinates and elevation share a cumulative distance axis from the existing GPX. Loop starts rotate both; reverse starts reverse both. Changing starts clears the previous selection. Photo reference distances follow the selected start.
- `LongCourseGuide` handles the 250 guided spots. `SpotCourseMap` covers the remaining spot, midoriko, and other future pages without a guide.
- `scripts/build-spot-elevation.ts` generates static JSON in `public/spot-elevation` before dev/build. It follows the existing guide builder's loop-closing rule and checks distance agreement. Terrain data backfilled from Open-Meteo is credited in the chart.
- Existing 16 images retained, with their course positions registered. Additional sources/prompts and reviewed scenes are in `data/spot-experience`; final WebPs are in `public/course-atmosphere` and the additional display catalog is `src/lib/spot-atmosphere-catalog.json`.
- New images use built-in image_gen, one image per request, from directly viewed Google Maps panoramas. No unreviewed coordinate is treated as image evidence. No API/CLI image generation is used.

## Coverage and remaining work

Run `npx tsx scripts/audit-spot-experience.ts` to refresh `data/spot-experience/coverage.json`. `--require-complete` fails unless every published spot has a usable elevation profile and at least two registered image files.

All 251 spots have existing height samples. The routes for 21st-century-forest-park and aoba-no-mori-park are inconsistent with its description: two sampled route points are residential paved streets, while the description says dirt paths inside the park. Evidence and the official map index are recorded in `route-reviews.json`. The new elevation chart/ascent are withheld for both spots. Their original routes must be corrected and verified; no scenery has been generated for the wrong route.

All other unprocessed spots still require visual source review and two generated/reviewed images. Candidate links in the coverage report are only research leads. Do not mark the whole task complete from shared UI or numeric elevation coverage.

## Verification

Production-mode Next build passed before the final Akashi catalog additions; re-run the build after remaining image work.

Local browser: desktop Kokyo chart pointer/keyboard selection, image-to-map selection, and start change; 390px Midoriko chart and image selection; reviewed-route notice. Source screenshots and UI proof are in the primary checkout's `output/spot-course-experience-2026-10-16`.

Run tests, typecheck, lint, production build and live staged release checks before claiming production. No production deployment has been performed for this feature.
