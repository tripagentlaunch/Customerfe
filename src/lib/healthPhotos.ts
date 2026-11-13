// Stand-in photos for the health cards (2026-11-13). There are no hospital or clinic photos yet, so a card gets its
// country's photo when the site has one (public/img/h/destination-<country>.jpg), otherwise one of a few calm,
// neutral photos, rotated so a row doesn't repeat the same picture. Replace with real photos when they exist.
const COUNTRY_PHOTOS = new Set([
  "argentina", "australia", "austria", "bhutan", "brazil", "croatia", "egypt", "france", "greece", "iceland", "indonesia",
  "ireland", "italy", "japan", "jordan", "kenya", "maldives", "mauritius", "mexico", "morocco", "new-zealand", "oman", "peru",
  "portugal", "scotland", "seychelles", "singapore", "south-africa", "spain", "sri-lanka", "switzerland", "thailand", "turkiye",
  "uae", "united-states", "vietnam",
]);
const ALIASES: Record<string, string> = { usa: "united-states", us: "united-states", "united states": "united-states", türkiye: "turkiye", turkey: "turkiye", "turkiye": "turkiye", "united arab emirates": "uae" };
const FALLBACKS = ["/img/h/journal-the-quiet-suite.jpg", "/img/h/the-right-room.jpg", "/img/h/hotels.jpg", "/img/h/honeymoon-stays.jpg"];

const countryKey = (text?: string | null) => {
  const last = (text ?? "").split(",").pop()?.replace(/\(.*?\)/g, "").trim().toLowerCase() ?? "";
  const slug = ALIASES[last] ?? last.replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  return COUNTRY_PHOTOS.has(slug) ? slug : null;
};

export function healthPhoto(place: string | null | undefined, index: number, countryHint?: string | null): string {
  const key = countryHint && COUNTRY_PHOTOS.has(countryHint) ? countryHint : countryKey(place);
  return key ? `/img/h/destination-${key}.jpg` : FALLBACKS[index % FALLBACKS.length];
}
