import { ORIGINS, cardChips, loadCityList, readOrigin } from "./citySearch";

// "Plan a trip" -> chat (2026-11-13). The chat page (/concierge?plan=<city-slug>)
// calls this to pre-fill the message box with the city's details. Front-end
// only: it reads the same city list the Destinations cards use and sends
// nothing anywhere; the visitor reviews/edits the text and presses Send.
export async function buildPlanMessage(slug: string): Promise<string> {
  const pretty = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  try {
    const list = await loadCityList();
    const city = list.find((c) => c.slug === slug);
    if (!city) return `I'd like to plan a trip to ${pretty}.`;
    const origin = readOrigin();
    const chips = cardChips(city, origin).map((c) => c.replace(/^~/, "about "));
    const place = city.country ? `${city.name}, ${city.country}` : city.name;
    const bits = chips.length ? ` (${chips.join(", ")})` : "";
    return `I'd like to plan a trip to ${place}${bits}. I'm flying from ${ORIGINS[origin] || "Bengaluru"}. Can you help me get started?`;
  } catch {
    return `I'd like to plan a trip to ${pretty}.`;
  }
}
