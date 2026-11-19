// What's On cards get their own event's photo (2026-11-19, direct request: "the images on what's on, month
// on month, need to be improved for each and every month and city"). Each What's On event is the same event
// as one on its city page (cities.generated.json -> <city>.whatsOn.events), whose photo was sourced and
// reviewed there. This copies that photo and its credit onto the What's On event, so the card shows the
// event itself instead of the city's general photo. Safe to run again after either file changes.
//
//   node tools/link-whatson-photos.mjs          # writes src/data/whatson.generated.json
//   node tools/link-whatson-photos.mjs --check  # reports only
import fs from "node:fs";

const WHATSON = "src/data/whatson.generated.json";
const CITIES = "src/data/cities.generated.json";
const check = process.argv.includes("--check");

const w = JSON.parse(fs.readFileSync(WHATSON, "utf8"));
const c = JSON.parse(fs.readFileSync(CITIES, "utf8"));
const cities = Array.isArray(c) ? c : Object.values(c.cities || c);
const byCity = Object.fromEntries(cities.map((ct) => [ct.slug, ct.whatsOn?.events || []]));
const key = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");

let linked = 0;
const missing = [];
for (const m of w.months) {
  for (const e of m.events) {
    const slug = /city-(.+?)(?:\.html)?$/.exec(e.href || "")?.[1];
    const list = byCity[slug] || [];
    const k = key(e.name);
    const match =
      list.find((x) => key(x.name) === k) ||
      list.find((x) => k.length > 5 && (key(x.name).includes(k) || k.includes(key(x.name))));
    if (match?.photo) {
      e.photo = match.photo;
      e.photoCredit = match.photoCredit ?? null;
      linked++;
    } else {
      delete e.photo;
      delete e.photoCredit;
      missing.push(`${m.name}: ${e.name} (${slug ?? "no city"})`);
    }
  }
}

const total = w.months.reduce((n, m) => n + m.events.length, 0);
console.log(`${linked} of ${total} events have their own photo`);
if (missing.length) console.log("No photo (the card keeps the city's):\n  " + missing.join("\n  "));
if (!check) fs.writeFileSync(WHATSON, JSON.stringify(w, null, 2) + "\n");
