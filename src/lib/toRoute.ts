// Static pages link with bare "*.html" (and "#anchor") hrefs, or already
// clean absolute paths like "/health-destination-uae"; the SPA routes on
// extension-less slugs. Anchors and external links pass through untouched.
export function toRoute(href: string): string {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  const [path, query] = href.split("?");
  const slug = path.replace(/\.html$/, "");
  // "index.html" is the homepage — it used to become "/index", a 404.
  if (slug === "index" || slug === "/index") return "/" + (query ? "?" + query : "");
  return (slug.startsWith("/") ? slug : "/" + slug) + (query ? "?" + query : "");
}
