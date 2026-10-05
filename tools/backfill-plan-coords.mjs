// Backfills plan.days[].slots[].lat/lon (and `place` when null) by matching
// each slot's free-text `text` against the venues this city already has
// geocoded in src/data/venue-coords/<slug>.json (stay/eat/do/party venues).
// No new geocoding — pure name-matching join. Slots whose text doesn't
// confidently name one of those venues are left untouched and flagged as
// needing real (new) geocoding.
//
// Same tightened relevance-gating approach as tools/fetch-panel-photos.mjs:
// accent-normalized, whole-word matching, requires >=2 distinctive tokens
// (or 1 long/distinctive token) to count as a match. If more than one
// venue matches a slot equally well, it's flagged ambiguous rather than
// guessed.
//
// Usage:
//   node tools/backfill-plan-coords.mjs [--cities=slug1,slug2,...] [--dry-run]
//
// Safe to re-run: any slot that already has non-null lat/lon is skipped.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/cities.generated.json");
const VENUE_COORDS_DIR = path.join(__dirname, "../src/data/venue-coords");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const citiesArg = args.find((a) => a.startsWith("--cities="));
const requestedSlugs = citiesArg ? citiesArg.slice("--cities=".length).split(",").filter(Boolean) : null;

const STOPWORDS = new Set([
  "the", "and", "des", "les", "aux", "une", "with", "from", "your", "this",
  "then", "arrive", "check", "into", "long", "over", "private", "after",
  "before", "dinner", "lunch", "breakfast", "night", "early", "late",
]);

function normalize(str) {
  return (str ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase();
}

function distinctiveTerms(name, excludeTokens) {
  return normalize(name)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !excludeTokens.has(w));
}

function containsWholeWord(haystack, word) {
  return new RegExp(`\\b${word}\\b`).test(haystack);
}

// Deliberately conservative: a match always requires >=2 distinctive
// tokens present (city-name tokens excluded, since "Amman"/"Petra" alone
// appearing in a slot's text says nothing about which specific venue it
// means). No single-token auto-match — a venue whose name reduces to one
// distinctive word is exactly the kind of case worth a human's eyes.
function isRelevantMatch(venueName, text, excludeTokens) {
  const haystack = normalize(text).replace(/[^a-z0-9\s]/g, " ");
  const terms = distinctiveTerms(venueName, excludeTokens);
  if (terms.length < 2) return false;
  const hits = terms.filter((t) => containsWholeWord(haystack, t));
  return hits.length >= 2;
}

function findMatches(slotText, venues, excludeTokens) {
  return venues.filter((v) => isRelevantMatch(v.n, slotText, excludeTokens));
}

function main() {
  const cities = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const slugs = requestedSlugs ?? Object.keys(cities);

  let resolved = 0;
  let ambiguous = 0;
  let noMatch = 0;
  let skippedCached = 0;
  let noVenueCoords = 0;

  for (const slug of slugs) {
    const city = cities[slug];
    if (!city) {
      console.warn(`Skipping unknown city slug: ${slug}`);
      continue;
    }
    const venueCoordsPath = path.join(VENUE_COORDS_DIR, `${slug}.json`);
    if (!existsSync(venueCoordsPath)) {
      console.log(`\n${slug}: no venue-coords file, skipping`);
      noVenueCoords++;
      continue;
    }
    const venueData = JSON.parse(readFileSync(venueCoordsPath, "utf-8"));
    const venues = venueData.venues ?? [];
    const excludeTokens = new Set(normalize(slug.replace(/-/g, " ")).split(/\s+/).filter(Boolean));

    console.log(`\n${slug}`);
    for (const day of city.plan?.days ?? []) {
      for (const slot of day.slots ?? []) {
        if (typeof slot.lat === "number" && typeof slot.lon === "number") {
          skippedCached++;
          continue;
        }

        const matches = findMatches(slot.text, venues, excludeTokens);
        if (matches.length === 1) {
          const v = matches[0];
          console.log(`  [${day.dayNumber}/${slot.label}] "${slot.text}" -> MATCH: "${v.n}" (${v.lat}, ${v.lon})`);
          if (!dryRun) {
            slot.lat = v.lat;
            slot.lon = v.lon;
            if (!slot.place) slot.place = v.n;
          }
          resolved++;
        } else if (matches.length > 1) {
          console.log(
            `  [${day.dayNumber}/${slot.label}] "${slot.text}" -> AMBIGUOUS: ${matches.map((m) => `"${m.n}"`).join(", ")} all match, skipping`,
          );
          ambiguous++;
        } else {
          console.log(`  [${day.dayNumber}/${slot.label}] "${slot.text}" -> no venue-coords match (needs new geocoding)`);
          noMatch++;
        }
      }
    }
    if (!dryRun) {
      writeFileSync(DATA_PATH, JSON.stringify(cities, null, 2) + "\n");
    }
  }

  console.log(
    `\nDone. Resolved via join: ${resolved}, ambiguous (skipped): ${ambiguous}, no match / needs new geocoding: ${noMatch}, already cached (skipped): ${skippedCached}, no venue-coords file: ${noVenueCoords}.`,
  );
  if (dryRun) console.log("(dry run — no file written)");
}

main();
