// Fetches real photos for guide-panel tiles (attractions on the "do" panel,
// restaurants on the "eat" panel) from the Pexels API.
// Writes into cities.generated.json's guide.panels[key=<panel>].tiers[].items[].photo.
//
// Tightened relevance gate vs. fetch-hotel-photos.mjs / fetch-attraction-photos.mjs:
//   - accented characters (é, œ, ç, ...) are normalized before tokenizing, so
//     "Sacré-Cœur" -> tokens "sacre", "coeur" instead of being mangled/dropped.
//   - matches are checked as whole words (word-boundary regex), not raw
//     substring, so "coeur" can't match inside an unrelated longer word.
//   - a name with >=2 distinctive tokens requires >=2 of them present in the
//     photo's alt text; a name with exactly 1 distinctive token requires
//     that token to be present AND at least 5 characters long.
//   - the chosen match's alt text is always printed, so a human reviewer can
//     see exactly what the gate matched on (not just the Pexels page slug).
// The goal is to skip rather than mismatch: no photo is better than a wrong
// or generic one.
//
// Usage:
//   node --env-file=.env.local --use-system-ca tools/fetch-panel-photos.mjs --panel=do|eat [--cities=slug1,slug2,...] [--dry-run] [--limit=N]
//
// Safe to re-run: any item that already has a non-null `photo` is skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/cities.generated.json");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error("PEXELS_API_KEY is not set. Run with: node --env-file=.env.local --use-system-ca tools/fetch-panel-photos.mjs --panel=do|eat");
  process.exit(1);
}

const MIN_MS_BETWEEN_PEXELS_REQUESTS = Math.ceil(3600_000 / 150);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const panelArg = args.find((a) => a.startsWith("--panel="));
const panelKey = panelArg ? panelArg.slice("--panel=".length) : null;
if (!panelKey || !["do", "eat"].includes(panelKey)) {
  console.error('Missing/invalid --panel. Usage: --panel=do or --panel=eat');
  process.exit(1);
}
const citiesArg = args.find((a) => a.startsWith("--cities="));
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;
const requestedSlugs = citiesArg ? citiesArg.slice("--cities=".length).split(",").filter(Boolean) : null;

const STOPWORDS = new Set([
  "the", "and", "des", "les", "aux", "une", "with", "from", "your", "this",
]);

// Cross-city name-collision guard — added after a live run matched London's
// "Royal Opera House" to a Pexels photo whose own alt text says "...in
// Muscat" (a same-named venue in a different city entirely). The name-token
// gate alone can't catch this: every distinctive token ("royal","opera",
// "house") genuinely appears in the alt text, so it looks like a confident
// match by that rule. This guard additionally rejects a match if the alt
// text names a DIFFERENT one of this site's 110 cities and does not also
// name the target city — same "skip rather than guess" principle applied
// to place names that exist in more than one city.
const ALL_CITY_NAMES = (() => {
  const cities = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  return Object.values(cities)
    .map((c) => (c.seo?.title ?? "").split(/[—|]/)[0].trim())
    .filter(Boolean);
})();

function stripArticle(s) {
  return s.replace(/^the\s+/, "").trim();
}

function mentionsOtherCity(alt, targetCityName) {
  const altNorm = normalize(alt).replace(/[^a-z0-9\s]/g, " ");
  const targetNorm = stripArticle(normalize(targetCityName));
  for (const name of ALL_CITY_NAMES) {
    const nameNorm = stripArticle(normalize(name));
    if (!nameNorm) continue;
    // Same city as the target (allowing for "The Amalfi Coast" vs slug-
    // derived "amalfi coast", or minor title variants) — never flag it.
    if (nameNorm === targetNorm || nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm)) continue;
    const escaped = nameNorm.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, "\\s+");
    if (escaped && containsWholeWord(altNorm, escaped)) return name;
  }
  return null;
}

