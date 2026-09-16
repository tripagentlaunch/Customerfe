// The Country/Zone template: a cluster of cities travellers actually treat
// as one trip — sometimes that's a single country (Greece), sometimes a
// named region that spans several (a "Northeast India" or "Malaysia &
// Singapore" would be zones; "Asia" or "India" broadly would not — see the
// hand-authored membership in zones.json, which is exactly why this is
// editorial data, not something derived from each city's own country field).
export interface ZoneData {
  slug: string;
  // Not used for any different rendering yet — kept for future reference
  // (e.g. distinguishing labelling/copy conventions) now that both a
  // single country and a genuine multi-country zone share this one template.
  kind: "country" | "zone";
  hero: {
    image: string;
    eyebrow: string;
    name: string;
    tagline: string;
  };
  intro: {
    heading: string;
    lede: string;
  };
  // Member city slugs, keyed into cities.generated.json — the template
  // reads each city's own hero image/name/tagline from there rather than
  // duplicating it here.
  cities: string[];
}
