// Event photos served from the site itself (2026-11-19). The city pages' events (and What's On, which uses
// the same photos) pointed straight at Wikimedia / Pexels: each page view depended on their servers, and
// Chrome blocks Wikimedia's full-size originals outright (ERR_BLOCKED_BY_ORB: 13 events showed nothing).
// This downloads each remote event photo once, resizes it to 900px on the long side at web quality, about 100 KB (macOS `sips`),
// saves it under public/images/events/<city>/<event>.jpg and points the event at that file. Credits are
// kept as they are. Google photos (/api/places/photo, our own proxy) and files already local are left alone.
//
//   node --use-system-ca tools/localize-event-photos.mjs           # all cities
//   node --use-system-ca tools/localize-event-photos.mjs --dry     # list only
// Then: node tools/link-whatson-photos.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CITIES = "src/data/cities.generated.json";
const OUT = "public/images/events";
const dry = process.argv.includes("--dry");
const UA = "TripAgentSite/1.0 (event photos; contact via tripagent.vip)";

const raw = fs.readFileSync(CITIES, "utf8");
const data = JSON.parse(raw);
const cities = Array.isArray(data) ? data : Object.values(data.cities || data);
const kebab = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const todo = [];
for (const ct of cities) {
  for (const e of ct.whatsOn?.events || []) {
    if (typeof e.photo === "string" && /^https?:\/\//.test(e.photo)) todo.push({ ct, e });
  }
}
console.log(`${todo.length} remote event photos`);
if (dry) process.exit(0);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0;
const failed = [];
for (const { ct, e } of todo) {
  const dir = path.join(OUT, ct.slug);
  const file = path.join(dir, `${kebab(e.name)}.jpg`);
  const rel = "/" + path.relative("public", file).split(path.sep).join("/");
  try {
    if (!fs.existsSync(file)) {
      let buf = null;
      for (let t = 0; t < 4 && !buf; t++) {
        const r = await fetch(e.photo, { headers: { "User-Agent": UA } });
        if (r.status === 429 || r.status >= 500) { await sleep(3000 * (t + 1)); continue; }
        if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) throw new Error(`HTTP ${r.status} ${r.headers.get("content-type")}`);
        buf = Buffer.from(await r.arrayBuffer());
      }
      if (!buf) throw new Error("rate-limited");
      fs.mkdirSync(dir, { recursive: true });
      const tmp = file + ".src";
      fs.writeFileSync(tmp, buf);
      // JPEG, at most 900px on the long side, sips "low" quality (~100 KB, sharp at card size).
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "low", "-Z", "900", tmp, "--out", file], { stdio: "ignore" });
      fs.unlinkSync(tmp);
      await sleep(2500);
    }
    e.photo = rel;
    done++;
  } catch (err) {
    failed.push(`${ct.slug}: ${e.name}: ${String(err.message || err).slice(0, 80)}`);
  }
  if ((done + failed.length) % 25 === 0) console.log(`${done + failed.length}/${todo.length}`);
}

// Same layout as the file had (two-space JSON, or one line).
const indent = raw.startsWith("{\n") || raw.startsWith("[\n") ? 2 : undefined;
fs.writeFileSync(CITIES, JSON.stringify(data, null, indent) + (indent ? "\n" : ""));
console.log(`saved ${done}, failed ${failed.length}`);
if (failed.length) console.log(failed.join("\n"));
