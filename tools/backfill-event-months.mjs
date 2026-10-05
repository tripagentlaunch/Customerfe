// Backfills whatsOn.events[].months by mapping each event's freeform
// `when` string to whenToGo.months-style string codes ("Jan".."Dec").
// No API calls — pure text mapping. Anything that doesn't cleanly resolve
// to a discrete set of months is left as [] and flagged for manual review
// rather than guessed.
//
// Usage:
//   node tools/backfill-event-months.mjs [--cities=slug1,slug2,...] [--dry-run]
//
// Safe to re-run: any event that already has a non-empty `months` is skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/cities.generated.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const citiesArg = args.find((a) => a.startsWith("--cities="));
const requestedSlugs = citiesArg ? citiesArg.slice("--cities=".length).split(",").filter(Boolean) : null;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_NAME_TO_CODE = {
  january: "Jan", jan: "Jan",
  february: "Feb", feb: "Feb",
  march: "Mar", mar: "Mar",
  april: "Apr", apr: "Apr",
  may: "May",
  june: "Jun", jun: "Jun",
  july: "Jul", jul: "Jul",
  august: "Aug", aug: "Aug",
  september: "Sep", sept: "Sep", sep: "Sep",
  october: "Oct", oct: "Oct",
  november: "Nov", nov: "Nov",
  december: "Dec", dec: "Dec",
};

// Phrases that mean "no discrete month(s) can be derived" — always flag,
// never guess, even if a month name happens to appear nearby.
const AMBIGUOUS_PATTERNS = [
  /\bvaries\b/i,
  /\byear-?round\b/i,
  /\ball year\b/i,
  /\bmonthly\b/i,
  /\bweekly\b/i,
  /\bdaily\b/i,
  /\bnightly\b/i,
  /\bfull[- ]moon\b/i,
  /\bnew[- ]moon\b/i,
  /\blunar\b/i,
  /\bongoing\b/i,
  /\bcontinuous(ly)?\b/i,
  /\bthroughout the year\b/i,
  /\bseasonal(ly)?\b(?!.*\b(spring|summer|autumn|fall|winter)\b)/i,
];

function findMonthCodes(text) {
  const found = [];
  const lower = text.toLowerCase();
  const re = /\b(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
  let m;
  while ((m = re.exec(lower))) {
    const code = MONTH_NAME_TO_CODE[m[1]];
    if (code && !found.includes(code)) found.push(code);
  }
  return found;
}

function monthsBetween(startCode, endCode) {
  const startIdx = MONTHS.indexOf(startCode);
  const endIdx = MONTHS.indexOf(endCode);
  if (startIdx === -1 || endIdx === -1) return null;
  const result = [];
  let i = startIdx;
  // Guard against runaway ranges from a bad match (e.g. wraps more than once).
  for (let steps = 0; steps <= 12; steps++) {
    result.push(MONTHS[i]);
    if (i === endIdx) return result;
    i = (i + 1) % 12;
  }
  return null;
}

function classify(when) {
  if (!when || !when.trim()) return { status: "ambiguous", reason: "empty `when`" };

  for (const pattern of AMBIGUOUS_PATTERNS) {
    if (pattern.test(when)) {
      return { status: "ambiguous", reason: `matched pattern ${pattern}` };
    }
  }

  // Explicit month range, e.g. "Aug–Sep", "August-September", "late May–early June".
  const rangeMatch = when.match(
    /\b(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b[^a-z]{0,15}(?:–|-|to|through)[^a-z]{0,15}\b(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i,
  );
  if (rangeMatch) {
    const startCode = MONTH_NAME_TO_CODE[rangeMatch[1].toLowerCase()];
    const endCode = MONTH_NAME_TO_CODE[rangeMatch[2].toLowerCase()];
    const range = monthsBetween(startCode, endCode);
    if (range) return { status: "mapped", months: range, method: "range" };
  }

  // One or more discrete month mentions, no range connector, e.g. "February", "21 June".
  const discrete = findMonthCodes(when);
  if (discrete.length > 0) {
    return { status: "mapped", months: discrete, method: "discrete" };
  }

  // Named season, e.g. "summer", "in winter" — a 3-month window is still
  // specific enough to mislead a traveler, so this is left ambiguous/empty
  // rather than mapped, same as any other non-discrete `when`.
  const seasonMatch = when.match(/\b(spring|summer|autumn|fall|winter)\b/i);
  if (seasonMatch) {
    return { status: "ambiguous", reason: `season-only, not a discrete month ("${seasonMatch[1].toLowerCase()}")` };
  }

  return { status: "ambiguous", reason: "no month/season pattern recognized" };
}

function main() {
  const cities = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const slugs = requestedSlugs ?? Object.keys(cities);

  let mapped = 0;
  let ambiguous = 0;
  let skippedCached = 0;

  for (const slug of slugs) {
    const city = cities[slug];
    if (!city) {
      console.warn(`Skipping unknown city slug: ${slug}`);
      continue;
    }
    const events = city.whatsOn?.events ?? [];
    if (events.length === 0) continue;

    console.log(`\n${slug}`);
    for (const ev of events) {
      if (Array.isArray(ev.months) && ev.months.length > 0) {
        skippedCached++;
        console.log(`  "${ev.name}" -> already populated (${JSON.stringify(ev.months)}), skipping`);
        continue;
      }

      const result = classify(ev.when);
      if (result.status === "mapped") {
        console.log(`  "${ev.name}" (when: "${ev.when}") -> MAPPED [${result.method}]: ${JSON.stringify(result.months)}`);
        if (!dryRun) ev.months = result.months;
        mapped++;
      } else {
        console.log(`  "${ev.name}" (when: "${ev.when}") -> AMBIGUOUS, left empty (${result.reason})`);
        ambiguous++;
      }
    }
    if (!dryRun) {
      writeFileSync(DATA_PATH, JSON.stringify(cities, null, 2) + "\n");
    }
  }

  console.log(
    `\nDone. Mapped: ${mapped}, ambiguous (left empty): ${ambiguous}, already cached (skipped): ${skippedCached}.`,
  );
  if (dryRun) console.log("(dry run — no file written)");
}

main();
