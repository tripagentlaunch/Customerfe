// The calendar's city index (2026-11-20, calendar-first planning). cities.generated.json is 6.5 MB, too much
// to load on a phone just to rank cities for a set of dates, so this writes the little the calendar needs:
// each city's month ratings, ideal length, flight time from India, photo and its events by month.
//
//   node tools/build-when-index.mjs    # writes src/data/when-index.generated.json
// Run again whenever cities.generated.json changes.
import fs from "node:fs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TIER = { wm2: 2, wm1: 1, wm0: 0 };
const c = JSON.parse(fs.readFileSync("src/data/cities.generated.json", "utf8"));
const cities = Array.isArray(c) ? c : Object.values(c.cities || c);

// The city's own hero photo, without the image-service wrapper: "/img/cities/bangkok-v2.jpg".
function imageOf(ct) {
  const h = ct.hero?.image || "";
  const m = /[?&]url=([^&]+)/.exec(h);
  const p = m ? decodeURIComponent(m[1]).replace(/\?.*$/, "") : h.replace(/\?.*$/, "");
  return p && fs.existsSync("public" + p) ? p : fs.existsSync(`public/img/cities/${ct.slug}.jpg`) ? `/img/cities/${ct.slug}.jpg` : null;
}

const out = cities
  .map((ct) => {
    const months = MONTHS.map((m) => TIER[ct.whenToGo?.months?.find((x) => x.code === m)?.tier] ?? null);
    const fact = (label) => ct.hero?.facts?.find((f) => (f.label || "").toLowerCase().startsWith(label));
    const ideal = parseInt(fact("ideal length")?.value ?? "", 10);
    const flight = fact("from india");
    const events = (ct.whatsOn?.events || [])
      .filter((e) => Array.isArray(e.months) && e.months.length)
      .map((e) => ({ name: e.name, when: e.when || null, months: e.months.map((m) => MONTHS.indexOf(m)).filter((i) => i >= 0), photo: e.photo || null }));
    return {
      slug: ct.slug,
      name: ct.hero?.name || ct.slug,
      country: ct.hero?.breadcrumbCountry?.label || null,
      image: imageOf(ct),
      tagline: ct.hero?.tagline || null,
      months,
      ideal: Number.isFinite(ideal) ? ideal : null,
      flight: flight ? [flight.value, flight.small].filter(Boolean).join(" ") : null,
      events,
    };
  })
  .filter((x) => x.months.some((m) => m !== null));

fs.writeFileSync("src/data/when-index.generated.json", JSON.stringify(out));
console.log(`${out.length} cities, ${(fs.statSync("src/data/when-index.generated.json").size / 1024).toFixed(0)} KB`);
