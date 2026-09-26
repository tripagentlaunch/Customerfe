import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { geoPath, geoCentroid, geoArea } from "d3-geo";
import { geoMiller } from "d3-geo-projection";
import { feature, merge } from "topojson-client";
import type { Topology, GeometryCollection, GeometryObject } from "topojson-specification";
import worldTopology from "../data/world-countries-50m.json";
import mapTabsData from "../data/map-tabs.generated.json";
import citiesData from "../data/cities.generated.json";
import type { MapTabsData } from "../types/mapTabs";
import type { CityData } from "../types/city";
import styles from "./WorldMap.module.css";

const { world: WORLD_TAB, regions: REGION_TABS } = mapTabsData as MapTabsData;
const ALL_TABS = [WORLD_TAB, ...REGION_TABS];
// Same source CityPage.tsx itself reads its hero image from (CITIES[slug]
// .hero.image) — read live here rather than duplicating/hardcoding a URL,
// so this preview always matches whatever that page is actually showing.
const CITIES = citiesData as unknown as Record<string, CityData>;

// Real country borders (Natural Earth 50m resolution via the world-atlas npm
// package, public domain).
//
// World view: every serviced country (the 52 names across map-tabs.
// generated.json's 11 region tabs — India included, no longer a special
// case) gets its own plain outline; everything else is dissolved into one
// undemarcated background shape. Nothing inside a country is shown — the
// old per-zone sub-country splitting and per-shape size-inflation hack are
// both gone along with the "zone" concept itself: navigation happens via
// the tab bar, not by clicking individual map shapes.
const VIEW_W = 980;
const ANTARCTICA_ID = "010";

// These two tabs' World-view name label is hidden — their computed
// centroid lands somewhere that doesn't read well for a label (their own
// shape is fragmented across several small, spread-out countries, unlike
// e.g. Africa's one solid landmass), while the shape itself (outline +
// hover fill) stays exactly as-is.
const HIDDEN_LABEL_TABS = new Set(["western-europe", "southern-europe"]);
// Manual nudge (in projected map units, at the un-zoomed World scale) on
// top of the computed centroid, for a tab whose real geographic center
// still isn't where the label should sit — SE Asia's own centroid lands
// on the mainland (overlapping East Asia's own label), when the open
// water between the mainland and the archipelago reads better.
const LABEL_POSITION_OFFSET: Record<string, { dx: number; dy: number }> = {
  "southeast-asia": { dx: 39, dy: -1 },
};

// A zoomed-in region should read as the clear focus, not fill the frame:
// its own bounding box is scaled to occupy this fraction of whichever
// screen dimension is the tighter fit, leaving the rest of the canvas
// (neighbouring regions, de-emphasised via .dimmed) visible around it.
const REGION_FILL_FRACTION = 0.75;
// Per-tab multiplier on top of the fraction above, for a tab that should
// read as a bit more (or less) zoomed in than the rest.
const TAB_FILL_MULTIPLIER: Record<string, number> = {
  "western-europe": 1.43,
  "southern-europe": 1.69,
  india: 2.2265625,
  "east-asia": 1.6,
  "southeast-asia": 1.875,
};
// Shifts a tab's centering vertically after the fit above, as a fraction
// of the visible height — positive pans the content DOWN, revealing more
// of its top edge (India's cities skew north, cutting Srinagar off
// against the tab bar at the plain city-bounds center).
const TAB_PAN_Y_BIAS: Record<string, number> = {
  india: 0.08,
};

// Oceania (far east) and North America (far west, once exclaves are
// stripped — see splitMainlandAndExclaves below) sit close enough to the map's edge
// that centering them can pan past where any content was ever drawn,
// exposing blank canvas. Rather than fight that with padding math (every
// attempt either broke centering or spiralled — see the conversation this
// was built from), this draws a genuine wrapped duplicate of the whole
// map shifted a full VIEW_W to either side — geographically correct,
// since the map really does wrap at the antimeridian — so panning into
// that space reveals real content instead of nothing. The scale/centering
// formulas below are completely unchanged by this; it's purely extra
// rendering plus a wider viewBox to show it.
const WRAP_BUFFER = 350;
// The <svg>'s declared viewBox width (what actually maps 1:1 to the
// container's physical width — see the visibleViewH comment below), i.e.
// VIEW_W plus the wrapped-duplicate margin on both sides.
const VB_W = VIEW_W + WRAP_BUFFER * 2;

type CountryProps = { name: string };
const countryName = (g: GeometryObject<CountryProps>) => (g as { properties: CountryProps }).properties.name;

// Everything here is drawn fill:none/stroke-only (see WorldMap.module.css),
// so there's no need for d3's default Polygon clipping behavior, which
// closes a ring cut by the antimeridian with a synthetic edge running
// straight along the clip boundary (needed to keep a FILLED shape's area
// correct, but for us it just draws an unwanted vertical line through
// Russia/Fiji, the only two countries in this data that cross ±180). A
// LineString/MultiLineString gets clipped into open, disconnected pieces
// instead — no synthetic closing edge — so converting every ring here from
// a Polygon to the equivalent MultiLineString before it reaches path()
// removes the artifact for those two countries and is a no-op for
// everyone else (a closed ring stroked as an open line looks identical).
function toStrokeGeometry(geom: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geom.type === "Polygon") return { type: "MultiLineString", coordinates: geom.coordinates };
  if (geom.type === "MultiPolygon") return { type: "MultiLineString", coordinates: geom.coordinates.flat() };
  return geom;
}
function asStrokeFeature(f: GeoJSON.Feature): GeoJSON.Feature {
  return { ...f, geometry: toStrokeGeometry(f.geometry) };
}

