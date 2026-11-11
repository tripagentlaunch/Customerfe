import { useEffect, useRef } from "react";
import type { CityData } from "../types/city";
import styles from "./CalendarSection.module.css";
import WeatherIcon, { WEATHER_LABEL, type WeatherKind } from "./WeatherIcon";

type WhenToGo = CityData["whenToGo"];

// "When to go" (2026-11-11, direct request): one dark card. The best months as the section heading, all twelve months in
// order (a tag, a weather icon and the month name each), the best months highlighted, and the city's summary
// underneath. Was: the blurb + a Jan-Dec shaded strip (desktop) / "Best time" and "Fine shoulder" rows (phone).
//
// Weather: the city data has no weather yet. Each month's icon comes from `weather` when the backend sends one
// (a WeatherKind key); until then it is derived from the tier, which is a placeholder, not real weather.
const TAGS: Record<string, string> = { wm2: "Best", wm1: "Good", wm0: "Avoid" };
// CSS-module class names are camelCased (vite localsConvention), so tag_wm2 is styles.tagWm2.
const TAG_CLASS: Record<string, string> = { wm2: styles.tagWm2, wm1: styles.tagWm1, wm0: styles.tagWm0 };
const FALLBACK_WEATHER: Record<string, WeatherKind> = { wm2: "sunny", wm1: "partly-cloudy", wm0: "cloudy" };
// const MONTH_CODES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CalendarSection({ whenToGo }: { whenToGo: WhenToGo }) {
  const rowRef = useRef<HTMLOListElement>(null);

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
              const kind = (m as { weather?: WeatherKind }).weather ?? FALLBACK_WEATHER[m.tier] ?? "cloudy";
              const isBest = m.tier === "wm2";
              return (
                <li key={i} className={styles.wtgItem}>
                  <div
                    className={`${styles.wtgTile}${isBest ? ` ${styles.wtgTileOn}` : ""}`}
                    data-best={isBest ? "true" : undefined}
                    aria-label={`${code}: ${TAGS[m.tier] ?? ""}, ${WEATHER_LABEL[kind]}`}
                  >
                    <span className={`${styles.wtgTag} ${TAG_CLASS[m.tier] ?? ""}`}>{TAGS[m.tier] ?? ""}</span>
                    <WeatherIcon kind={kind} />
                    <span className={styles.wtgMonth}>{code}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {whenToGo.blurb && <p className={styles.wtgBlurb}>{whenToGo.blurb}</p>}
        </div>
      </div>
    </section>
  );
}
