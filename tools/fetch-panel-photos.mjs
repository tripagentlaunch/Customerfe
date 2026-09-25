// Fetches real photos for "do" (What to do) and "eat" (Where to eat) tiles
// from the Pexels API, using the same query + relevance-gate approach as
// fetch-hotel-photos.mjs's Pexels branch.
// Writes into cities.generated.json's guide.panels[key=<panel>].tiers[].items[].photo.
//
// Scope: attraction/restaurant tiles only, no server-side lookup equivalent
// to TripSure exists for these, so this is Pexels-only.
//
// Usage:
//   node --env-file=.env.local --use-system-ca tools/fetch-panel-photos.mjs --panel=<eat|do> [--cities=slug1,slug2,...] [--dry-run] [--limit=N]
//
// Safe to re-run: any panel item that already has a non-null `photo` is
// skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/cities.generated.json");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error("PEXELS_API_KEY is not set. Run with: node --env-file=.env.local --use-system-ca tools/fetch-panel-photos.mjs --panel=<eat|do>");
  process.exit(1);
}

// Pexels free tier: 200 requests/hour. Same conservative pace as
// fetch-hotel-photos.mjs / fetch-plan-photos.mjs.
const MIN_MS_BETWEEN_PEXELS_REQUESTS = Math.ceil(3600_000 / 180);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const panelArg = args.find((a) => a.startsWith("--panel="));
const panelKey = panelArg ? panelArg.slice("--panel=".length) : null;
if (panelKey !== "eat" && panelKey !== "do") {
  console.error('Missing/invalid --panel flag. Usage: --panel=eat or --panel=do');
  process.exit(1);
}
const citiesArg = args.find((a) => a.startsWith("--cities="));
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;
const requestedSlugs = citiesArg ? citiesArg.slice("--cities=".length).split(",").filter(Boolean) : null;

// "do" tiles are named after the attraction itself (e.g. "Eiffel Tower"),
// so the bare name is the best search query. "eat" tiles are restaurant
// names, which are frequently generic/ambiguous on their own (e.g.
// "Peshawri", "Esphahan") — appending "restaurant" steers Pexels toward
// food/interior shots instead of unrelated stock photos of the same word.
const QUERY_SUFFIX = panelKey === "eat" ? " restaurant" : "";

function distinctiveTerms(itemName) {
  return (itemName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function isRelevantMatch(photo, itemName) {
  const alt = (photo.alt ?? "").toLowerCase();
  if (!alt) return false;
  return distinctiveTerms(itemName).some((term) => alt.includes(term));
}

let lastPexelsRequestAt = 0;
async function throttlePexels() {
  const wait = MIN_MS_BETWEEN_PEXELS_REQUESTS - (Date.now() - lastPexelsRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastPexelsRequestAt = Date.now();
}

async function searchPexels(query, attempt = 1) {
  await throttlePexels();
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY }, signal: AbortSignal.timeout(20_000) });
  } catch (err) {
    if (attempt >= 5) {
      console.warn(`  Pexels request errored for query "${query}" after ${attempt} attempts: ${err.message}`);
      return [];
    }
    await new Promise((r) => setTimeout(r, 3000 * attempt));
    return searchPexels(query, attempt + 1);
  }
  if (res.status === 429) {
    if (attempt >= 5) {
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

async function findPhotoFor(itemName, city) {
  const query = `${itemName}${QUERY_SUFFIX} ${city}`;
  const photos = await searchPexels(query);
  const match = photos.find((p) => isRelevantMatch(p, itemName));
  if (match?.src?.large) {
    return {
      url: match.src.large,
      source: "pexels",
      photographer: match.photographer ?? null,
      photographerUrl: match.photographer_url ?? null,
      pexelsUrl: match.url ?? null,
    };
  }
  return { url: null, source: null };
}

async function main() {
  const requested = requestedSlugs ?? null;
  const cities = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const slugs = requested ?? Object.keys(cities);

  let fetched = 0;
  let noMatch = 0;
  let skippedCached = 0;
  let processed = 0;

  outer:
  for (const slug of slugs) {
    const city = cities[slug];
    if (!city) {
      console.warn(`Skipping unknown city slug: ${slug}`);
      continue;
    }
    const panel = (city.guide?.panels ?? []).find((p) => p.key === panelKey);
    if (!panel) continue;

    console.log(`\n${slug}`);
    for (const tier of panel.tiers ?? []) {
      for (const item of tier.items ?? []) {
        if (item.photo) {
          skippedCached++;
          continue;
        }
        if (processed >= limit) break outer;
        processed++;

        const { url, source, photographer, pexelsUrl } = await findPhotoFor(item.name, slug.replace(/-/g, " "));
        if (url) {
          console.log(`  "${item.name}" -> matched (${source}) by ${photographer ?? "unknown"}`);
          console.log(`    photo: ${url}`);
          console.log(`    page:  ${pexelsUrl ?? "n/a"}`);
          if (!dryRun) item.photo = url;
          fetched++;
        } else {
          console.log(`  "${item.name}" -> no match, keeping placeholder`);
          if (!dryRun) item.photo = null;
          noMatch++;
        }
      }
    }
    // Persist after every city, not just at the end — a crash mid-batch
    // (network blip, process kill) should only cost the current city's
    // progress, not the whole run's.
    if (!dryRun) {
      writeFileSync(DATA_PATH, JSON.stringify(cities, null, 2) + "\n");
    }
  }

  console.log(
    `\nDone (panel=${panelKey}). Fetched: ${fetched}, no match: ${noMatch}, already cached (skipped): ${skippedCached}.`,
  );
  if (dryRun) console.log("(dry run — no file written)");
}

main();
