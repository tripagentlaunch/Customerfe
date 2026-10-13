// Cities whose photo was replaced with a reviewed, aspirational one
// (src/data/city-photo-credits.json). New file names, so browsers and the
// image CDN don't keep serving the old photo from cache.
const REPLACED = new Set([
  "osaka",
  "hong-kong",
  "seoul",
  "shanghai",
  "bangkok",
  "mumbai",
  "las-vegas",
  "los-angeles",
  "ho-chi-minh-city",
  "hanoi",
  "mexico-city",
  "kochi",
  "chennai",
]);

// Path of a city's own photo, e.g. "/img/cities/kyoto.jpg".
export function cityPhotoPath(slug: string): string {
  return `/img/cities/${slug}${REPLACED.has(slug) ? "-v2" : ""}.jpg`;
}