// World view shows ONE dissolved shape PER REGION TAB (not one shape for
// the whole world) — India/Nepal/Bhutan merge into a single South Asia
// silhouette, Kenya/Tanzania merge into a single Africa silhouette, with
// no border between countries inside the same tab. A tab's countries
// aren't always one contiguous landmass though (Africa's Egypt sits far
// from its Kenya/Tanzania cluster; these tabs are grouped by trip-planning
// footprint, not strict geography) — in that case each disconnected
// cluster (and any genuine island) still renders as its own separate
// piece, same as real islands do; that's expected, not a bug to merge
// away. Individual country borders (India vs Nepal vs Bhutan) only show
// up once a specific tab is zoomed into, via tabCountryShapes below.
//
// Some unserviced countries sit almost entirely inside a single tab's own
// landmass (Bolivia inside Peru/Brazil/Argentina; Belgium inside the
// Western Europe cluster; Lesotho inside South Africa) — merging just the
// serviced countries leaves a real notch/bite along that border, which
// reads as a leftover internal boundary even though it's accurate. These
// get folded into their surrounding tab's merge purely so the outline is
// one clean shape — they're still not "serviced" (no cities, no tab of
// their own, no dimming distinction), just visually absorbed.
//
// That "≥50% of its own border" test only catches a country tucked
// directly against the tab's own shape — it doesn't reach a *chain* of
// unserviced countries bridging two serviced ones that are otherwise far
// apart (Egypt to Kenya/Tanzania across Sudan/Ethiopia/Uganda, none of
// which border enough of Africa's own countries to individually qualify).
// For Africa specifically the whole mainland is meant to read as one
// continuous continent regardless, so this lists every other mainland
// African country in this dataset to always fold in, on top of whatever
// the enclosure test already catches — extend this map if another tab
// (e.g. Europe, Asia) turns out to need the same treatment.
const CONTINENT_FILL: Record<string, string[]> = {
  africa: [
    "Algeria",
    "Angola",
    "Benin",
    "Botswana",
    "Burkina Faso",
    "Burundi",
    "Cameroon",
    "Central African Rep.",
    "Chad",
    "Congo",
    "Côte d'Ivoire",
    "Dem. Rep. Congo",
    "Djibouti",
    "Eq. Guinea",
    "Eritrea",
    "eSwatini",
    "Ethiopia",
    "Gabon",
    "Gambia",
    "Ghana",
    "Guinea",
    "Guinea-Bissau",
    "Lesotho",
    "Liberia",
    "Libya",
    "Malawi",
    "Mali",
    "Mauritania",
    "Mozambique",
    "Namibia",
    "Niger",
    "Nigeria",
    "Rwanda",
    "Senegal",
    "Sierra Leone",
    "Somalia",
    "Somaliland",
    "S. Sudan",
    "Sudan",
    "Togo",
    "Tunisia",
    "Uganda",
    "W. Sahara",
    "Zambia",
    "Zimbabwe",
  ],
  // Argentina/Brazil/Peru (+ the already-enclosed Bolivia/Paraguay/
  // Uruguay) leave the whole northern bulge of the continent
  // (Venezuela/Colombia/Ecuador/Guyana/Suriname) as a notch — none of
  // those individually meet the enclosure test either, same reasoning as
  // Africa above. Chile is the same story for a different reason: most of
  // its own border is Pacific coastline, not a shared land border, so it
  // never crosses the 50% threshold even though it runs the entire length
  // of the continent.
  "south-america": ["Colombia", "Venezuela", "Ecuador", "Guyana", "Suriname", "Chile"],
};
function geometryPoints(geom: GeoJSON.Geometry): GeoJSON.Position[] {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
  const pts: GeoJSON.Position[] = [];
  for (const poly of polys) for (const ring of poly) for (const p of ring) pts.push(p);
  return pts;
}
const pointKey = (p: GeoJSON.Position) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
function ringPointSet(geom: GeoJSON.Geometry): Set<string> {
  return new Set(geometryPoints(geom).map(pointKey));
}
// A country is "enclosed" by a tab once at least this fraction of its own
// border coordinates exactly coincide with that tab's dissolved outline.
const ENCLOSURE_FRACTION = 0.5;

// A few countries carry distant overseas territories in this map data
// (France's polygon includes French Guiana in South America and Réunion
// in the Indian Ocean; the USA's includes the Aleutian chain stretching
// almost to the antimeridian) that would otherwise show up as stray
// shapes far from the rest of their tab and skew that tab's own bounds.
// Earlier this used a generic "largest piece wins, anything more than N°
// away is an exclave" heuristic — but several tabs (Africa, Middle East)
// are deliberately made of widely-separated countries with no shared
// landmass at all, which that heuristic would wrongly treat as exclaves
// of each other. An explicit list of the actual known trouble spots
// avoids that: only pieces that fall in one of these boxes get pulled
// out, everything else in a tab is kept no matter how far apart. Each
// entry is also scoped to the one tab it's actually extracted FROM
// (fromTab) — a bounding box alone isn't precise enough: South America's
// own Brazil/Peru/Argentina merge happens to include a couple of small
// river-island fragments that fall inside the same rough longitude/
// latitude window as French Guiana, and without the fromTab scope those
// got wrongly pulled out of South America's own shape too.
type KnownExclave = { fromTab: string; label: string; tab?: string; matchLon: [number, number]; matchLat: [number, number] };
const KNOWN_EXCLAVES: KnownExclave[] = [
  // French Guiana is genuinely South American — reattributed there
  // instead of just discarded (matched by centroid, since none of these
  // datasets name exclaves individually).
  { fromTab: "western-europe", label: "French Guiana", tab: "south-america", matchLon: [-60, -50], matchLat: [-5, 10] },
  // Réunion (Indian Ocean) and the Aleutian chain (which straddles the
  // antimeridian, hence two boxes) aren't reattributed anywhere — just
  // dropped, same as before.
  { fromTab: "western-europe", label: "Réunion", matchLon: [54, 56], matchLat: [-22, -20] },
  { fromTab: "north-america", label: "Aleutian Islands", matchLon: [165, 180], matchLat: [50, 56] },
  { fromTab: "north-america", label: "Aleutian Islands", matchLon: [-180, -165], matchLat: [50, 56] },
];

function polyBBoxCentroid(poly: GeoJSON.Position[][]): { cx: number; cy: number } {
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lon, lat] of poly[0] as [number, number][]) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { cx: (minLon + maxLon) / 2, cy: (minLat + maxLat) / 2 };
}

function extractKnownExclaves(
  geom: GeoJSON.Geometry,
  candidates: KnownExclave[]
): {
  rest: GeoJSON.Geometry;
  extracted: { poly: GeoJSON.Position[][]; match: KnownExclave }[];
} {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : null;
  if (!polys) return { rest: geom, extracted: [] };
  const kept: typeof polys = [];
  const extracted: { poly: GeoJSON.Position[][]; match: KnownExclave }[] = [];
  for (const poly of polys) {
    const { cx, cy } = polyBBoxCentroid(poly);
    const match = candidates.find((k) => cx >= k.matchLon[0] && cx <= k.matchLon[1] && cy >= k.matchLat[0] && cy <= k.matchLat[1]);
    if (match) extracted.push({ poly, match });
    else kept.push(poly);
  }
  return { rest: { type: "MultiPolygon", coordinates: kept }, extracted };
}

// World-view destination anchors — a small, deliberately curated set of
// already-serviced cities shown directly on the World view (before any
// region is selected), so the map reads as a destination atlas instead of
// a bare outline. Every slug here must already exist in both
// cities.generated.json (for its hero image/tagline/country) AND some
// region's own `cities` list in map-tabs.generated.json (for lat/lon) —
// filtered against both below, not assumed; an entry that stops matching
// either silently drops out rather than rendering broken.
const WORLD_ANCHOR_SLUGS = ["paris", "london", "new-york", "dubai", "tokyo", "santorini"];

