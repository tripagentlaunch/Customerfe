# Map data handoff — EventMap & PlanRouteMap

Both `EventMap` (the Calendar section's map) and `PlanRouteMap` (the Plan
section's map) are **fully generic, data-driven components** — there is no
per-city code anywhere in this template (verified: zero city-name string
checks in `CityPage.tsx`, `CalendarSection.tsx`, `PlanRouteMap.tsx`, or
`EventMap.tsx`). Every city gets these features automatically the moment its
own entry in `src/data/cities.generated.json` has the right fields filled
in.

If a city's Calendar/Plan section can't render its own map, `CityPage.tsx`
shows a clearly-labeled red "Map data missing" panel naming the exact field
that's absent, instead of silently substituting the generic venue map. That
panel is your QA signal — if you see it, data is incomplete for that city;
it should never appear for a real visitor.

**Status as of this doc:** all 110 cities' data has been backfilled using
the automated pipeline described below (no hand-authoring per city). Final
coverage:

| Field | Coverage |
|---|---|
| Event `months` | 328/330 events (the remaining 2 are deliberately-monthly, see below) |
| Event `location` | 324/328 selectable events (99%) |
| Plan slot `place`/`category` | 1,131/1,131 slots (100%, extracted from existing text) |
| Plan slot `lat`/`lon` | 973/1,028 geocodable slots (95%) |
| `arrivalPoint` | 110/110 cities (100%) |

The residual gaps (4 events, 55 slots — full list in the "What's still
missing" section near the end) are venue names genuinely not indexed in
OpenStreetMap even after two geocoders and a country-disambiguation pass;
a Google Places/Geocoding pass (once enabled on the project) is the most
likely way to close the rest. See `VERSION-LOG.md` for the commit this
landed in.

---

## Developer integration checklist

Everything below is **data-only, already committed** — no code changes are
needed for EventMap/PlanRouteMap themselves to work in production. What's
actually left is entirely about the API key and a QA pass:

1. **Get a Google Maps JavaScript API key for production**, in whatever
   Cloud project this site's deployment should own long-term (not
   necessarily the temporary one used to verify this backfill visually —
   ask whoever holds it if that one should become permanent or get
   rotated out). Required API: **Maps JavaScript API**. Optional, only if
   you want to close the remaining ~4% data gap below: **Geocoding API**
   (a separate toggle from Maps JS, even on the same key — this bit us
   during the backfill, see "Which geocoder" further down).
2. **Restrict the key** to this site's real origin(s) in Google Cloud
   Console (HTTP referrer restrictions) before it goes anywhere public.
3. **Set `VITE_GOOGLE_MAPS_API_KEY`** in the actual deployment's
   environment variables (Vercel project settings, or wherever this
   builds) — not `.env.local`, which is local-only/git-ignored. This is a
   Vite build-time env var (`import.meta.env`), so a new value requires a
   rebuild/redeploy, not just a server restart.
4. **No other setup required.** `CityMap.tsx`, `EventMap.tsx`, and
   `PlanRouteMap.tsx` all already do their own real/fallback split off
   this one env var — confirmed nothing else reads or depends on it.
5. **QA pass after deploying with the key**: spot-check a sample of city
   pages' Calendar and Plan sections. The red "Map data missing" panel is
   your signal — it should appear **only** for the specific events/slots
   listed in "What's still missing" below, never anywhere else. If it
   shows up somewhere not on that list, something regressed and is worth
   investigating before launch, not after.
6. **Optional follow-ups**, not required for launch:
   - Enable the Geocoding API and re-run the same scripts (see "Which
     geocoder" below) to close the remaining 59 gaps, or hand-supply
     `location`/`lat`/`lon` for just that short list directly.
   - Pexels API key (`VITE_PEXELS_API_KEY`) for real event photos —
     optional, the placeholder is a legitimate permanent fallback.
   - Plan-slot photos have no real-photo path built at all yet (separate,
     larger piece of work — see "Known gap" section below).

Nothing about `arrivalPoint` needs the Maps key or any live API at all —
that data is already fully baked into `cities.generated.json` (110/110
cities), produced from an offline dataset, not geocoding. See its own
section below if you want to regenerate or extend it later (e.g. a new
111th city).

---

## EventMap (Calendar section)

**Where it's wired:** `src/pages/CityPage.tsx`, the `taSplitMap` block —
renders when `calendarInView` and the currently-selected event has a
`location`. Selection logic itself lives in `src/components/CalendarSection.tsx`.

**Data contract** (`whatsOn.events[]`, see `src/types/city.ts`):

| Field | Type | Required for EventMap? | What it controls |
|---|---|---|---|
| `months` | `string[]` | **Yes** | Must be non-empty for this event to become selectable at all (auto-advance or click). Codes must match `whenToGo.months[].code` exactly (e.g. `"Oct"`, not `"October"`). |
| `location` | `{ label: string; lat: number; lon: number } \| null` | **Yes** | The actual pin position. `null` = this event never gets picked up by the map, by design (falls through to the "Map data missing" panel while it's the active event). |
| `photo` | `string \| null` | No (cosmetic) | Shown above the pin. `null` falls back to a generated placeholder automatically (`placeholderPhoto()` in `CityPage.tsx`) — never breaks, never blank. |
| `name`, `when`, `note` | — | Already required/present | Unrelated to the map; display copy only. |

**The Google Maps API key is *not* required for this to work.**
`EventMap.tsx` has its own real/fallback split (`RealEventMap` vs
`FallbackEventMap`, same pattern as `CityMap`/`MockCityMap`) — without a key
it shows a plain centered pin + photo instead of a real Google map, but the
correct event/pin still shows. The key only changes the visual style, not
whether the feature works.

### How `months` got filled in — no hand-authoring, no invented data

Turned out this site already had the answer sitting in a second data file
nobody had cross-referenced: `src/data/whatson.generated.json` (powers the
site-wide `/whats-on` page) buckets 312 of the same 330 events by month
already — matched back to each city's own `whatsOn.events[]` by
`(href, event name)`. That cross-reference was applied directly: **310 of
330 events got real `months` this way, zero invention.**

The remaining 20 events genuinely weren't in that file and needed real
external verification (not guessing off the vague `when` text) —
web-searched against real-world event dates:
- **18 events** got real `months[]` written in from verified current dates
  (e.g. "Ifestia Festival" — Santorini — verified via search to be
  September, not the guessed "summer").
- **2 events** ("Full-moon night viewings" in Agra, "Hoi An Lantern Full
  Moon Festival") are genuinely monthly-recurring — these deliberately
  keep `months: []` (they're not tied to one calendar slot) and instead
  show `"Every month"` as their `when` copy.

If this data ever needs a refresh (a festival's actual dates drift year to
year), re-run the same cross-reference against a refreshed
`whatson.generated.json`, and re-verify only the handful of events that
still fall outside it.

### How `location` got filled in — auto-derived, then geocoded, not hand-typed

The realization here: hand-authoring a place name for ~330 events one at a
time isn't necessary. The pipeline used instead:

1. **Derive a short geocodable place label from text that already
   exists** — each event's own `note` field (e.g. "A re-enactment of the
   volcano's eruption with fireworks over the caldera at Fira" →
   `"Fira, Santorini"`). Where the note names no specific sub-location, the
   label falls back to just the city name itself (always a valid anchor
   point) rather than guessing.
   - Caught and fixed by hand: a handful of events (~8) are genuinely held
     in a *different* nearby town than the trip-hub city page they're
     listed under — e.g. Palio di Siena listed under Florence, Thrissur
     Pooram under Kochi, Al Dhafra Festival (Liwa) under Abu Dhabi. These
     got the real town name as the geocoding query instead of a misleading
     "Town, Wrong-City" pairing.
2. **Geocode the label** — batch-resolved via a geocoding API (one-time
   script, not a live dependency — see below).
3. **Sanity-check** — resolved point validated against a bounding-box
   distance from the city's known center (`src/data/venue-coords/<slug>.json`
   already has a `center` point for every city, produced separately for
   `CityMap`) — catches wrong-country/wrong-place mismatches before they're
   written in.

**Which geocoder:** started with the Google Geocoding API (same key
family as Maps JS), but the available key doesn't have that specific API
enabled on its Cloud project (`REQUEST_DENIED` — Maps JS and Geocoding are
separately-enabled APIs even under one key/project). Switched to
**Nominatim (OpenStreetMap)** instead — free, no key dependency, rate-limited
to 1 request/second by their usage policy. For a one-time backfill of this
size this is a non-issue; it's not used at runtime.

**A three-pass pipeline was needed to get to 95%+ coverage, not one:**

1. **Nominatim, pass 1** — the full batch (~1,450 events/slots/airports).
   Caught a real data-quality issue in the process: 43 of 110 cities had no
   `hero.breadcrumbCountry` set at all (including Hyderabad, London, Agra),
   so their queries went out with no country context. This is exactly why
   "Old City, Hyderabad" resolved to **Hyderabad, Pakistan** instead of
   Hyderabad, India — caught by the bounding-box check, not silently
   written in. Built a slug→country map to cover the gap (worth fixing
   upstream in `hero.breadcrumbCountry` itself, not just patched around
   here).
2. **Nominatim, pass 2** — retried every failure from pass 1 with the
   corrected country appended. Low yield on its own (most of what pass 1
   couldn't find, pass 2 couldn't either — Nominatim's business/POI
   coverage is genuinely thin for specific restaurant/hotel names), but it
   did fix the country-ambiguity class of failures.
3. **Photon (Komoot's OSM-based geocoder), pass 3** — different
   full-text-search matching algorithm than Nominatim's structured search,
   run with a location bias toward each city's known center. Recovered the
   bulk of the remaining gap. Same bounding-box + manual spot-check
   discipline applied — this pass caught its own share of false matches
   (an "Argo" query for a Hong Kong restaurant resolved to a street named
   "Hong Kong City" in Guayaquil, Ecuador — 17,000km away), all excluded
   rather than written in.

Every pass used the same validation: resolve, check distance from the
city's known center (`venue-coords/<slug>.json`), and hand-inspect any
outlier before deciding to keep or discard it — several results across all
three passes looked plausible by distance alone but were verifiably wrong
venues on inspection (a same-named restaurant in the wrong city, a
different property with a similar name). None of those were written in.

If a backend engineer wants to close the remaining ~4%, the same scripts
work against the Google Geocoding API too as soon as that's enabled on the
project — built geocoder-agnostic for exactly that reason. The full list
of what's still missing is in the coverage table at the top of this doc's
data (regenerate with a `null`-location/`null`-lat filter over
`cities.generated.json`).

### How `photo` could be improved beyond the placeholder

Optional, not done. A one-time backfill script querying the Pexels API
(free tier, no attribution required) per event — e.g. search `"Santorini
fireworks festival"` for Ifestia — and writing the resulting URL into
`cities.generated.json`. Scoped to *events specifically*, not guide venues:
a generic stock photo suits an atmospheric festival, but would be
misleading for a named hotel/restaurant (Pexels has no way to return a
photo of that actual venue). Requires `VITE_PEXELS_API_KEY`, same
isolated-env-var pattern as the Maps key. Not required — the deterministic
placeholder is a legitimate permanent fallback, not just a stopgap.

---

## PlanRouteMap (Plan section)

**Where it's wired:** `src/pages/CityPage.tsx`, the same `taSplitMap`
block — renders when `planInView` and the active day has more than one
stop with coordinates. Selection/carousel logic lives in
`src/components/PlanCarousel.tsx`; stop-building logic lives in
`CityPage.tsx`'s `activeDayStops`.

**Data contract** (`plan.days[].slots[]`, see `CityDay` in `src/types/city.ts`):

| Field | Required? | What it controls |
|---|---|---|
| `lat` / `lon` | **Yes** — need ≥2 stops with both set for the given day | The route line/points. `CityPage.tsx` requires `activeDayStops.length > 1`, else shows "Map data missing." |
| `place` | No (cosmetic) | On-map label; falls back to `label` (Morning/Afternoon/Evening) if null. |
| `category` | No (cosmetic) | Pin icon/color (`stay`/`eat`/`do`/`party`); falls back to a generic "do" glyph if null. |
| `arrivalPoint` (`{label, lat, lon}`, one per city, in `plan`) | No, but recommended | Gets the special plane icon as day 1's first stop. |

### The itinerary content itself was never the gap

Every city already ships with a real, hand-written multi-day itinerary —
`plan.days[].dayNumber` / `.title` / each slot's `.label` / `.text` — this
is original site copy for all 110 cities, not something built or invented
during this backfill. Only the *map-specific* fields (`lat`/`lon`/`place`/
`category`) were missing.

### How `plan.days` stays future-proof for a real "ideal itinerary" source

`plan.days` is already a plain array — nothing in the rendering or map
logic assumes a fixed day count or a fixed 3-slots-per-day shape
(`PlanCarousel.tsx` does `days.map(...)` / `day.slots.map(...)`, no
hardcoded indices). Confirmed with the product owner: when a future
"ideal itinerary" source (hand-authored or sourced from another platform)
becomes available per city, it **replaces** `plan.days` wholesale — no
schema change, no multi-variant support needed. The only requirement on
that future source is that it lands in the same `CityDay[]` shape.

### How `place` / `category` got filled in — extracted from the existing text, not authored

Same principle as `months` above: the itinerary `text` for every slot
already names its venue in prose (e.g. "A slow morning on your suite
terrace at Katikies or Canaves" → `place: "Katikies"`, `category: "stay"`).
This was extracted directly from the existing 1,131 slots' text — no new
authoring, no dev input. Left `place: null` only where the text is
genuinely generic with no named venue (~100 of 1,131 slots — e.g. "the
hotel spa," "a quiet cove").

### How `lat` / `lon` got filled in

Same three-pass geocoding pipeline as EventMap's `location` above (Nominatim
→ country-corrected retry → Photon), same city-center bounding-box sanity
check. `place` (extracted above) plus the city/country is the query string
fed in. Final coverage: 973/1,028 geocodable slots (95%).

### How `arrivalPoint` got filled in — not geocoded at all, in the end

The first attempt used the same geocoding pipeline (`"<City> International
Airport"` as the query), but this turned out to be the least reliable part
of the whole backfill: airport names collide globally (**"London
International Airport" resolved to a small airport in Ontario, Canada**;
**"Amsterdam International Airport" resolved to JFK in New York**), so
even a handful of correctly-resolved samples wasn't enough to trust the
rest blindly.

Switched to a fundamentally more reliable approach instead: airports are a
small, well-documented, finite dataset — no geocoding ambiguity needed.
Pulled the free [OurAirports](https://ourairports.com/data/) public
dataset (~86k airports worldwide, offline, no key), filtered to
`large_airport`/`medium_airport` with real scheduled service and an IATA
code, and for each city picked the nearest one by straight-line distance
from the city's known center (`venue-coords/<slug>.json`), preferring a
`large_airport` within 80km if one exists (so London correctly gets
Heathrow, not the geographically-closer but much smaller London City
Airport).

**That still wasn't the full fix.** 38 of 110 cities have *two* airports
both tagged `large_airport` in the dataset — usually an older, closer,
often domestic-or-budget-focused field right next to a farther-out true
international gateway (the classic pattern: LaGuardia sits closer to
Manhattan than JFK does; Orly is closer to central Paris than CDG; Ciampino
closer than Fiumicino). Pure nearest-distance picked the *wrong* one for
20 of those 38 — caught only because a live visual check of Colombo's page
put "Bandaranaike International" (from the site's own existing "On the
ground" copy) right next to the wrong airport ("Ratmalana") the pipeline
had picked. Once one was confirmed wrong, all 38 ambiguous cities were
re-checked by hand and 20 corrected to their real primary international
gateway (full list: Amman→AMM, Bangkok→BKK, Buenos Aires→EZE,
Colombo→CMB, Doha→DOH, Dubai→DXB, Istanbul→IST, Kuala Lumpur→KUL,
Kyoto→KIX, Los Angeles→LAX, Milan→MXP, New York→JFK, Osaka→KIX,
Paris→CDG, Rio de Janeiro→GIG, Rome→FCO, San Francisco→SFO, Seoul→ICN,
Shanghai→PVG, Taipei→TPE). The other 18 ambiguous cities (Amsterdam,
Barcelona, Cairo, Cancún, Delhi, Edinburgh, Florence, Goa, Krabi, Lake
Como, Melbourne, Mexico City, Miami, Mumbai, Phuket, Toronto, Vancouver,
Venice) already had the correct airport as the nearest match — verified,
not just assumed.

**Result: 110/110 cities have a real, correct primary airport.** No
geocoding involved anywhere in this field — worth remembering if a future
111th city is added: nearest-nominal-large-airport is a reasonable first
guess, but metro areas with more than one major airport need a manual
sanity check against which one is actually the primary international
gateway, the same way these 20 were caught.

### Known gap not covered by this backfill: Plan-slot photos

`src/lib/planPhotos.ts` has **no real-photo path at all** — every Plan
carousel image is a deterministic placeholder (`PHOTOS_PER_SLOT = 1`,
`planSlotPhotos()` always returns `placeholderPhoto(seed)`), unlike
EventMap's event photos which at least have an optional Pexels path
described above. Not addressed in this backfill; still open if/when real
Plan-slot imagery is wanted.

---

## What's still missing (the QA checklist's reference list)

These are the only events/slots where "Map data missing" is expected to
render — 4 events without `location`, 55 slots without `lat`/`lon` (all
had a real extracted `place` name; the geocoders just couldn't find that
specific venue in OpenStreetMap after three passes). If this panel shows
up anywhere **not** on this list, that's a real regression.

**Events missing `location`:**
- agra — "Diwali"
- amalfi-coast — "Ravello Festival"
- hong-kong — "Hong Kong Wine & Dine Festival"
- nairobi-mara — "WRC Safari Rally Kenya"

**Plan slots missing `lat`/`lon`** (city, day, slot — venue name):
- abu-dhabi day1 slot2 — "Emirates Palace Mandarin Oriental"
- abu-dhabi day2 slot3 — "Talea by Antonio Guida"
- amalfi-coast day1 slot1 — "Le Sirenuse"
- amalfi-coast day1 slot3 — "La Sponda"
- amalfi-coast day2 slot1 — "Li Galli"
- amalfi-coast day2 slot2 — "Da Adolfo"
- amalfi-coast day3 slot1 — "Villa Rufolo"
- amalfi-coast day3 slot2 — "Belmond Hotel Caruso"
- amalfi-coast day3 slot3 — "Rossellinis"
- amalfi-coast day4 slot1 — "Blue Grotto"
- amalfi-coast day4 slot2 — "Il Riccio"
- amalfi-coast day4 slot3 — "Da Paolino"
- amman-petra day2 slot2 — "Qal'at ar-Rabad"
- amman-petra day4 slot3 — "Petra by Candlelight"
- amman-petra day5 slot2 — "Khazali Canyon"
- buenos-aires day1 slot3 — "Elena"
- buenos-aires day3 slot3 — "Aramburu"
- doha day2 slot3 — "Jiwan by Alain Ducasse"
- dubai day2 slot3 — "Tresind Studio"
- geneva day2 slot3 — "Bayview by Michel Roth"
- hoi-an day1 slot1, day1 slot2, day3 slot2, day3 slot3 — "Four Seasons
  Resort The Nam Hai" (same property, 4 separate slots)
- hong-kong day3 slot3 — "Argo"
- jaisalmer day1 slot3 — "Legend of Marwad"
- jodhpur day3 slot2 — "Rohet Garh"
- lake-como day3 slot3 — "Berton al Lago"
- london day1 slot3 — "Alex Dilling at Hotel Cafe Royal"
- mahe-seychelles day1 slot1 — "Four Seasons Resort Seychelles at Petite
  Anse"
- male-maldives day1 slot1 — "Soneva Jani"
- male-maldives day5 slot2 — "Old Friday Mosque"
- manali day3 slot2 — "Nicholas Roerich Art Gallery"
- marrakech day1 slot3 — "Le Grand Restaurant Francais"
- marrakech day4 slot3 — "La Grande Table Marocaine"
- mauritius-city day3 slot2 — "Chamarel Rum Distillery"
- milan day3 slot2, day3 slot3 — "Villa d'Este"
- mumbai day1 slot3 — "Wasabi by Morimoto"
- nairobi-mara day3 slot1 — "Wilson Airport"
- new-york day4 slot1 — "The Frick Collection"
- nice-riviera day2 slot1 — "Cours Saleya"
- nice-riviera day2 slot3 — "Le Chantecler"
- nice-riviera day4 slot1 — "Chateau Grimaldi"
- nice-riviera day5 slot1 — "Fondation Maeght"
- osaka day3 slot3 — "40 Sky Bar"
- paro day4 slot1 — "Dochula Pass"
- ranthambore day1 slot1, day1 slot3 — "Aman-i-Khas"
- rio-de-janeiro day1 slot3 — "Al Mare"
- rishikesh day1 slot2 — "Ananda Spa"
- shanghai day2 slot3 — "Fu He Hui"
- st-moritz day2 slot1 — "Bernina Railway"
- udaipur day3 slot3 — "Upre by 1559 AD"
- zanzibar day3 slot1 — "&Beyond Mnemba Island"

A few of these (Villa d'Este, Aman-i-Khas, Argo, Fu He Hui, Al Mare,
Ananda Spa, Rohet Garh, Old Friday Mosque) were deliberately left blank
rather than written in wrong — the geocoders *did* return a result for
these, but it was a same- or similar-named place in the wrong city/country
(caught and excluded during this backfill's validation, not missed).
Regenerate this exact list any time with:

```python
import json
d = json.load(open('src/data/cities.generated.json'))
for slug, c in d.items():
    for e in c.get('whatsOn', {}).get('events', []):
        if e.get('months') and e.get('location') is None:
            print(slug, e['name'])
    for di, day in enumerate(c.get('plan', {}).get('days', [])):
        for si, s in enumerate(day.get('slots', [])):
            if s.get('lat') is None and s.get('place') is not None:
                print(slug, di, si, s['place'])
```
