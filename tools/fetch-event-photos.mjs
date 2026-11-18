// Photos for the city pages' events (What's on / the guide's Events tab), written into
// src/data/cities.generated.json as event.photo + event.photoCredit (2026-11-18).
//
// Every event without a photo showed the city's hero image, so all of a city's events looked the same.
// For each event: a real photo of that event from Wikimedia Commons (free licence, credited), searched
// by event and city; only landscape JPEG photographs at least MIN_WIDTH px wide, never maps, logos,
// posters, flags or diagrams. When Commons has none, a Pexels photo for the event and city.
// A city never shows the same image for two events.
//
// Usage:
//   node --use-system-ca --env-file=.env.local tools/fetch-event-photos.mjs [--cities=slug1,slug2] [--dry-run] [--review=out.json]
//   (PEXELS_API_KEY optional: without it only Commons is used)
//
// Safe to re-run: an event that already has a photo is skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/cities.generated.json");
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";
const UA = "TripAgentEventPhotos/1.0 (https://www.tripagent.vip)";
const MIN_WIDTH = 1000;
const WIDTH = 1280;
const NOT_PHOTO = /\b(map|logo|poster|flag|diagram|chart|coat of arms|emblem|seal|stamp|banner|icon|plan|scan|ticket|leaflet|brochure|cover|signage|sign)\b/i;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const citiesArg = args.find((a) => a.startsWith("--cities="));
const only = citiesArg ? new Set(citiesArg.slice(9).split(",").filter(Boolean)) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The office network drops a TLS handshake now and then: retry, and never stop the whole run for one call.
async function get(url, init = {}) {
  for (let i = 0; i < 3; i++) {
    try { return await fetch(url, init); } catch { await sleep(2000 * (i + 1)); }
  }
  return { ok: false, json: async () => ({}) };
}

const words = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
  .filter((w) => w.length > 2 && !["the", "and", "festival", "season", "week", "day", "days", "fair", "with"].includes(w));

async function commons(query, eventName) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({
    action: "query", format: "json", generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6",
    gsrlimit: "20", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: String(WIDTH),
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await get(u, { headers: { "User-Agent": UA } });
  if (!r.ok) return [];
  const pages = Object.values((await r.json()).query?.pages || {});
  const key = words(eventName);
  return pages
    .map((p) => ({ title: p.title, info: (p.imageinfo || [])[0], index: p.index }))
    .filter(({ title, info }) => info && info.mime === "image/jpeg" && info.width >= MIN_WIDTH && info.width > info.height * 1.15
      && !NOT_PHOTO.test(title.replace(/^File:/, "").replace(/[_-]/g, " ")))
    .map((x) => ({ ...x, score: key.filter((w) => x.title.toLowerCase().includes(w)).length * 10 - x.index }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ title, info }) => {
      const m = info.extmetadata || {};
      const strip = (h) => (h || "").replace(/<[^>]+>/g, "").trim();
      const artist = strip(m.Artist?.value).slice(0, 80) || "Wikimedia Commons";
      const licence = strip(m.LicenseShortName?.value);
      return { url: info.thumburl || info.url, credit: `Photo: ${artist}${licence ? ` / ${licence}` : ""} (Wikimedia Commons)`, source: title };
    });
}

async function pexels(query) {
  if (!PEXELS_API_KEY) return [];
  const r = await get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY } });
  if (!r.ok) return [];
  return ((await r.json()).photos || []).map((p) => ({
    url: p.src?.large2x || p.src?.large, credit: `Photo: ${p.photographer || "Pexels"} / Pexels`, source: p.url }));
}

const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
const stats = { events: 0, commons: 0, pexels: 0, none: [] };
const picks = [];
for (const [slug, city] of Object.entries(data)) {
  if (only && !only.has(slug)) continue;
  const events = city?.whatsOn?.events || [];
  const cityName = (city.hero?.name || slug.replace(/-/g, " ")).replace(/\s*&.*$/, "");
  const used = new Set(events.map((e) => e.photo).filter(Boolean));
  for (const e of events) {
    if (e.photo || !e.name) continue;
    stats.events++;
    let pick = null;
    const name = e.name.split(/\s+\/\s+|\s+\(/)[0].trim();
    for (const q of [`${name} ${cityName}`, name]) {
      pick = (await commons(q, name)).find((c) => !used.has(c.url));
      await sleep(400);
      if (pick) { stats.commons++; break; }
    }
    if (!pick) {
      pick = (await pexels(`${name} ${cityName}`)).find((c) => !used.has(c.url));
      await sleep(1200);
      if (pick) stats.pexels++;
    }
    if (!pick) { stats.none.push(`${slug}: ${e.name}`); continue; }
    used.add(pick.url);
    e.photo = pick.url;
    e.photoCredit = pick.credit;
    picks.push({ slug, event: e.name, url: pick.url, source: pick.source, credit: pick.credit });
    console.log(`${slug} | ${e.name} -> ${pick.source}`);
  }
}
const reviewArg = args.find((a) => a.startsWith("--review="));
if (reviewArg) writeFileSync(reviewArg.slice(9), JSON.stringify(picks, null, 1));
if (!dryRun) writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify({ ...stats, none: stats.none.length, missing: stats.none }, null, 1));
