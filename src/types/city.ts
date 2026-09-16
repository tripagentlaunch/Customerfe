// Shape produced by tools/extract_city_pages.py from the real city-*.html
// files. Keep this in sync with that script's output — see
// app/src/data/cities.generated.json.

export interface CityLink {
  label: string | null;
  href: string;
}

export interface CityFact {
  label: string | null;
  value: string | null;
  small: string | null;
}

export interface CityGuideItem {
  name: string | null;
  area: string | null;
  credentials: string[];
  description: string | null;
  // Real photo URL, or null — the key itself is always required (a backend
  // must not omit it) so "no photo yet" is an explicit, unambiguous null
  // rather than a silently missing key. Null falls back to a generated
  // placeholder (see src/lib/placeholderPhoto.ts) rather than showing
  // nothing.
  photo: string | null;
}

export interface CityGuideTier {
  label: string | null;
  items: CityGuideItem[];
}

export interface CityGuidePanel {
  key: "stay" | "do" | "eat" | "party";
  tiers: CityGuideTier[];
}

export interface CityDay {
  dayNumber: string | null;
  title: string | null;
  // lat/lon are required keys but nullable values — must be both-null or
  // both-numbers together (only present where the plan's route map, see
  // PlanRouteMap.tsx, has a real waypoint for that slot; null for cities
  // whose plan data predates the animated-route feature).
  // place is the short stop name shown as the plan carousel's heading
  // (e.g. "Katikies") — distinct from text, the longer caption sentence;
  // null falls back to `label` (see CityPage.tsx).
  // category picks the map pin's icon (see cityMapCategories.ts's CAT_ICON)
  // — the same four values as a guide venue's own cat, duplicated here
  // rather than imported to avoid a types/city.ts <-> cityMapCategories.ts
  // circular import. Null falls back to a generic "do" glyph.
  slots: {
    label: string | null;
    text: string | null;
    lat: number | null;
    lon: number | null;
    place: string | null;
    category: "stay" | "eat" | "do" | "party" | null;
  }[];
}

export interface CityData {
  slug: string;
  fullSlug: string;
  seo: { title: string | null; description: string | null; ogImage: string | null };
  hero: {
    image: string | null;
    breadcrumbCountry: CityLink | null;
    name: string | null;
    tagline: string | null;
    ctaPrimary: CityLink;
    ctaSecondary: CityLink;
    facts: CityFact[];
  };
  ourTake: { lede: string | null; comeIf: string | null; skipIf: string | null };
  firstLook: {
    heroImage: string | null;
    heroCaption: string | null;
    grid: { image: string | null; caption: string | null }[];
  };
  whenToGo: {
    blurb: string | null;
    bestMonths: string | null;
    months: { code: string | null; tier: string }[];
  };
  guide: {
    verified: string | null;
    headingHtml: string | null;
    lede: string | null;
    note: { label: string | null; text: string } | null;
    panels: CityGuidePanel[];
  };
  signatureExperiences: {
    heading: string | null;
    items: { image: string | null; title: string | null; description: string | null }[];
  };
  plan: {
    heading: string | null;
    lede: string | null;
    days: CityDay[];
    cta: CityLink;
    // Where the trip's own route map starts from on day one (the airport,
    // typically) — shown only on the first day's map as the point the first
    // leg arrives from. Required key, nullable value (all-or-nothing as one
    // object, not three independently-optional fields): null means the
    // city's route map just starts at the first day's first slot instead,
    // no leading leg.
    arrivalPoint: { label: string; lat: number; lon: number } | null;
  };
  neighbourhoods: {
    heading: string | null;
    items: { name: string | null; description: string | null }[];
    pairWith: string | null;
  };
  whatsOn: {
    heading: string | null;
    // months: which of whenToGo's month codes (e.g. "Jun") this event falls
    // in — authored deliberately, not parsed from `when` (a freeform string
    // like "Early Oct" or "Varies (summer)" that isn't reliably parseable
    // across all cities). Required array, may be empty: an event with no
    // months set is treated as always relevant rather than never matching
    // (see CalendarSection). Every code here must be one of whenToGo's own
    // month codes.
    // location: where this event actually happens — required key, nullable
    // value; only set on events worth pinning on a map (see
    // CalendarSection/EventMap). Null means the event never gets picked up
    // by the map cycling.
    // photo: same convention as CityGuideItem.photo — an authored image
    // wins when set; null falls back to a deterministic placeholder
    // (placeholderPhoto) keyed off the event's own name, so every event
    // always has *something* to show on the map without requiring a real
    // photo to be wired in first.
    events: {
      when: string | null;
      name: string | null;
      note: string | null;
      months: string[];
      location: { label: string; lat: number; lon: number } | null;
      photo: string | null;
    }[];
  };
  goodToKnow: {
    heading: string | null;
    // note: a short practical callout shown under the card grid (e.g. where
    // to base yourself to avoid the crowds) — populated for every city
    // today, unlike beforeYouGo below.
    onGround: { heading: string | null; rows: CityFact2[]; note: string | null };
    // beforeYouGo renders each row as an accordion button (label) + panel
    // (value) — both must be real text to be usable at all, unlike
    // onGround's card-grid rows (CityFact2), where label/value are
    // legitimately nullable. A separate, non-nullable type here is what
    // lets AccordionRow (CityPage.tsx) require plain strings instead of
    // silently rendering a blank button for a null label. No `note` field:
    // unlike onGround's, this section's note was never populated for any
    // city and the template has nowhere it would render.
    beforeYouGo: { heading: string | null; rows: CityAccordionRow[] };
  };
  collections: {
    headingHtml: string | null;
    lede: string | null;
    items: CityLink[];
    allLink: CityLink | null;
  };
  closing: {
    headingHtml: string | null;
    lede: string | null;
    ctaPrimary: CityLink;
  };
}

interface CityFact2 {
  label: string | null;
  value: string | null;
  // Short hand-authored headline for this row's card (e.g. "The euro",
  // "A private driver") — only used by onGround's card-grid rendering, not
  // derived from `value` (which stays the full, uninterrupted description).
  keyword: string | null;
}

// See goodToKnow.beforeYouGo above for why this isn't CityFact2.
interface CityAccordionRow {
  label: string;
  value: string;
}

// Shape produced by tools/ta_geocode_deep.py — see app/src/data/venue-coords/<slug>.json.
export interface VenuePhoto {
  url: string;
  alt: string | null;
  credit: string | null;
}

export interface CityMapVenue {
  n: string;
  cat: "stay" | "eat" | "do" | "party";
  // Matches the guide's own tier labels (see CityGuideTier.label /
  // TIER_ICONS in CityPage.tsx) when known — shown as a small badge on the
  // map's venue card. Often an empty string: only about half of all
  // venues have this populated today, so it's rendered only when non-empty
  // rather than treated as always-present.
  tier: string;
  a: string;
  d: string;
  lat: number;
  lon: number;
  // Hand-curated, real URLs only — never geocoded/generated. Required
  // array, may be empty: only populated where a real photo has been
  // supplied (see CityMap's hasPhotos check, which also guards against an
  // accidentally-empty url).
  photos: VenuePhoto[];
}

export interface CityMapData {
  center: [number, number];
  venues: CityMapVenue[];
}