function normalize(str) {
  return (str ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (é -> e, ç -> c, œ decomposes weirdly so handled below)
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase();
}

function distinctiveTerms(name) {
  return normalize(name)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function containsWholeWord(haystack, word) {
  return new RegExp(`\\b${word}\\b`).test(haystack);
}

function isRelevantMatch(photo, name, cityName) {
  const rawAlt = photo.alt ?? "";
  const alt = normalize(rawAlt).replace(/[^a-z0-9\s]/g, " ");
  if (!alt) return false;
  const terms = distinctiveTerms(name);
  if (terms.length === 0) return false;
  const hits = terms.filter((t) => containsWholeWord(alt, t));
  const nameMatches = terms.length === 1 ? hits.length === 1 && terms[0].length >= 5 : hits.length >= 2;
  if (!nameMatches) return false;
  const otherCity = mentionsOtherCity(rawAlt, cityName);
  if (otherCity) {
    console.log(`    (rejected: alt text names "${otherCity}", not "${cityName}" — likely a same-named venue elsewhere)`);
    return false;
  }
  return true;
}

let lastPexelsRequestAt = 0;
async function throttlePexels() {
  const wait = MIN_MS_BETWEEN_PEXELS_REQUESTS - (Date.now() - lastPexelsRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastPexelsRequestAt = Date.now();
}

async function searchPexels(query, attempt = 1) {
  await throttlePexels();
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`;
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY }, signal: AbortSignal.timeout(20_000) });
  } catch (err) {
    if (attempt >= 4) {
      console.warn(`  Pexels request errored for query "${query}" after ${attempt} attempts: ${err.message}`);
      return [];
    }
    await new Promise((r) => setTimeout(r, 3000 * attempt));
    return searchPexels(query, attempt + 1);
  }
  if (res.status === 429) {
    if (attempt >= 4) {
      console.warn(`  Pexels rate-limited (429) for query "${query}" after ${attempt} attempts, giving up`);
      return [];
    }
    const retryAfter = Number(res.headers.get("retry-after")) || 60 * attempt;
    console.warn(`  Pexels rate-limited (429) for query "${query}", waiting ${retryAfter}s`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return searchPexels(query, attempt + 1);
  }
  if (!res.ok) {
    console.warn(`  Pexels request failed (${res.status}) for query "${query}"`);
    return [];
  }
  const data = await res.json();
  return data.photos ?? [];
}

async function findPhotoFor(name, city) {
  const query = `${name} ${city}`;
  const photos = await searchPexels(query);
  const match = photos.find((p) => isRelevantMatch(p, name, city));
  if (match?.src?.large) {
    return {
      url: match.src.large,
      alt: match.alt ?? "(no alt text)",
      photographer: match.photographer ?? null,
      pexelsUrl: match.url ?? null,
    };
  }
  return { url: null };
}

async function main() {
  const requested = requestedSlugs ?? null;
  const cities = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const slugs = requested ?? Object.keys(cities);

  let fetched = 0;
  let noMatch = 0;
  let skippedCached = 0;
  let processed = 0;
  const results = [];

  outer:
  for (const slug of slugs) {
    const city = cities[slug];
    if (!city) {
      console.warn(`Skipping unknown city slug: ${slug}`);
      continue;
    }
    const panel = (city.guide?.panels ?? []).find((p) => p.key === panelKey);
    if (!panel) continue;

    console.log(`\n${slug} [panel=${panelKey}]`);
    for (const tier of panel.tiers ?? []) {
      for (const item of tier.items ?? []) {
        if (item.photo) {
          skippedCached++;
          continue;
        }
        if (processed >= limit) break outer;
        processed++;

        const { url, alt, photographer, pexelsUrl } = await findPhotoFor(item.name, slug.replace(/-/g, " "));
        if (url) {
          console.log(`  "${item.name}" -> MATCH by ${photographer ?? "unknown"}`);
          console.log(`    alt:   ${alt}`);
          console.log(`    photo: ${url}`);
          console.log(`    page:  ${pexelsUrl ?? "n/a"}`);
          if (!dryRun) item.photo = url;
          fetched++;
          results.push({ name: item.name, status: "matched", url, alt, photographer });
        } else {
          console.log(`  "${item.name}" -> no confident match, keeping placeholder`);
          if (!dryRun) item.photo = null;
          noMatch++;
          results.push({ name: item.name, status: "skipped" });
        }
      }
    }
    if (!dryRun) {
      writeFileSync(DATA_PATH, JSON.stringify(cities, null, 2) + "\n");
    }
  }

  console.log(
    `\nDone. Fetched: ${fetched}, no match (skipped): ${noMatch}, already cached (skipped): ${skippedCached}.`,
  );
  if (dryRun) console.log("(dry run — no file written)");
}

main();