// World-view entrance sequence: each SERVICED REGION's own geographic
// shape pops in as one complete group, west→east, then the curated
// destination anchors fade in together once the last region has settled —
// see .regionReveal/.worldMarkersReveal in WorldMap.module.css. Order here
// is the explicit west→east list from the brief, not derived from
// geometry, but it's exactly REGION_TABS' own keys (map-tabs.generated.
// json) — nothing invented.
const REGION_POP_ORDER = [
  "north-america",
  "south-america",
  "western-europe",
  "southern-europe",
  "africa",
  "middle-east",
  "india", // REGION_TABS' own key for the "South Asia" tab (map-tabs.generated.json)
  "east-asia",
  "southeast-asia",
  "oceania",
];
const REGION_POP_STEP_MS = 120;
const REGION_POP_DURATION_S = 0.6;
// Anchors wait for the last region to finish before fading in together
// (see WORLD_ANCHOR_SLUGS below) — one collective fade, not per-marker.
const WORLD_MARKERS_DELAY_S = ((REGION_POP_ORDER.length - 1) * REGION_POP_STEP_MS) / 1000 + REGION_POP_DURATION_S;

// A zoomed-in region's own city markers (activeCityMarkers below) use a
// much shorter per-marker step, unrelated to the World-view sequence above
// — selecting a tab shouldn't feel like a wait.
const REGION_POP_STEP = 0.15;

