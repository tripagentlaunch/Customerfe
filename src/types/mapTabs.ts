// City -> zone clustering (zone-clusters.generated.json) is scrapped for the
// map's own navigation; this is its replacement — a simple two-level
// structure: World (every serviced country, outlines only, no zoom) and 11
// region tabs (a country or a handful of countries, zoomed + city markers
// revealed on click). See map-tabs.generated.json and the conversation this
// was built from for how the regions were decided (size/footprint-based,
// not strict geography — e.g. Switzerland/Austria sit in "Western Europe"
// for city-count balance, not because they're geographically western).
export interface MapCity {
  slug: string;
  name: string;
  lat: number;
  lon: number;
}

export interface MapTab {
  key: string;
  label: string;
  // Country names exactly as they appear in world-countries-50m.json's
  // topology (topojson properties.name) — used to look up each tab's
  // shapes for both outline rendering and bounding-box zoom targeting.
  countries: string[];
  cities: MapCity[];
}

export interface MapTabsData {
  world: MapTab;
  regions: MapTab[];
}
