import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { PlannerCity, PlannerData } from "../types/homepage";
import { toRoute } from "../lib/toRoute";
import styles from "./DestinationPlanner.module.css";

// Ported from index.html's #planner inline <script> 1:1 — the same
// month -> top-8-cities ranking (by that month's digit in monthScore, ties
// keep DATA order since Array#sort is stable), defaulting to the visitor's
// current month. Real client-side logic, no backend: see
// tools/extract_homepage.py's docstring.
const FOOT_LINK_TAG = /<a[^>]*>\{\{LINK\}\}<\/a>/;

function rankCities(cities: PlannerCity[], month: number) {
  return cities
    .map((city) => ({ city, score: parseInt(city.monthScore.charAt(month), 10) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export default function DestinationPlanner({ planner }: { planner: PlannerData }) {
  const [month, setMonth] = useState(() => new Date().getMonth());
  const ranked = useMemo(() => rankCities(planner.cities, month), [planner.cities, month]);
  const footPrefix = (planner.footTextHtml ?? "").replace(FOOT_LINK_TAG, "");

  return (
    <section className={`band ${styles.section}`} id="planner">
      <div className="wrap">
        <div className={`${styles.plHead} reveal`}>
          <div className="eyebrow">{planner.eyebrow}</div>
          <div className="rule" />
          <h2 style={{ fontSize: "clamp(30px,4.2vw,58px)" }} dangerouslySetInnerHTML={{ __html: planner.headingHtml ?? "" }} />
          <p className="lede" style={{ marginTop: 16 }}>
            {planner.lede}
          </p>
        </div>

        <div className={`${styles.plMonths} reveal d1`} role="tablist" aria-label="Choose a month">
          {planner.months.map((m, i) => (
            <button type="button" role="tab" aria-selected={i === month} onClick={() => setMonth(i)} key={i}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className={styles.plGrid} aria-live="polite">
          {ranked.map(({ city }, i) => (
            <Link
              className={styles.plCard}
              style={{ animationDelay: `${(i * 0.06).toFixed(2)}s` }}
              to={`/city-${city.slug}#stay`}
              key={city.slug}
            >
              <div className={styles.cardOuter}>
                <div className={styles.pic}>
                  <span style={{ backgroundImage: `url('${city.image}')` }} />
                </div>
                <div className={styles.cardBody}>
                  <h3>{city.name}</h3>
                  <ul className={styles.plStays}>
                    {city.topStays.map((stay, si) => (
                      <li key={si}>{stay}</li>
                    ))}
                  </ul>
                  <div className={styles.go}>Where to stay</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className={`${styles.plFoot} reveal`}>
          {footPrefix}
          <Link to={toRoute(planner.footLinkHref)}>{planner.footLinkLabel}</Link>
        </p>
      </div>
    </section>
  );
}
