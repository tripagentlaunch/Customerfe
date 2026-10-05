// Fetches real photos for "Where to stay" hotel tiles from:
//   1) the live TripSure snapshot cache, via GET /api/hotel/photo-lookup
//      (tripagent-customersite-be on Render) — exact-name match only, no
//      Pexels fallback server-side (confirmed by reading the deployed
//      commit 97c615b: hotel_service.find_photo_by_name() only queries
//      hotel_snapshots, so most calls legitimately return null — that's
//      not a bug, it's the endpoint's actual scope).
//   2) Pexels (same query + relevance-gate approach as
//      fetch-plan-photos.mjs), when TripSure has no match.
// Writes into cities.generated.json's guide.panels[key="stay"].tiers[].items[].photo.
//
// Scope: the 95 cities NOT covered by the earlier plan-slot batch — see
// EXCLUDED_CITIES below. Those 15 cities' data is never read or written by
// this script, even if explicitly requested via --cities.
//
// Usage:
//   node --env-file=.env.local --use-system-ca tools/fetch-hotel-photos.mjs [--cities=slug1,slug2,...] [--dry-run] [--limit=N]
//
// Safe to re-run: any stay-panel item that already has a non-null `photo`
// is skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/cities.generated.json");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error("PEXELS_API_KEY is not set. Run with: node --env-file=.env.local --use-system-ca tools/fetch-hotel-photos.mjs");
  process.exit(1);
}

const TRIPSURE_LOOKUP_BASE = "https://tripagent-customersite-be.onrender.com/api/hotel/photo-lookup";

// The 15 cities already covered by the plan-slot photo batch — never
// touched here, regardless of --cities.
const EXCLUDED_CITIES = new Set([
  "nairobi-mara", "leh-ladakh", "cape-town", "paro", "bali",
  "amman-petra", "male-maldives", "cusco", "andaman", "nice-riviera",
  "bangkok", "tokyo", "kyoto", "hoi-an", "dubai",
]);

// Pexels free tier: 200 requests/hour. Same conservative pace as
// fetch-plan-photos.mjs.
const MIN_MS_BETWEEN_PEXELS_REQUESTS = Math.ceil(3600_000 / 180);
// TripSure lookup isn't Pexels-rate-limited, but keep it gentle too — it's
// a Render free-tier service that can idle-sleep/cold-start.
const MIN_MS_BETWEEN_TRIPSURE_REQUESTS = 300;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const citiesArg = args.find((a) => a.startsWith("--cities="));
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;
const requestedSlugs = citiesArg ? citiesArg.slice("--cities=".length).split(",").filter(Boolean) : null;

function distinctiveTerms(hotelName) {
  return (hotelName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function isRelevantMatch(photo, hotelName) {
  const alt = (photo.alt ?? "").toLowerCase();
  if (!alt) return false;
  return distinctiveTerms(hotelName).some((term) => alt.includes(term));
}

let lastPexelsRequestAt = 0;
async function throttlePexels() {
  const wait = MIN_MS_BETWEEN_PEXELS_REQUESTS - (Date.now() - lastPexelsRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastPexelsRequestAt = Date.now();
}

let lastTripsureRequestAt = 0;
async function throttleTripsure() {
  const wait = MIN_MS_BETWEEN_TRIPSURE_REQUESTS - (Date.now() - lastTripsureRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastTripsureRequestAt = Date.now();
}

async function withRetry(fn, label, attempt = 1) {
  try {
    return await fn();
  } catch (err) {
    if (attempt >= 3) {
      console.warn(`  ${label} errored after ${attempt} attempts: ${err.message}`);
      return null;
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return withRetry(fn, label, attempt + 1);
  }
}

async function lookupTripSure(hotelName) {
  await throttleTripsure();
  return withRetry(async () => {
    const url = `${TRIPSURE_LOOKUP_BASE}?name=${encodeURIComponent(hotelName)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.photoUrl ?? null;
  }, `TripSure lookup for "${hotelName}"`);
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

async function findPhotoFor(hotelName, city) {
  const tripSureUrl = await lookupTripSure(hotelName);
  if (tripSureUrl) return { url: tripSureUrl, source: "tripsure" };

  const query = `${hotelName} ${city}`;
  const photos = await searchPexels(query);
  const match = photos.find((p) => isRelevantMatch(p, hotelName));
  if (match?.src?.large) return { url: match.src.large, source: "pexels" };

  return { url: null, source: null };
}

async function main() {
  const requested = requestedSlugs ?? null;
  const cities = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const allSlugs = requested ?? Object.keys(cities);
  const slugs = allSlugs.filter((s) => !EXCLUDED_CITIES.has(s));
  const skippedExcluded = allSlugs.filter((s) => EXCLUDED_CITIES.has(s));

  if (skippedExcluded.length) {
    console.log(`Skipping ${skippedExcluded.length} already-covered city/cities: ${skippedExcluded.join(", ")}`);
  }

  let fetched = 0;
  let fromTripsure = 0;
  let fromPexels = 0;
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
    const stayPanel = (city.guide?.panels ?? []).find((p) => p.key === "stay");
    if (!stayPanel) continue;

    console.log(`\n${slug}`);
    for (const tier of stayPanel.tiers ?? []) {
      for (const item of tier.items ?? []) {
        if (item.photo) {
          skippedCached++;
          continue;
        }
        if (processed >= limit) break outer;
        processed++;

        const { url, source } = await findPhotoFor(item.name, slug.replace(/-/g, " "));
        if (url) {
          console.log(`  "${item.name}" -> matched (${source})`);
          if (!dryRun) item.photo = url;
          fetched++;
          if (source === "tripsure") fromTripsure++;
          else fromPexels++;
        } else {
          console.log(`  "${item.name}" -> no match (tripsure or pexels), keeping placeholder`);
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
    `\nDone. Fetched: ${fetched} (tripsure: ${fromTripsure}, pexels: ${fromPexels}), no match: ${noMatch}, already cached (skipped): ${skippedCached}.`,
  );
  if (dryRun) console.log("(dry run — no file written)");
}

main();
