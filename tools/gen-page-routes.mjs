// Writes the site's real page addresses into vercel.json, so Vercel serves
// the app (index.html, 200) only for pages that exist. Anything else falls
// through to Vercel's not-found handling: dist/404.html (a copy of the app,
// see vite.config.ts) with a real 404 status — the visitor still sees the
// "This door doesn't open" page. (2026-10-14: every unknown URL used to
// return 200 because of a catch-all rewrite.)
//
//   node tools/gen-page-routes.mjs          rewrite vercel.json
//   node tools/gen-page-routes.mjs --check  fail if vercel.json is stale
//                                            (runs in `npm run build`)
//
// Only rules whose destination is /index.html are managed here; the API
// proxy rules (which differ between dev and prod) are left as they are.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const keys = (p) => Object.keys(JSON.parse(read(p)));

// Mirrors src/pages/PageRouter.tsx: standalone pages, redirects, and each
// template's own data file (a slug renders only if its data exists).
function pageSlugs() {
  const router = read("src/pages/PageRouter.tsx");
  const block = router.slice(router.indexOf("const EXACT_SLUG_PAGES"), router.indexOf("\n};", router.indexOf("const EXACT_SLUG_PAGES")));
  const exact = [...block.matchAll(/^\s+"?([a-z0-9-]+)"?:\s*\(\)/gm)].map((m) => m[1]);
  if (exact.length < 20) throw new Error(`Could not read EXACT_SLUG_PAGES from PageRouter.tsx (found ${exact.length})`);
  const slugs = new Set([
    ...exact,
    ...keys("src/data/redirects.generated.json"),
    ...keys("src/data/cities.generated.json").map((s) => `city-${s}`),
    ...keys("src/data/zones.json").map((s) => `zone-${s}`),
    ...keys("src/data/health.generated.json"),
    ...keys("src/data/routes.generated.json"),
    ...keys("src/data/itinerary-teasers.generated.json"),
    ...keys("src/data/destinations.generated.json"),
    ...keys("src/data/browse.generated.json"),
    ...keys("src/data/goin.generated.json"),
    ...keys("src/data/journal.generated.json"),
    ...keys("src/data/visa.generated.json"),
    ...keys("src/data/legal.generated.json"),
  ]);
  slugs.delete("404"); // the not-found page itself should answer 404
  for (const s of slugs) if (!/^[a-z0-9-]+$/.test(s)) throw new Error(`Unexpected page slug: ${s}`);
  return [...slugs].sort();
}

// Groups slugs into "/:page(a|b|c)" rules, each source kept well under
// Vercel's route-length limit.
function pageRules(slugs) {
  const rules = [{ source: "/", destination: "/index.html" }];
  let chunk = [];
  const flush = () => {
    if (chunk.length) rules.push({ source: `/:page(${chunk.join("|")})`, destination: "/index.html" });
    chunk = [];
  };
  for (const s of slugs) {
    if (`/:page(${[...chunk, s].join("|")})`.length > 1800) flush();
    chunk.push(s);
  }
  flush();
  return rules;
}

const path = join(root, "vercel.json");
const raw = readFileSync(path, "utf8");
const config = JSON.parse(raw);
const kept = config.rewrites.filter((r) => r.destination !== "/index.html");
const next = { ...config, rewrites: [...kept, ...pageRules(pageSlugs())] };
// Rewrites only the "rewrites" list, one rule per line as the file is
// written by hand; the rest of vercel.json keeps its own formatting.
const start = raw.indexOf('"rewrites": [');
const end = raw.indexOf("\n  ],", start);
if (start < 0 || end < 0) throw new Error('Could not find the "rewrites" list in vercel.json');
const list = next.rewrites.map((r) => `    ${JSON.stringify(r).replace(/","/g, '", "').replace(/^\{"/, '{ "').replace(/"\}$/, '" }').replace(/":"/g, '": "')}`).join(",\n");
const out = raw.slice(0, start) + '"rewrites": [\n' + list + raw.slice(end);
JSON.parse(out);

if (process.argv.includes("--check")) {
  const current = JSON.stringify(JSON.parse(readFileSync(path, "utf8")).rewrites);
  if (current !== JSON.stringify(next.rewrites)) {
    console.error("vercel.json page routes are out of date with the site's pages.\nRun: node tools/gen-page-routes.mjs   (then commit vercel.json)");
    process.exit(1);
  }
  console.log(`vercel.json page routes up to date (${pageSlugs().length} pages).`);
} else {
  writeFileSync(path, out);
  console.log(`vercel.json: ${pageSlugs().length} pages in ${next.rewrites.length - kept.length} rules; ${kept.length} API rules kept.`);
}
