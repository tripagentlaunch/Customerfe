import { useEffect, useRef } from "react";
import climateData from "../data/climate.generated.json";
import type { CityData } from "../types/city";
import styles from "./CalendarSection.module.css";
import WeatherIcon, { WEATHER_KINDS, WEATHER_LABEL, type WeatherKind } from "./WeatherIcon";

type WhenToGo = CityData["whenToGo"];

// "When to go" (2026-11-11, direct request): one dark card. The best months as the section heading, all twelve months in
// order (a tag, a weather icon and the month name each), the best months highlighted, and the city's summary
// underneath. Was: the blurb + a Jan-Dec shaded strip (desktop) / "Best time" and "Fine shoulder" rows (phone).
//
// Weather: real ten-year averages (see useClimate below).
const TAGS: Record<string, string> = { wm2: "Best", wm1: "Good", wm0: "Avoid" };
// CSS-module class names are camelCased (vite localsConvention), so tag_wm2 is styles.tagWm2.
const TAG_CLASS: Record<string, string> = { wm2: styles.tagWm2, wm1: styles.tagWm1, wm0: styles.tagWm0 };

// Real weather (2026-11-21, from the website flow review: the previous figures were placeholders, e.g. snow in
// Bangkok). Ten-year monthly averages per city from Open-Meteo's archive (tools/build-climate.mjs): the
// month's average daytime high and an icon from its rain and snow days. A city without data shows none.
type Climate = { hi: number; lo: number; rainDays: number; snowDays: number; rainMm: number; kind: WeatherKind };
// Saved with the page (2026-11-21, direct request: the weather always shows, never a blank while loading): the
// averages are part of the build, and a refresh that can't reach a city keeps its saved months.
const CLIMATE = climateData as unknown as Record<string, Climate[]>;
function useClimate(slug: string): Climate[] | null {
  return CLIMATE[slug] ?? null;
}
// The previous figures, kept only for a city whose real averages are not saved yet (2026-11-21, direct
// request: never a blank). Real data replaces them city by city (tools/build-climate.mjs).
const NYC_MOCK: { weather: WeatherKind; tempC: number }[] = [
  { weather: "freezing", tempC: 0 }, { weather: "snow", tempC: 1 }, { weather: "sleet", tempC: 5 },
  { weather: "sun-showers", tempC: 11 }, { weather: "partly-cloudy", tempC: 17 }, { weather: "sunny", tempC: 22 },
  { weather: "humid", tempC: 25 }, { weather: "storm", tempC: 24 }, { weather: "sunny", tempC: 20 },
  { weather: "cloudy", tempC: 14 }, { weather: "drizzle", tempC: 8 }, { weather: "cold-clear", tempC: 3 },
];
// Mock weather follows the month's rating so a Best month never shows a tornado: Best months get fair weather, Good
// months a mix, Avoid months the harsh kinds.
const MOCK_BY_TIER: Record<string, WeatherKind[]> = {
  wm2: ["sunny", "partly-cloudy", "sun-showers", "sunny", "hot", "humid"],
  wm1: ["partly-cloudy", "cloudy", "rain", "drizzle", "windy", "haze", "fog", "sun-showers"],
  wm0: ["freezing", "snow", "sleet", "hail", "storm", "heavy-rain", "monsoon", "sandstorm", "cold-clear", "fog", "hot"],
};
function mockWeather(slug: string, i: number, tier: string): { weather: WeatherKind; tempC: number } {
  if (slug === "new-york") return NYC_MOCK[i];
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const base = 8 + (h % 18);
  const swing = 4 + (h % 9);
  return {
    weather: (MOCK_BY_TIER[tier] ?? WEATHER_KINDS)[(h + i * 7) % (MOCK_BY_TIER[tier] ?? WEATHER_KINDS).length],
    tempC: Math.round(base + swing * Math.sin(((i - 3) / 12) * 2 * Math.PI)),
  };
}
// const MONTH_CODES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CalendarSection({ whenToGo, slug = "", climate }: { whenToGo: WhenToGo; slug?: string; climate?: string | null }) {
  const rowRef = useRef<HTMLOListElement>(null);
  const climate12 = useClimate(slug);

  // Phone: the row scrolls sideways; bring the first "best" month into view.
  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>('[data-best="true"]');
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: Math.max(0, el.offsetLeft - 12), behavior: "smooth" });
  }, []);

  const best = whenToGo.months.filter((m) => m.tier === "wm2").map((m) => m.code);
  const headline = whenToGo.bestMonths || best.join(", ");

  return (
    <section className="band tight ta-when-go">
      <div className="wrap">
        <div className="reveal" style={{ maxWidth: "60ch" }}>
          <div className="eyebrow">When to go</div>
          <div className="rule" />
          {headline && <h2 style={{ fontSize: "28px" }}>{headline}</h2>}
        </div>

        <div className={`${styles.wtgCard} reveal d1`}>
          <ol className={styles.wtgRow} ref={rowRef} aria-label="Month by month">
            {whenToGo.months.map((m, i) => {
              const code = m.code ?? "";
              const real = climate12?.[i];
              const prev = real ? null : mockWeather(slug, i, m.tier);
              const kind = real?.kind ?? prev?.weather ?? null;
              const tempC = real ? real.hi : prev?.tempC ?? null;
              const isBest = m.tier === "wm2";
              return (
                <li key={i} className={styles.wtgItem}>
                  <div
                    className={`${styles.wtgTile}${isBest ? ` ${styles.wtgTileOn}` : ""}`}
                    data-best={isBest ? "true" : undefined}
                    aria-label={`${code}: ${TAGS[m.tier] ?? ""}${kind ? `, ${WEATHER_LABEL[kind]}` : ""}${tempC != null ? `, highs around ${tempC} degrees Celsius` : ""}`}
                    title={real ? `Average high ${real.hi}°C, low ${real.lo}°C; about ${real.rainDays} rainy days` : undefined}
                  >
                    <span className={`${styles.wtgTag} ${TAG_CLASS[m.tier] ?? ""}`}>{TAGS[m.tier] ?? ""}</span>
                    {kind && <WeatherIcon kind={kind} className={styles.wtgIcon} />}
                    {tempC != null && <span className={styles.wtgTemp}>{tempC}°C</span>}
                    <span className={styles.wtgMonth}>{code}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Climate text from "Before you go" (2026-11-16, direct request); the old summary is the fallback. */}
          {(climate || whenToGo.blurb) && <p className={styles.wtgBlurb}>{climate || whenToGo.blurb}</p>}
        </div>
      </div>
    </section>
  );
}
