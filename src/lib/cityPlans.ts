// "The Plan" itineraries for the city pages (2026-11-16): one file for every city, src/data/city-plans.json,
// keyed by city slug. A city listed there replaces the plan.days that cities.generated.json carries; a city not
// listed keeps its generated plan, so cities move over one at a time.
//
// Shape of an entry (no coordinates here, on purpose):
//   days[].title                the day's area, e.g. "West Village"
//   days[].slots[].label        "Morning" | "Afternoon" | "Evening"
//   days[].slots[].title        the card heading (the activity or place)
//   days[].slots[].venue        the exact `n` of a pin in data/venue-coords/<slug>.json; clicking the card
//                               scrolls to the page's map and opens that pin. Add the pin there if it is missing.
//   days[].slots[].text         the body
//   days[].slots[].food         one line on the meal (breakfast / lunch / dinner or evening tea)
//   days[].slots[].photo        /images/plans/<slug>/day<N>-<morning|afternoon|evening>.jpg
//
// Loaded with a dynamic import, so the file is its own chunk and only a city page downloads it.
// Where each plan comes from: city-plan-urls.md; what is on each page plus photo origins: city-plan-content.md (neither is shipped).

export interface PlanSlot {
  label: string;
  title: string;
  venue: string | null;
  text: string;
  food: string | null;
  photo: string | null;
}

export interface PlanDay {
  title: string;
  slots: PlanSlot[];
}

export interface CityPlan {
  days: PlanDay[];
}

let cache: Promise<Record<string, CityPlan>> | null = null;

export function loadCityPlan(slug: string): Promise<CityPlan | null> {
  cache ??= import("../data/city-plans.json").then((m) => m.default as unknown as Record<string, CityPlan>);
  return cache.then((all) => all[slug] ?? null).catch(() => null);
}
