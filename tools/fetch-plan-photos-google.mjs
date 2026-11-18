// Photos for "The Plan" cards that still have none, from Google Places (2026-11-18).
//
// For each plan slot (src/data/city-plans.json) with no photo: the place is looked up on Google
// Places by the slot's venue or title in the city ("Spinners Web and Tribal Gallery" -> "Spinners
// Web"), and its photo is saved as public/images/plans/<city>/day<N>-<label>.jpg, the same files
// the other plan photos use, so the page never depends on a Google link that expires.
// Only a place whose name matches the slot is used; otherwise the slot is listed and left empty.
// Check every new photo by eye before committing.
//
// Usage:
//   GOOGLE_PLACES_API_KEY=... node --use-system-ca tools/fetch-plan-photos-google.mjs --cities=nairobi-mara [--dry-run]
//   --slots="Toi Market,Geco" to do only those slots; --query="Geco=Geco Cafe Bar Nairobi" to steer a search.
//   --review=<dir>: save the place's first 6 photos as <dir>/<slot>_<n>.jpg to choose from (nothing written);
//   --pick-file=picks.json {"nairobi-mara/day1-morning": 3}: only those slots, with that photo (preferred).
//   --pick="Toi Market=3" then uses photo 3 of that place instead of the first. --replace redoes slots that have a photo.
//
// Safe to re-run: a slot that already has a photo is skipped.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANS = path.join(__dirname, "../src/data/city-plans.json");
const CITIES = path.join(__dirname, "../src/data/cities.generated.json");
const IMAGES = path.join(__dirname, "../public/images/plans");
const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) { console.error("GOOGLE_PLACES_API_KEY is not set"); process.exit(1); }

const args = process.argv.slice(2);
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const dryRun = args.includes("--dry-run");
const only = new Set(opt("cities").split(",").filter(Boolean));
const slotsOnly = new Set(opt("slots").split(",").map((s) => s.trim()).filter(Boolean));
const review = opt("review");
const replace = args.includes("--replace");
const picks = Object.fromEntries(opt("pick").split(";").filter(Boolean).map((p) => { const [k, v] = p.split("="); return [k.trim(), Number(v)]; }));
const steer = Object.fromEntries(opt("query").split(";").filter(Boolean).map((p) => p.split("=").map((s) => s.trim())));
const steerFile = opt("query-file");          // JSON {"<slot title>": "<search>"} for many slots at once
if (steerFile) Object.assign(steer, JSON.parse(readFileSync(steerFile, "utf8")));
// --pick-file=json {"<city>/day<N>-<label>": n}: only those slots, each with its chosen photo (safe with any title).
const pickFile = opt("pick-file");
const slotPicks = pickFile ? JSON.parse(readFileSync(pickFile, "utf8")) : null;
if (replace && !slotsOnly.size && !slotPicks) { console.error("--replace needs --slots or --pick-file"); process.exit(1); }

const words = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
  .filter((w) => w.length > 2 && !["the", "and", "cafe", "restaurant", "bar", "hotel", "ltd", "kenya"].includes(w));
// Google's name must carry the slot's own words ("Spinners Web Kenya Ltd" for "Spinners Web").
const sameName = (ours, theirs) => { const a = words(ours), b = new Set(words(theirs)); return a.length > 0 && a.filter((w) => b.has(w)).length >= Math.min(2, a.length); };

async function place(query) {
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.photos" },
    body: JSON.stringify({ textQuery: query, maxResultCount: 3 }),
  });
  return r.ok ? (await r.json()).places || [] : [];
}

async function download(photoName, file) {
  const r = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1600&skipHttpRedirect=true&key=${KEY}`);
  const uri = r.ok ? (await r.json()).photoUri : null;
  if (!uri) return false;
  const img = await fetch(uri);
  if (!img.ok) return false;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await img.arrayBuffer()));
  return true;
}

const plans = JSON.parse(readFileSync(PLANS, "utf8"));
const cities = JSON.parse(readFileSync(CITIES, "utf8"));
const report = { done: [], skipped: [] };
for (const [slug, plan] of Object.entries(plans)) {
  if (only.size && !only.has(slug)) continue;
  const city = (cities[slug]?.hero?.name || slug).replace(/\s*&.*$/, "");
  for (const [di, day] of (plan.days || []).entries()) {
    for (const slot of day.slots || []) {
      const slotKey = `${slug}/day${di + 1}-${(slot.label || "slot").toLowerCase()}`;
      if (slotPicks && !(slotKey in slotPicks)) continue;
      if ((slot.photo && !replace) || (slotsOnly.size && !slotsOnly.has(slot.title))) continue;
      // "Spinners Web and Tribal Gallery", "Geco and Cave-à-Manger": the first place named.
      const name = (slot.venue || slot.title || "").split(/\s+(?:and|&)\s+|,\s*/)[0].trim();
      let steered = steer[slot.title] || steer[name];
      // "!query": take Google's top result for this exact search (its spelling differs from the card's:
      // "JackieO'", "Coricancha"); the photo is still checked by eye.
      const trustTop = !!steered && steered.startsWith("!");
      if (trustTop) steered = steered.slice(1);
      const query = steered || `${name}, ${city}`;
      // A steered search (an activity card pointed at its place) is checked against the place searched for.
      const matchName = steered ? steered.split(",")[0] : name;
      const hit = (await place(query)).find((p) => p.photos?.length && (trustTop || sameName(matchName, p.displayName?.text)));
      if (!hit) { report.skipped.push(`${slug} day ${di + 1} ${slot.label}: ${slot.title} (no matching place for "${query}")`); continue; }
      if (review) {
        for (const [n, ph] of hit.photos.slice(0, 6).entries())
          await download(ph.name, path.join(review, `${slug}_day${di + 1}-${(slot.label || "slot").toLowerCase()}_${n}.jpg`));
        report.done.push(`${slug} day ${di + 1} ${slot.label}: ${slot.title} <- ${hit.displayName.text}: ${Math.min(6, hit.photos.length)} photos in ${review}`);
        continue;
      }
      const rel = `/images/plans/${slug}/day${di + 1}-${(slot.label || "slot").toLowerCase()}.jpg`;
      const file = path.join(IMAGES, slug, path.basename(rel));
      if (existsSync(file) && !replace) { report.skipped.push(`${slug}: ${rel} already exists`); continue; }
      const photo = hit.photos[slotPicks?.[slotKey] ?? picks[slot.title] ?? picks[name] ?? 0] || hit.photos[0];
      if (!dryRun && !(await download(photo.name, file))) { report.skipped.push(`${slug}: ${slot.title} (photo download failed)`); continue; }
      if (!dryRun) slot.photo = rel;
      report.done.push(`${slug} day ${di + 1} ${slot.label}: ${slot.title} <- ${hit.displayName.text} -> ${rel}`);
    }
  }
}
if (!dryRun) writeFileSync(PLANS, JSON.stringify(plans, null, 2) + "\n");
console.log(JSON.stringify(report, null, 1));
