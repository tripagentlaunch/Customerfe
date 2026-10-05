// Fetches real stock photos for itinerary plan-slot cards (Morning/Afternoon/
// Evening on a city page) from the Pexels API, writing them into
// src/data/cities.generated.json.
//
// Scope: plan slots only (not guide items or map venues) — those have no
// name/category field to query by or check hotel status against, so this
// script always queries Pexels directly, no TripSure branch.
//
// Usage:
//   node --env-file=.env.local tools/fetch-plan-photos.mjs [--cities=slug1,slug2,...] [--dry-run]
//
// Safe to re-run: any slot that already has a non-null `photo` is skipped,
// so running again (e.g. to add more cities) never re-fetches or overwrites
// existing photos.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/cities.generated.json");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error("PEXELS_API_KEY is not set. Run with: node --env-file=.env.local tools/fetch-plan-photos.mjs");
  process.exit(1);
}

// Pexels free tier: 200 requests/hour. Stay comfortably under that so this
// scales to a larger batch later without changing anything.
const MIN_MS_BETWEEN_REQUESTS = Math.ceil(3600_000 / 180);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const citiesArg = args.find((a) => a.startsWith("--cities="));
const requestedSlugs = citiesArg ? citiesArg.slice("--cities=".length).split(",").filter(Boolean) : null;

// Default batch: top 15 of 110 cities by richest existing plan data
// (most days/slots and longest slot text) — confirmed with the user as a
// reasonable starting set absent a hand-picked list.
const DEFAULT_BATCH = [
  "nairobi-mara", "leh-ladakh", "cape-town", "paro", "bali",
  "amman-petra", "male-maldives", "cusco", "andaman", "nice-riviera",
  "bangkok", "tokyo", "kyoto", "hoi-an", "dubai",
];

const STOPWORDS = new Set([
  "the", "a", "an", "at", "on", "in", "of", "and", "or", "to", "with",
  "then", "into", "for", "before", "after", "early", "late", "clear",
]);

// Builds a short search query + a set of keywords the alt-text relevance
// gate checks for. e.g. "The Table Mountain cableway on a clear early
// morning, then a walk..." -> query "Cape Town Table Mountain cableway",
// keywords ["cape", "town", "table", "mountain", "cableway"].
function extractQuery(citySlug, text) {
  const cityName = citySlug.replace(/-/g, " ");
  const firstClause = (text ?? "").split(/[,.]/)[0] ?? "";
  const words = firstClause
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
  const theme = words.slice(0, 4).join(" ");
  const query = theme ? `${cityName} ${theme}` : cityName;
  const keywords = new Set(
    [...cityName.split(" "), ...words].map((w) => w.toLowerCase()).filter((w) => w.length > 3),
  );
  return { query, keywords };
}

function isRelevantMatch(photo, keywords) {
  const alt = (photo.alt ?? "").toLowerCase();
  if (!alt) return false;
  for (const kw of keywords) {
    if (alt.includes(kw)) return true;
  }
  return false;
}

let lastRequestAt = 0;
async function throttle() {
  const wait = MIN_MS_BETWEEN_REQUESTS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function searchPexels(query, attempt = 1) {
  await throttle();
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  try {
    const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
    if (!res.ok) {
      console.warn(`  Pexels request failed (${res.status}) for query "${query}"`);
      return [];
    }
    const data = await res.json();
    return data.photos ?? [];
  } catch (err) {
    if (attempt >= 3) {
      console.warn(`  Pexels request errored after ${attempt} attempts for query "${query}": ${err.message}`);
      return [];
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return searchPexels(query, attempt + 1);
  }
}

async function findPhotoFor(citySlug, text) {
  const { query, keywords } = extractQuery(citySlug, text);
  const photos = await searchPexels(query);
  const match = photos.find((p) => isRelevantMatch(p, keywords));
  return { query, url: match?.src?.large ?? null };
}

async function main() {
  const slugs = requestedSlugs ?? DEFAULT_BATCH;
  const cities = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

  let fetched = 0;
  let skippedCached = 0;
  let noMatch = 0;

  for (const slug of slugs) {
    const city = cities[slug];
    if (!city) {
      console.warn(`Skipping unknown city slug: ${slug}`);
      continue;
    }
    console.log(`\n${slug}`);
    for (const day of city.plan?.days ?? []) {
      for (const slot of day.slots ?? []) {
        if (slot.photo) {
          skippedCached++;
          continue;
        }
        const { query, url } = await findPhotoFor(slug, slot.text);
        if (url) {
          console.log(`  [${day.dayNumber} ${slot.label}] "${query}" -> matched`);
          if (!dryRun) slot.photo = url;
          fetched++;
        } else {
          console.log(`  [${day.dayNumber} ${slot.label}] "${query}" -> no relevant match, keeping placeholder`);
          if (!dryRun) slot.photo = null;
          noMatch++;
        }
      }
    }
  }

  if (!dryRun) {
    writeFileSync(DATA_PATH, JSON.stringify(cities, null, 2) + "\n");
  }

  console.log(`\nDone. Fetched: ${fetched}, no relevant match: ${noMatch}, already cached (skipped): ${skippedCached}.`);
  if (dryRun) console.log("(dry run — no file written)");
}

main();
