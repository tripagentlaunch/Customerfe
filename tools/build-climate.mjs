// Real month-by-month weather for every city page (2026-11-21, from the website flow review: "Weather data is
// fabricated": the calendar's temperatures and icons were placeholders, e.g. snow in Bangkok). For each city
// centre (src/data/city-centers.json) this takes four years of daily observations (2021-2024) from Open-Meteo's
// historical archive (ERA5 reanalysis; free, no key) and writes each month's average daytime high, night-time
// low, rainy days and snowy days, plus one honest icon for the month.
//
//   node --use-system-ca tools/build-climate.mjs     # writes src/data/climate.generated.json (~2 min)
import fs from "node:fs";

const centers = JSON.parse(fs.readFileSync("src/data/city-centers.json", "utf8"));
const OUT = "src/data/climate.generated.json";
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One icon a traveller would recognise for the month, from the averages (WeatherIcon.tsx kinds).
function kindOf({ hi, lo, rainDays, snowDays, rainMm }) {
  if (snowDays >= 4) return "snow";
  if (hi <= 3) return "freezing";
  if (snowDays >= 1.5 && hi <= 8) return "sleet";
  if (rainMm >= 250 && hi >= 24) return "monsoon";
  if (rainDays >= 16 && hi >= 26) return "storm";
  if (rainDays >= 16) return "rain";
  if (rainDays >= 11 && hi >= 26) return "sun-showers";
  if (rainDays >= 11) return "drizzle";
  if (hi >= 35) return "hot";
  if (hi >= 29 && lo >= 23) return "humid";
  if (hi <= 10) return "cold-clear";
  if (rainDays >= 7) return "partly-cloudy";
  return "sunny";
}

async function city(lat, lon) {
  const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2021-01-01&end_date=2024-12-31` +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=UTC";
  for (let t = 0; t < 12; t++) {
    const r = await fetch(u, { headers: { "User-Agent": "TripAgentSite/1.0 (climate averages)" } });
    // The free tier counts ~40 "calls" per city and caps them per hour: wait it out rather than give up.
    if (r.status === 429) { process.stdout.write("(waiting for the hourly limit)"); await sleep(10 * 60 * 1000); continue; }
    if (r.status >= 500) { await sleep(5000 * (t + 1)); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = (await r.json()).daily;
    const m = Array.from({ length: 12 }, () => ({ hi: [], lo: [], p: [], s: [] }));
    d.time.forEach((day, i) => {
      const k = +day.slice(5, 7) - 1;
      m[k].hi.push(d.temperature_2m_max[i]); m[k].lo.push(d.temperature_2m_min[i]);
      m[k].p.push(d.precipitation_sum[i]); m[k].s.push(d.snowfall_sum[i]);
    });
    const years = 4;
    const avg = (a) => a.reduce((x, y) => x + (y ?? 0), 0) / (a.filter((v) => v != null).length || 1);
    return m.map((x) => {
      const out = {
        hi: Math.round(avg(x.hi)),
        lo: Math.round(avg(x.lo)),
        rainDays: Math.round(x.p.filter((v) => v >= 1).length / years),
        snowDays: Math.round((x.s.filter((v) => v > 0.5).length / years) * 10) / 10,
        rainMm: Math.round(x.p.reduce((a, b) => a + (b ?? 0), 0) / years),
      };
      return { ...out, kind: kindOf(out) };
    });
  }
  throw new Error("rate-limited");
}

const out = { ...prev };
const failed = [];
for (const [slug, [lat, lon]] of Object.entries(centers)) {
  if (out[slug] && !process.argv.includes("--refresh")) continue;
  // A city that can't be fetched keeps its previously saved months (the page always has weather to show).
  try { out[slug] = await city(lat, lon); fs.writeFileSync(OUT, JSON.stringify(out)); process.stdout.write("."); }
  catch (e) { failed.push(`${slug}: ${e.message}`); }
  await sleep(1500);
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`${Object.keys(out).length} cities${failed.length ? `, failed: ${failed.join("; ")}` : ""}`);
