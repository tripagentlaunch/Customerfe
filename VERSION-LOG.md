# Demo branch version log

Tracks every push to the `demo` branch. Each push gets a version tag (`demo-v1`, `demo-v2`, ...)
so you can roll back to any point with:

```bash
git checkout demo-v<N>
```

or reset the branch back to it with:

```bash
git reset --hard demo-v<N>
```

| Version | Commit | Date | What changed |
|---------|--------|------|--------------|
| demo-v1 | f660155 | 2026-09-09 | Initial push of `demo` branch to GitHub (branched from `main`); added this version log |
| demo-v2 | bc4138f | 2026-09-16 | CITY: reference city page template (Santorini) + zone template, plus supporting map/plan/calendar components and data-contract hardening. `main-snapshot-2026-09-16` tag preserves main's state as it was just before this push (main and demo hadn't diverged before this). |
| demo-v3 | 28e3fda | 2026-09-16 | CITY: remove signature experiences section (reverted after review) |
| demo-v4 | 468223f | 2026-09-17 | CITY: real map data for Santorini (event locations/months, plan stop coordinates) so EventMap/PlanRouteMap actually activate; CityPage.tsx no longer silently falls back to CityMap in the Calendar/Plan sections when a city's data is missing — shows an explicit "Map data missing" panel instead. Known-good checkpoint for the interactive map/calendar/plan features. |
| demo-v5 | 1b8918e | 2026-09-17 | CITY: real map/event/plan data for all 110 cities (not just Santorini) — event months/locations, plan stop coordinates, and arrival-airport data, backfilled via an automated cross-reference + three-pass geocoding pipeline (see `MAP_DATA_HANDOFF.md`); fixed a `CalendarSection.tsx` bug where the map never released after scrolling past Calendar; all 440 "On the ground" cards now show a keyword headline. Live-verified with real Google Maps tiles for Santorini, Abu Dhabi, and Colombo. |
| demo-v6 | 87ec580 | 2026-09-23 | HOMEPAGE: new interactive world map (`WorldMap.tsx`) with real country borders (d3-geo/topojson), per-region zoom/pan, hoverable region shapes + serif region name labels (three-way linked hover/click between a region's shape, its map label, and its tab-bar button), and a live city hover-preview sourced from each city's own hero image. Homepage sections reordered (map above the date-based planner) and restyled: `DestinationPlanner` city cards ported CityPage's guide-card hover-reveal pattern, hero carousel and services-section CTA cleanup, "Ask your advisor" rename, a new "How It Works" stepper section (`HowItWorksTabs.tsx`) replacing the old chat-demo section, plus dark-mode tuning across the new map and stepper sections. `main-snapshot-2026-09-23` tag preserves main's state as it was just before this push was merged in. |
