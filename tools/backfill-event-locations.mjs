// Backfills whatsOn.events[].location by matching each event's name/note
// against the venues this city already has geocoded in
// src/data/venue-coords/<slug>.json (stay/eat/do/party venues).
// No new geocoding — pure name-matching join, same approach as
// tools/backfill-plan-coords.mjs.
//
// Many events (citywide festivals like "Diwali", "Ram Barat") have no
// single fixed venue and will correctly show no match — that's not a
// gap, it's the honest state for an event without one physical location.
//
// Usage:
//   node tools/backfill-event-locations.mjs [--cities=slug1,slug2,...] [--dry-run]
//
// Safe to re-run: any event that already has a non-null `location` is skipped.

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
  "each", "every", "near", "around", "during", "night", "nights", "full",
  "moon", "festival", "celebrating", "celebration",
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
// venue-name tokens present in the event's name+note text (city-name
// tokens excluded). No single-token auto-match.
function isRelevantMatch(venueName, text, excludeTokens) {
  const haystack = normalize(text).replace(/[^a-z0-9\s]/g, " ");
  const terms = distinctiveTerms(venueName, excludeTokens);
  if (terms.length < 2) return false;
  const hits = terms.filter((t) => containsWholeWord(haystack, t));
  return hits.length >= 2;
}

function findMatches(eventText, venues, excludeTokens) {
  return venues.filter((v) => isRelevantMatch(v.n, eventText, excludeTokens));
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
    const events = city.whatsOn?.events ?? [];
    if (events.length === 0) continue;

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
    for (const ev of events) {
      if (ev.location) {
        skippedCached++;
        continue;
      }

      const eventText = `${ev.name ?? ""} ${ev.note ?? ""}`;
      const matches = findMatches(eventText, venues, excludeTokens);
      if (matches.length === 1) {
        const v = matches[0];
        console.log(`  "${ev.name}" -> MATCH: "${v.n}" (${v.lat}, ${v.lon})`);
        if (!dryRun) ev.location = { label: v.n, lat: v.lat, lon: v.lon };
        resolved++;
      } else if (matches.length > 1) {
        console.log(`  "${ev.name}" -> AMBIGUOUS: ${matches.map((m) => `"${m.n}"`).join(", ")} all match, skipping`);
        ambiguous++;
      } else {
        console.log(`  "${ev.name}" -> no venue-coords match (no fixed venue / needs new geocoding)`);
        noMatch++;
      }
    }
    if (!dryRun) {
      writeFileSync(DATA_PATH, JSON.stringify(cities, null, 2) + "\n");
    }
  }

  console.log(
    `\nDone. Resolved via join: ${resolved}, ambiguous (skipped): ${ambiguous}, no match: ${noMatch}, already cached (skipped): ${skippedCached}, no venue-coords file: ${noVenueCoords}.`,
  );
  if (dryRun) console.log("(dry run — no file written)");
}

main();