export default function WorldMap() {
  const [activeTab, setActiveTab] = useState(WORLD_TAB.key);
  // Connects three otherwise-separate elements — a region's shape on the
  // map, its name label, and its tab-bar button — so hovering ANY one of
  // them highlights all three together. Native CSS :hover can't reach
  // across to a sibling that isn't a DOM neighbor (the tab bar button
  // lives nowhere near the map's own <g>), so this tracks it as state
  // instead and applies the SAME highlight classes from both directions.
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  // Drives the featured-destination card below — set on a city marker's own
  // hover/focus (see activeCityMarkers rendering), cleared on leave. Not
  // navigation state: clicking a marker still navigates via the existing
  // <Link to={`/city-${slug}`}>, this only tracks which city's data the
  // card should preview.
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  // Extra zoom on top of the existing per-tab fit (activeTransform below) —
  // applied as an outer transform wrapping the whole existing zoomGroup, so
  // the existing region-fit/projection math is untouched; this only scales
  // the already-computed view in/out around its own center. Reset (used by
  // the controls' "world" button) clears this back to 1 alongside jumping
  // activeTab back to World.
  const [manualZoom, setManualZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    let i = 0;
    const cycle = () => {
      setActiveTab(REGION_POP_ORDER[i % REGION_POP_ORDER.length]);
      setTimeout(() => {
        setActiveTab(WORLD_TAB.key);
        i++;
        setTimeout(cycle, 1000);
      }, 2000);
    };
    const start = setTimeout(cycle, 1000);
    return () => clearTimeout(start);
  }, []);

  // The <svg>'s viewBox covers the map's FULL height (viewH below), but
  // .canvas crops that to a fixed shorter box via CSS + preserveAspectRatio
  // "slice" (see WorldMap.module.css) — so the height that's actually on
  // screen, in viewBox units, is shorter than viewH by whatever the crop
  // ratio is. Fitting a region against the full viewH (as an earlier pass
  // did) sized it against space that isn't visible, which is what cut off
  // India's south — this measures the real visible box instead.
  const [visibleAspect, setVisibleAspect] = useState<number | null>(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setVisibleAspect(rect.width / rect.height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Gates the marker pop-in (see .revealed in WorldMap.module.css) on the
  // map actually being scrolled into view — it mounts immediately with the
  // rest of the homepage, well below the fold, so triggering the reveal on
  // mount alone would almost always finish playing before anyone scrolls
  // down to see it. Fires once and disconnects: this is "has the section
  // been seen yet", not a repeating scroll-position watcher, so nothing is
  // left running after that first entry.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || revealed) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  const { backgroundD, tabFillD, tabShapes, tabLabelPos, tabCountryShapes, viewH, regionBounds, cityProjector } = useMemo(() => {
    const topology = worldTopology as unknown as Topology;
    const countries = topology.objects.countries as GeometryCollection<CountryProps>;
    const servicedNames = new Set(WORLD_TAB.countries);

    const nonAntarctic = countries.geometries.filter((g) => String(g.id) !== ANTARCTICA_ID);
    const backgroundGeomsAll = nonAntarctic.filter((g) => !servicedNames.has(countryName(g)));
    const servicedGeoms = nonAntarctic.filter((g) => servicedNames.has(countryName(g)));
    const geomsByName = new Map(nonAntarctic.map((g) => [countryName(g), g]));

    // First pass: merge each tab's own serviced countries alone, purely to
    // find which unserviced countries are enclosed by exactly one of them
    // (see the geometryPoints/ENCLOSURE_FRACTION comment above).
    const tabGeomsByKey: Record<string, GeometryObject<CountryProps>[]> = {};
    const tabPointSets: Record<string, Set<string>> = {};
    for (const tab of REGION_TABS) {
      const tabGeoms = servicedGeoms.filter((g) => tab.countries.includes(countryName(g)));
      if (tabGeoms.length === 0) continue;
      tabGeomsByKey[tab.key] = tabGeoms;
      tabPointSets[tab.key] = ringPointSet(merge(topology, tabGeoms as unknown as Parameters<typeof merge>[1]));
    }
    const enclosedGeomsByTab: Record<string, GeometryObject<CountryProps>[]> = {};
    const enclosedNames = new Set<string>();
    for (const g of backgroundGeomsAll) {
      const pts = geometryPoints((feature(topology, g) as GeoJSON.Feature).geometry);
      if (pts.length === 0) continue;
      let bestKey: string | null = null;
      let bestFrac = 0;
      for (const [key, set] of Object.entries(tabPointSets)) {
        const matched = pts.filter((p) => set.has(pointKey(p))).length;
        const frac = matched / pts.length;
        if (frac > bestFrac) {
          bestFrac = frac;
          bestKey = key;
        }
      }
      if (bestKey && bestFrac >= ENCLOSURE_FRACTION) {
        (enclosedGeomsByTab[bestKey] ??= []).push(g);
        enclosedNames.add(countryName(g));
      }
    }
    // Explicit continent fill (see CONTINENT_FILL above) — added on top of
    // whatever the enclosure test already caught, for tabs like Africa
    // where a whole chain of unserviced countries bridges two serviced
    // ones without any single one being individually "enclosed".
    for (const [tabKey, names] of Object.entries(CONTINENT_FILL)) {
      for (const name of names) {
        if (enclosedNames.has(name)) continue;
        const g = geomsByName.get(name);
        if (!g) continue;
        (enclosedGeomsByTab[tabKey] ??= []).push(g);
        enclosedNames.add(name);
      }
    }
    // Folded-in countries are dropped from the background so they aren't
    // also drawn separately with their own (now-redundant) border.
    const backgroundGeoms = backgroundGeomsAll.filter((g) => !enclosedNames.has(countryName(g)));
    const backgroundFeatures = backgroundGeoms.map((g) => feature(topology, g) as GeoJSON.Feature);

    // Those folded-in countries still need to render SOMEWHERE once their
    // own tab is the active one — the tab's blob (which is where they'd
    // otherwise show, dissolved in) gets swapped out for individual
    // country shapes then (see tabCountryFeatures below), so without this
    // they'd vanish from the map entirely instead of staying as faint
    // background context, unlike every other tab's surroundings.
    const tabFillFeatures: Record<string, GeoJSON.Feature> = {};
    for (const [tabKey, geoms] of Object.entries(enclosedGeomsByTab)) {
      if (geoms.length === 0) continue;
      tabFillFeatures[tabKey] = {
        type: "Feature",
        properties: {},
        geometry: merge(topology, geoms as unknown as Parameters<typeof merge>[1]),
      };
    }

    // Second pass: each region tab's own countries, PLUS any countries
    // enclosed by it above, dissolved into one shape (see the
    // KNOWN_EXCLAVES comment above) before fitting/projecting, so a stray
    // exclave (French Guiana, the Aleutians) doesn't skew the whole
    // world's own fit bounds any more than it skews its tab's.
    const reassignedByTab: Record<string, { feature: GeoJSON.Feature; label: string }[]> = {};
    const tabRestFeatures: { key: string; feature: GeoJSON.Feature }[] = [];
    for (const tab of REGION_TABS) {
      const tabGeoms = tabGeomsByKey[tab.key];
      if (!tabGeoms || tabGeoms.length === 0) continue;
      const mergeInput = [...tabGeoms, ...(enclosedGeomsByTab[tab.key] ?? [])];
      const merged = merge(topology, mergeInput as unknown as Parameters<typeof merge>[1]);
      const { rest, extracted } = extractKnownExclaves(
        merged,
        KNOWN_EXCLAVES.filter((k) => k.fromTab === tab.key)
      );
      tabRestFeatures.push({ key: tab.key, feature: { type: "Feature", properties: {}, geometry: rest } });
      for (const ex of extracted) {
        if (!ex.match.tab) continue;
        (reassignedByTab[ex.match.tab] ??= []).push({
          feature: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: ex.poly } },
          label: ex.match.label,
        });
      }
    }
    const allReassigned = Object.entries(reassignedByTab).flatMap(([tabKey, feats]) =>
      feats.map((f, i) => ({ key: `${tabKey}-exclave-${i}`, tabKey, feature: f.feature }))
    );

    // Individual per-country shapes (real, un-dissolved borders) for each
    // tab's own countries — World view (and every OTHER tab, while one is
    // zoomed in) uses the merged blob above instead, but the ACTIVE tab
    // switches to these once selected, per the "only zooming into a tab
    // reveals its countries' own borders" design. Known exclaves are
    // stripped the same way as the merged version (so e.g. the USA's own
    // shape here doesn't include the Aleutian sliver) — the extracted
    // piece isn't re-collected here since the tab-level merge above
    // already produced it once; instead a reassigned piece (French Guiana)
    // is folded into the TARGET tab's own country list below.
    const tabCountryFeatures: Record<string, { key: string; feature: GeoJSON.Feature }[]> = {};
    for (const tab of REGION_TABS) {
      const tabGeoms = tabGeomsByKey[tab.key];
      if (!tabGeoms) continue;
      const candidates = KNOWN_EXCLAVES.filter((k) => k.fromTab === tab.key);
      tabCountryFeatures[tab.key] = tabGeoms.map((g) => {
        const f = feature(topology, g) as GeoJSON.Feature;
        const { rest } = extractKnownExclaves(f.geometry, candidates);
        return { key: countryName(g), feature: { ...f, geometry: rest } };
      });
    }
    for (const r of allReassigned) {
      (tabCountryFeatures[r.tabKey] ??= []).push({ key: r.key, feature: r.feature });
    }

    // Miller cylindrical: stays fully rectangular (straight meridians and
    // parallels, no curved edges like Natural Earth) but — unlike plain
    // equirectangular — stretches high-latitude land vertically, so Russia/
    // Canada/Greenland keep recognizable shapes instead of looking flattened.
    // `fitWidth` (not `fitSize`) so the projection scales uniformly and
    // keeps its true aspect ratio — `fitSize` stretches non-uniformly to
    // fill an exact box, which is what was squishing the map top-to-bottom.
    const allForFit = {
      type: "FeatureCollection",
      features: [...tabRestFeatures.map((t) => t.feature), ...allReassigned.map((r) => r.feature), ...backgroundFeatures],
    } as const;
    const projection = geoMiller().fitWidth(VIEW_W, allForFit as unknown as GeoJSON.FeatureCollection);
    const path = geoPath(projection);
    const [[, y0], [, y1]] = path.bounds(allForFit as unknown as GeoJSON.FeatureCollection);
    const viewH = Math.ceil(y1 - y0);

    const background = merge(topology, backgroundGeoms as unknown as Parameters<typeof merge>[1]);
    const backgroundD = path(toStrokeGeometry(background)) ?? "";

    const tabFillD: Record<string, string> = Object.fromEntries(
      Object.entries(tabFillFeatures).map(([tabKey, f]) => [tabKey, path(asStrokeFeature(f)) ?? ""])
    );

    const tabShapes = [
      ...tabRestFeatures.map((t) => ({ key: t.key, tabKey: t.key, d: path(asStrokeFeature(t.feature)) ?? "" })),
      ...allReassigned.map((r) => ({ key: r.key, tabKey: r.tabKey, d: path(asStrokeFeature(r.feature)) ?? "" })),
    ];

    // Where each region's name label sits in World view — the real
    // (area-weighted) geographic centroid of its own dissolved shape, not
    // a bounding-box center: a bbox center falls badly outside the actual
    // landmass for an elongated or irregular shape (South America's bbox
    // center, weighted by its long thin Patagonian tail, landed south of
    // the continent's real bulk; Oceania's landed off Tasmania instead of
    // inside Australia). geoCentroid computes this on the ORIGINAL lon/lat
    // geometry (weighted by true spherical area) rather than in already-
    // projected coordinates, then that one point is projected directly —
    // the same approach cityProjector uses for a city's own point below.
    //
    // For a tab whose countries aren't one contiguous landmass (Middle
    // East: Turkey, Jordan, the Gulf states — hundreds of km apart with
    // nothing of its own in between), centroid-of-everything falls in the
    // GAP between pieces, on neither of them. Centroid-of-the-LARGEST-
    // piece-only avoids that generally, not just for this one tab.
    const tabLabelPos: Record<string, { x: number; y: number }> = {};
    for (const t of tabRestFeatures) {
      const geom = t.feature.geometry;
      const centroidSource: GeoJSON.Feature =
        geom.type === "MultiPolygon" && geom.coordinates.length > 1
          ? (() => {
              let largest = geom.coordinates[0];
              let largestArea = -Infinity;
              for (const poly of geom.coordinates) {
                const a = geoArea({ type: "Polygon", coordinates: poly });
                if (a > largestArea) {
                  largestArea = a;
                  largest = poly;
                }
              }
              return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: largest } };
            })()
          : (t.feature as unknown as GeoJSON.Feature);
      const [lon, lat] = geoCentroid(centroidSource);
      const projected = projection([lon, lat]);
      let x: number, y: number;
      if (projected) {
        [x, y] = projected;
      } else {
        // geoCentroid can only fail to project for a truly degenerate
        // shape (none of ours) — falls back to the plain bbox center.
        const [[bx0, by0], [bx1, by1]] = path.bounds(t.feature as unknown as GeoJSON.Feature);
        x = (bx0 + bx1) / 2;
        y = (by0 + by1) / 2;
      }
      const offset = LABEL_POSITION_OFFSET[t.key];
      tabLabelPos[t.key] = { x: x + (offset?.dx ?? 0), y: y + (offset?.dy ?? 0) };
    }

    const tabCountryShapes: Record<string, { key: string; d: string }[]> = Object.fromEntries(
      Object.entries(tabCountryFeatures).map(([tabKey, feats]) => [
        tabKey,
        feats.map((f) => ({ key: f.key, d: path(asStrokeFeature(f.feature)) ?? "" })),
      ])
    );

    // Zoom-fit bounding box per region tab, in the same projected
    // coordinate space as everything above — turning these into actual
    // zoom transforms needs the real visible aspect ratio (measured from
    // the DOM, see visibleAspect), so that step happens separately below.
    //
    // Fit to where the tab's own CITIES actually are, not the full
    // country landmass — North America's serviced cities all sit between
    // Vancouver and Mexico City, but Canada's own shape stretches to the
    // Arctic; fitting the full country bounds would zoom out to fit all
    // that empty land and shrink the part anyone's actually visiting.
    // Padded so cities aren't flush against the frame edge; falls back to
    // the full dissolved shape's bounds for the rare tab with no cities.
    const CITY_BOUNDS_PADDING_FRACTION = 0.25;
    const CITY_BOUNDS_MIN_PADDING = 40;
    const regionBounds: Record<string, { x0: number; y0: number; x1: number; y1: number }> = {};
    for (const t of tabRestFeatures) {
      const tabCities = REGION_TABS.find((r) => r.key === t.key)?.cities ?? [];
      let cx0 = Infinity,
        cy0 = Infinity,
        cx1 = -Infinity,
        cy1 = -Infinity;
      for (const city of tabCities) {
        const p = projection([city.lon, city.lat]);
        if (!p) continue;
        const [x, y] = p;
        if (x < cx0) cx0 = x;
        if (x > cx1) cx1 = x;
        if (y < cy0) cy0 = y;
        if (y > cy1) cy1 = y;
      }
      if (cx0 <= cx1 && cy0 <= cy1) {
        const padX = Math.max((cx1 - cx0) * CITY_BOUNDS_PADDING_FRACTION, CITY_BOUNDS_MIN_PADDING);
        const padY = Math.max((cy1 - cy0) * CITY_BOUNDS_PADDING_FRACTION, CITY_BOUNDS_MIN_PADDING);
        regionBounds[t.key] = { x0: cx0 - padX, y0: cy0 - padY, x1: cx1 + padX, y1: cy1 + padY };
      } else {
        const [[bx0, by0], [bx1, by1]] = path.bounds(t.feature as unknown as GeoJSON.Feature);
        regionBounds[t.key] = { x0: bx0, y0: by0, x1: bx1, y1: by1 };
      }
    }

    // Cities are plain [lon, lat] points (see MapCity), projected directly
    // with the same projection rather than going through path() — no
    // geometry to trace, just a coordinate.
    const cityProjector = (lon: number, lat: number) => projection([lon, lat]);

    return { backgroundD, tabFillD, tabShapes, tabLabelPos, tabCountryShapes, viewH, regionBounds, cityProjector };
  }, []);

  // World-view anchors (see WORLD_ANCHOR_SLUGS above) — resolved against
  // the real per-region city list (for lat/lon, projected the same way
  // activeCityMarkers projects its own cities) and real CityData (for the
  // image/name shown). Only ever computed once, same as the projection
  // itself.
  const worldAnchors = useMemo(() => {
    const bySlug = new Map(REGION_TABS.flatMap((t) => t.cities.map((c) => [c.slug, c])));
    return WORLD_ANCHOR_SLUGS.map((slug) => {
      const city = bySlug.get(slug);
      const cityData = CITIES[slug];
      if (!city || !cityData?.hero.image) return null;
      const p = cityProjector(city.lon, city.lat);
      if (!p) return null;
      return { key: slug, slug, name: cityData.hero.name ?? city.name, x: p[0], y: p[1], image: cityData.hero.image };
    })
      .filter((a): a is { key: string; slug: string; name: string; x: number; y: number; image: string } => a !== null)
      // West → east reveal order (see the pop-in stagger below) — sorted by
      // each anchor's own projected x, not declaration order, so it stays
      // correct regardless of what order WORLD_ANCHOR_SLUGS lists them in.
      .sort((a, b) => a.x - b.x);
  }, [cityProjector]);

  // Applied to a <g> wrapping all paths (a plain CSS `transform` — not an
  // animated viewBox, which doesn't transition natively). World = identity.
  // Falls back to the full viewH (pre-measurement, briefly) so nothing
  // throws before the first ResizeObserver callback lands.
  //
  // preserveAspectRatio="xMidYMin slice" (see the <svg> below) scales the
  // viewBox uniformly by whichever ratio is LARGER — container-width/VB_W
  // or container-height/viewH — so it always fully covers the container,
  // cropping whichever axis has room to spare. Which axis "wins" depends
  // on how the container's own aspect ratio (visibleAspect) compares to
  // the viewBox's (VB_W/viewH): a container relatively WIDER than the
  // viewBox crops height (visible height < viewH, the case this used to
  // assume unconditionally); a container relatively NARROWER than the
  // viewBox — true for most normal browser widths once WRAP_BUFFER made
  // the viewBox this wide — instead crops width and shows the FULL
  // height uncropped. Getting this wrong (as an earlier version did, by
  // always assuming the width-cropped case) understates how much height
  // is actually visible and throws off the vertical centering below.
  const { tabTransforms, tabScales } = useMemo(() => {
    const viewBoxAspect = VB_W / viewH;
    const visibleViewH = !visibleAspect ? viewH : visibleAspect >= viewBoxAspect ? VB_W / visibleAspect : viewH;
    const transforms: Record<string, string> = { [WORLD_TAB.key]: "translate(0 0) scale(1)" };
    const scales: Record<string, number> = { [WORLD_TAB.key]: 1 };
    for (const [key, b] of Object.entries(regionBounds)) {
      const boxW = b.x1 - b.x0;
      const boxH = b.y1 - b.y0;
      const scale = REGION_FILL_FRACTION * (TAB_FILL_MULTIPLIER[key] ?? 1) * Math.min(VIEW_W / boxW, visibleViewH / boxH);
      const cx = (b.x0 + b.x1) / 2;
      const cy = (b.y0 + b.y1) / 2;
      // Always dead-centered, even for a region near the edge of the world
      // (Oceania, at the far right; North America, at the far left) — no
      // clamping. This is unchanged from before; what's different is that
      // WRAP_BUFFER + the duplicated <g>s below now give these two
      // something real to pan into instead of blank canvas.
      const tx = VIEW_W / 2 - cx * scale;
      const ty = visibleViewH / 2 - cy * scale + (TAB_PAN_Y_BIAS[key] ?? 0) * visibleViewH;
      transforms[key] = `translate(${tx} ${ty}) scale(${scale})`;
      scales[key] = scale;
    }
    return { tabTransforms: transforms, tabScales: scales };
  }, [regionBounds, visibleAspect, viewH]);

  const isZoomedIn = activeTab !== WORLD_TAB.key;
  const activeTransform = tabTransforms[activeTab] ?? tabTransforms[WORLD_TAB.key];
  // Markers (city dots + labels) sit inside the same scaled/transformed
  // <g> as everything else (so they pan/zoom in lockstep and land in
  // whichever wrapped-duplicate copy is actually visible) — each one
  // counter-scales by 1/activeScale so it stays a constant screen size
  // instead of growing with the zoom.
  const activeScale = tabScales[activeTab] ?? 1;

  // Some tabs span a huge area (Southern Europe runs Lisbon to Budapest to
  // Santorini) while also containing cities only tens of km apart (Milan/
  // Lake Como/Venice) — no single zoom level can both fit the whole tab
  // AND keep those close-together labels from overlapping. Rather than
  // shoving a crowded label straight down and away from its own dot, this
  // tries a ring of candidate positions actually around the dot (right,
  // corners, above, below, left) and picks the first that doesn't overlap
  // an already-placed label, so a label always stays right next to the
  // city it names. Dots themselves are never moved — only which side the
  // label sits on. Distances are compared in "projected units ×
  // activeScale", which tracks final on-screen pixel distance (the
  // counter-scale on each marker's own <g> cancels activeScale for its
  // own size, so a label offset in local units stays a constant screen
  // size — comparing candidate positions the same way, scaled up by
  // activeScale, keeps both sides of the check in the same units).
  const LABEL_CHAR_W = 6.3;
  const LABEL_PAD = 6;
  const LABEL_H = 13;
  // Preference order: straight right first (the default, most legible),
  // then the corners, then straight up/down, then left — a label anchored
  // "end" (left-of-dot) is read last since it's the least natural.
  const LABEL_CANDIDATES: { dx: number; dy: number; anchor: "start" | "middle" | "end" }[] = [
    { dx: 9, dy: 4, anchor: "start" },
    { dx: 8, dy: 16, anchor: "start" },
    { dx: 8, dy: -8, anchor: "start" },
    { dx: 0, dy: 18, anchor: "middle" },
    { dx: 0, dy: -10, anchor: "middle" },
    { dx: -9, dy: 4, anchor: "end" },
    { dx: -8, dy: 16, anchor: "end" },
    { dx: -8, dy: -8, anchor: "end" },
  ];
  const DOT_CLEARANCE = 9;
  const activeCityMarkers = useMemo(() => {
    if (!isZoomedIn) return [];
    const cities = REGION_TABS.find((t) => t.key === activeTab)?.cities ?? [];
    const projected = cities.map((city) => {
      const p = cityProjector(city.lon, city.lat);
      return p ? { city, x: p[0], y: p[1], sx: p[0] * activeScale, sy: p[1] * activeScale } : null;
    });
    // Every OTHER city's dot is a no-go zone for a label from the start —
    // without this, a label could win a "doesn't overlap any label" check
    // while still landing right on top of a nearby city's dot, reading as
    // if it names that city instead (Phuket's label ending up on
    // Langkawi's dot, two cities apart on the map). A city's own dot is
    // excluded from its own check below, since every candidate sits right
    // next to it by design.
    const dotRects = projected.map((p) =>
      p ? { x0: p.sx - DOT_CLEARANCE, x1: p.sx + DOT_CLEARANCE, y0: p.sy - DOT_CLEARANCE, y1: p.sy + DOT_CLEARANCE } : null
    );
    const placedLabelRects: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const markers: {
      key: string;
      slug: string;
      name: string;
      x: number;
      y: number;
      labelDx: number;
      labelDy: number;
      anchor: "start" | "middle" | "end";
    }[] = [];
    projected.forEach((p, i) => {
      if (!p) return;
      const { city, x, y, sx, sy } = p;
      const textW = city.name.length * LABEL_CHAR_W + LABEL_PAD;

      const rectFor = (c: (typeof LABEL_CANDIDATES)[number]) => {
        const cx = sx + c.dx + (c.anchor === "start" ? textW / 2 : c.anchor === "end" ? -textW / 2 : 0);
        const cy = sy + c.dy - LABEL_H / 2;
        return { x0: cx - textW / 2, x1: cx + textW / 2, y0: cy, y1: cy + LABEL_H };
      };
      const obstacles = [...dotRects.filter((_, j) => j !== i), ...placedLabelRects].filter(
        (q): q is { x0: number; x1: number; y0: number; y1: number } => q !== null
      );
      const overlaps = (r: ReturnType<typeof rectFor>) =>
        obstacles.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);

      let chosen = LABEL_CANDIDATES[0];
      let chosenRect = rectFor(chosen);
      for (const candidate of LABEL_CANDIDATES) {
        const rect = rectFor(candidate);
        if (!overlaps(rect)) {
          chosen = candidate;
          chosenRect = rect;
          break;
        }
      }
      placedLabelRects.push(chosenRect);
      markers.push({
        key: city.slug,
        slug: city.slug,
        name: city.name,
        x,
        y,
        labelDx: chosen.dx,
        labelDy: chosen.dy,
        anchor: chosen.anchor,
      });
    });
    // Sorted by x for the pop-in stagger below (west → east) — done AFTER
    // the label-collision pass above, which must run in the cities' own
    // declared order (it's what tabCities.forEach already used), not
    // reordered by this.
    return markers.slice().sort((a, b) => a.x - b.x);
  }, [activeTab, isZoomedIn, activeScale, cityProjector]);

  // West→east delay for a serviced region's own group (see REGION_POP_ORDER
  // above) — every REGION_TABS key appears in that list, so the fallback
  // only matters if map-tabs.generated.json ever adds a region without
  // updating it too.
  const regionPopDelay = (tabKey: string) => {
    const idx = REGION_POP_ORDER.indexOf(tabKey);
    return `${(idx >= 0 ? idx : 0) * (REGION_POP_STEP_MS / 1000)}s`;
  };

  const mapBody = (
    <>
      <path
        className={`${styles.background} ${isZoomedIn ? styles.dimmed : ""}`}
        d={backgroundD}
        vectorEffect="non-scaling-stroke"
      />
      {/* The active tab's own folded-in countries (see tabFillFeatures
          above) — Sudan/Chad/Nigeria/etc for Africa — normally show as
          part of its dissolved blob, but that blob is swapped out for
          individual country shapes once the tab is active, so without
          this they'd disappear instead of staying visible as faint
          background context like every other tab's surroundings do. */}
      {isZoomedIn && tabFillD[activeTab] && (
        <path className={styles.background} d={tabFillD[activeTab]} vectorEffect="non-scaling-stroke" />
      )}
      {tabShapes.map((c) => {
        // A tab's own merged blob (key === tabKey, vs a reassigned exclave
        // piece like French Guiana) is swapped out for its real,
        // un-dissolved country shapes below once that tab is the active
        // one — World view, and every other (dimmed) tab, still use the
        // blob.
        const isBlob = c.key === c.tabKey;
        if (isBlob && isZoomedIn && c.tabKey === activeTab) return null;
        const isActive = isZoomedIn && c.tabKey === activeTab;
        const isOtherDimmed = isZoomedIn && c.tabKey !== activeTab;
        const shapePath = (
          <path
            className={`${styles.country} ${isActive ? styles.active : ""} ${isOtherDimmed ? styles.dimmed : ""}`}
            d={c.d}
            vectorEffect="non-scaling-stroke"
          />
        );
        // World view only: hovering a region's shape tints it (and its
        // name, when shown) together, via the shared .regionGroup wrapper
        // — no group at all for a reassigned exclave piece like French
        // Guiana, or once zoomed into any tab, since there's nothing to
        // hover-highlight there. The label itself is separately withheld
        // for a couple of tabs (HIDDEN_LABEL_TABS) whose shape doesn't
        // read well with a name on it, but the hover-fill still applies.
        // A reassigned exclave piece (French Guiana) or any tab once
        // zoomed in — still gets the SAME west→east reveal as its own
        // tab's main shape (same --pop-delay lookup), just without the
        // hoverable/clickable .regionGroup wrapper below, which only makes
        // sense for World view's own selectable blobs.
        if (!isBlob || isZoomedIn)
          return (
            <g
              key={c.key}
              className={styles.regionReveal}
              style={{ "--pop-delay": regionPopDelay(c.tabKey) } as CSSProperties}
            >
              {shapePath}
            </g>
          );
        const label = !HIDDEN_LABEL_TABS.has(c.tabKey) ? tabLabelPos[c.tabKey] : null;
        const tabInfo = REGION_TABS.find((t) => t.key === c.tabKey);
        return (
          <g
            key={c.key}
            className={`${styles.regionGroup} ${hoveredTab === c.tabKey ? styles.regionHovered : ""}`}
            onMouseEnter={() => setHoveredTab(c.tabKey)}
            onMouseLeave={() => setHoveredTab((k) => (k === c.tabKey ? null : k))}
            onClick={() => setActiveTab(c.tabKey)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActiveTab(c.tabKey);
            }}
          >
            {/* The region's own complete geographic group (shape + name)
                pops in together as one unit — see .regionReveal in
                WorldMap.module.css — independent of this outer group's own
                hover/click handling, which stays attached at rest. */}
            <g className={styles.regionReveal} style={{ "--pop-delay": regionPopDelay(c.tabKey) } as CSSProperties}>
              {shapePath}
              {label &&
                tabInfo &&
                (() => {
                  // Multi-word names wrap onto their own line per word (every
                  // current multi-word label happens to be exactly two words)
                  // so the label reads as a compact block rather than a wide
                  // strip that overlaps a neighbouring region's own name —
                  // centered vertically on the region's centroid regardless
                  // of line count via the dy offsets below, not just stacked
                  // downward from it.
                  const words = tabInfo.label.split(" ");
                  return (
                    <text
                      className={styles.regionLabel}
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      vectorEffect="non-scaling-stroke"
                    >
                      {words.map((word, i) => (
                        <tspan key={i} x={label.x} dy={i === 0 ? `${-(words.length - 1) * 0.55}em` : "1.1em"}>
                          {word}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
            </g>
          </g>
        );
      })}
      {isZoomedIn &&
        (tabCountryShapes[activeTab] ?? []).map((c) => (
          <path
            key={`active-country-${c.key}`}
            className={`${styles.country} ${styles.active}`}
            d={c.d}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      {/* Labels paint first (SVG has no z-index — later-drawn elements sit
          on top of earlier ones), so every dot and its hover preview
          square below always show up above every city's name, not just
          its own. */}
      {activeCityMarkers.map((m, i) => (
        <g key={`label-${m.key}`} transform={`translate(${m.x} ${m.y}) scale(${1 / activeScale})`}>
          <g className={styles.markerReveal} style={{ "--pop-delay": `${i * REGION_POP_STEP}s` } as CSSProperties}>
            <text className={styles.cityLabel} x={m.labelDx} y={4 + m.labelDy} textAnchor={m.anchor}>
              {m.name}
            </text>
          </g>
        </g>
      ))}
      {/* Dots + their hover preview painted last, so they always sit above
          every label and every other city's dot. */}
      {activeCityMarkers.map((m, i) => {
        // Same image CityPage.tsx's own hero section reads (CITIES[slug]
        // .hero.image) — sourced live, not hardcoded, so if that page's
        // hero image ever changes, this preview follows automatically.
        const heroImage = CITIES[m.slug]?.hero.image ?? null;
        const px = -40.5,
          py = -95,
          pw = 81,
          ph = 81,
          pr = 5;
        return (
          <Link
            key={m.key}
            to={`/city-${m.slug}`}
            className={styles.cityMarker}
            onMouseEnter={() => setHoveredCity(m.slug)}
            onMouseLeave={() => setHoveredCity((s) => (s === m.slug ? null : s))}
            onFocus={() => setHoveredCity(m.slug)}
            onBlur={() => setHoveredCity((s) => (s === m.slug ? null : s))}
          >
            <g transform={`translate(${m.x} ${m.y}) scale(${1 / activeScale})`}>
              {/* Region view's own (shorter/faster) west→east pop-in — see
                  REGION_POP_STEP below; independent from the hover styling
                  on .cityDot/.cityPreview, which stays a plain CSS
                  transition unaffected by this one-shot entrance animation. */}
              <g className={styles.markerReveal} style={{ "--pop-delay": `${i * REGION_POP_STEP}s` } as CSSProperties}>
              <circle className={styles.cityDot} r={5} vectorEffect="non-scaling-stroke" />
              {/* Image placeholder — painted after (so on top of) the dot,
                  since it should cover it while showing, not sit behind
                  it. Appears above the dot on hover, after a brief delay
                  (so it doesn't flicker in while just passing over), but
                  disappears the instant the cursor leaves (see the
                  asymmetric transition-delay in WorldMap.module.css).
                  Falls back to a plain swatch when a city has no hero
                  image yet. */}
              <g className={styles.cityPreview}>
                {heroImage && (
                  <clipPath id={`cityClip-${m.key}`}>
                    <rect x={px} y={py} width={pw} height={ph} rx={pr} />
                  </clipPath>
                )}
                <rect
                  className={styles.cityPreviewBg}
                  x={px}
                  y={py}
                  width={pw}
                  height={ph}
                  rx={pr}
                  vectorEffect="non-scaling-stroke"
                />
                {heroImage && (
                  <image
                    href={heroImage}
                    x={px}
                    y={py}
                    width={pw}
                    height={ph}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#cityClip-${m.key})`}
                  />
                )}
              </g>
              </g>
            </g>
          </Link>
        );
      })}
      {/* Premium destination anchors — World view only (see worldAnchors
          above); a deliberately small, curated set, not every serviced
          city, so the map reads as an edited destination atlas rather than
          the full (much busier) region-view marker set. Fade in together,
          ONE beat after the last region's own group finishes settling
          (WORLD_MARKERS_DELAY_S) — not staggered per marker, so the
          sequence reads as "regions, then destinations" rather than more
          points popping individually. Remounts (and so replays) each time
          World view is (re)entered, since these only render at all while
          !isZoomedIn. */}
      {!isZoomedIn && (
        <g
          className={styles.worldMarkersReveal}
          style={{ "--pop-delay": `${WORLD_MARKERS_DELAY_S}s` } as CSSProperties}
        >
          {worldAnchors.map((a) => (
            <Link
              key={`anchor-${a.key}`}
              to={`/city-${a.slug}`}
              className={styles.worldAnchor}
              onMouseEnter={() => setHoveredCity(a.slug)}
              onMouseLeave={() => setHoveredCity((s) => (s === a.slug ? null : s))}
              onFocus={() => setHoveredCity(a.slug)}
              onBlur={() => setHoveredCity((s) => (s === a.slug ? null : s))}
            >
              <g transform={`translate(${a.x} ${a.y})`}>
                {/* .anchorScale's own hover transform stays independent of
                    the collective entrance fade above. */}
                <g className={styles.anchorScale}>
                  <circle className={styles.anchorRing} r={11} vectorEffect="non-scaling-stroke" />
                  <clipPath id={`anchorClip-${a.key}`}>
                    <circle r={8} />
                  </clipPath>
                  <image
                    href={a.image}
                    x={-8}
                    y={-8}
                    width={16}
                    height={16}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#anchorClip-${a.key})`}
                    className={styles.anchorImage}
                  />
                  <text className={styles.anchorLabel} x={0} y={25} textAnchor="middle">
                    {a.name}
                  </text>
                </g>
              </g>
            </Link>
          ))}
        </g>
      )}
    </>
  );

  const activeTabInfo = ALL_TABS.find((t) => t.key === activeTab);

  // Featured destination card: on a zoomed-in region, defaults to that
  // region's first city; on World view, defaults to the first of the
  // curated worldAnchors (see above) — either way then follows whichever
  // marker is actually hovered/focused. Pulls only fields CityData already
  // has (see types/city.ts) rather than inventing any.
  const featuredSlug = isZoomedIn
    ? (hoveredCity ?? activeCityMarkers[0]?.slug ?? null)
    : (hoveredCity ?? worldAnchors[0]?.slug ?? null);
  const featuredMarker = featuredSlug
    ? ((isZoomedIn ? activeCityMarkers : worldAnchors).find((m) => m.slug === featuredSlug) ?? null)
    : null;
  const featuredCityData = featuredSlug ? CITIES[featuredSlug] : null;
  const featured =
    featuredSlug && featuredMarker
      ? {
          slug: featuredSlug,
          name: featuredCityData?.hero.name ?? featuredMarker.name,
          country: featuredCityData?.hero.breadcrumbCountry?.label ?? null,
          image: featuredCityData?.hero.image ?? null,
          description: featuredCityData?.hero.tagline ?? featuredCityData?.ourTake.lede ?? null,
        }
      : null;

  const MIN_ZOOM = 0.7;
  const MAX_ZOOM = 2.5;
  const zoomIn = () => setManualZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setManualZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)));
  const resetView = () => {
    setManualZoom(1);
    setActiveTab(WORLD_TAB.key);
  };

  return (
    <div className={styles.mapArea}>
      <div className={`${styles.canvas} ${revealed ? styles.revealed : ""}`} ref={canvasRef}>
        {isZoomedIn && activeTabInfo && (
          <div className={styles.breadcrumb} aria-hidden="true">
            <button type="button" onClick={() => setActiveTab(WORLD_TAB.key)}>
              World
            </button>
            <span>/</span>
            <span className={styles.breadcrumbCurrent}>{activeTabInfo.label}</span>
          </div>
        )}
        <div className={`cg-tabs ${styles.tabs}`} role="tablist" aria-label="Map region">
          {ALL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={tab.key === activeTab}
              className={hoveredTab === tab.key ? styles.tabHovered : undefined}
              onClick={() => setActiveTab(tab.key)}
              onMouseEnter={() => setHoveredTab(tab.key)}
              onMouseLeave={() => setHoveredTab((k) => (k === tab.key ? null : k))}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <svg
          className={styles.map}
          viewBox={`${-WRAP_BUFFER} 0 ${VB_W} ${viewH}`}
          preserveAspectRatio="xMidYMin slice"
          role="img"
          aria-label="World map of the regions TripAgent covers"
        >
          {/* Extra zoom on top of the region fit below (see manualZoom
              above) — a plain outer transform around the viewBox's own
              center, so it composes with activeTransform instead of
              replacing/duplicating its fit math. */}
          <g
            className={styles.manualZoomGroup}
            transform={`translate(${VIEW_W / 2} ${viewH / 2}) scale(${manualZoom}) translate(${-VIEW_W / 2} ${-viewH / 2})`}
          >
            <g className={styles.zoomGroup} transform={activeTransform}>
              <g
                transform={`translate(${-VIEW_W} 0)`}
                aria-hidden="true"
                className={isZoomedIn ? undefined : styles.wrapGhost}
              >
                {mapBody}
              </g>
              {mapBody}
              <g
                transform={`translate(${VIEW_W} 0)`}
                aria-hidden="true"
                className={isZoomedIn ? undefined : styles.wrapGhost}
              >
                {mapBody}
              </g>
            </g>
          </g>
        </svg>
        <div className={styles.mapControls}>
          <button type="button" onClick={zoomIn} disabled={manualZoom >= MAX_ZOOM} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={zoomOut} disabled={manualZoom <= MIN_ZOOM} aria-label="Zoom out">
            &minus;
          </button>
          <button type="button" onClick={resetView} aria-label="Reset to world view">
            World
          </button>
        </div>
      </div>
      {featured && (
        <Link
          key={featured.slug}
          to={`/city-${featured.slug}`}
          className={styles.featuredCard}
          onMouseEnter={() => setHoveredCity(featured.slug)}
          onMouseLeave={() => setHoveredCity((s) => (s === featured.slug ? null : s))}
        >
          {featured.image && (
            <div className={styles.featuredImgWrap}>
              <img src={featured.image} alt="" />
            </div>
          )}
          <div className={styles.featuredBody}>
            <div className={styles.featuredEyebrow}>Featured destination</div>
            <div className={styles.featuredName}>{featured.name}</div>
            {featured.country && <div className={styles.featuredCountry}>{featured.country}</div>}
            {featured.description && <p className={styles.featuredDesc}>{featured.description}</p>}
            <span className={styles.featuredCta}>Discover</span>
          </div>
        </Link>
      )}
    </div>
  );
}
