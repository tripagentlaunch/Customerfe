import { useEffect } from "react";
import { Link } from "react-router-dom";
import citiesData from "../data/cities-index.generated.json";
import type { CitiesIndexPageData } from "../types/cities-index";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { useCitySearch, WHO, BUDGET, FLIGHT, MOOD, MONTHS, ORIGINS, cardChips, type CityRecord } from "../lib/citySearch";
import styles from "./cities-index-page.module.css";

const data = citiesData as unknown as CitiesIndexPageData;

function imgUrl(src: string, w = 800, q = 72) {
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

function CityCard({ city, origin }: { city: CityRecord; origin: string }) {
  const chips = cardChips(city, origin);
  return (
    <Link className={styles.csCard} to={`/city-${city.slug}`}>
      <div className={styles.csPic}>
        <span style={city.band ? { backgroundImage: `url('${imgUrl(city.band)}')` } : undefined} />
      </div>
      <h3 className={styles.csName}>{city.name}</h3>
      <span className={styles.csCountry}>{city.country}</span>
      {chips.length > 0 && (
        <div className={styles.csChips}>
          {chips.map((c, i) => (
            <span className={styles.csChip} key={i}>
              {c}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

// Ported from js/citysearch.js — instant search + live filtering over all
// 110 cities (When/Who/Mood/Budget/flight-distance from origin). Static
// grouped grid (below) stays as the first paint and as the fallback if the
// data fetch fails — dynamic surface replaces it once ready, same
// graceful-degrade contract citysearch.js's boot() has on the static site.
export default function CitiesIndexPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  const search = useCitySearch();

  // Re-observe on status change: the search UI's .reveal wrapper doesn't
  // exist in the DOM until `status` flips to "ready" (it replaces the
  // static grid), so the initial mount-time observation would otherwise
  // never see it and it would stay stuck at opacity:0.
  useScrollReveal([search.status]);
  const { hero, groups, cta } = data;
  const originLabel = ORIGINS[search.origin] || "Delhi";

  return (
    <>
      <section className="band" style={{ paddingTop: 0, paddingBottom: "clamp(60px,8vh,110px)" }}>
        <div className="wrap">
          <div className={`${styles.ciHero} reveal`}>
            <div className="k">{hero.k}</div>
            <h1>{hero.heading}</h1>
            <p>{hero.lede}</p>
          </div>

          {search.status === "ready" ? (
            <div className="reveal" style={{ marginTop: "clamp(40px,6vh,72px)" }}>
              <div className={styles.csSearchwrap}>
                <svg className={styles.csIc} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={1.5} />
                  <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  className={styles.csSearchInput}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Search a city or country…"
                  aria-label="Search cities and countries"
                  value={search.state.q}
                  onChange={(e) => search.setQuery(e.target.value)}
                />
              </div>

              <div className={styles.csBar}>
                <div className={styles.csField}>
                  <label htmlFor="cs-month">When</label>
                  <select
                    id="cs-month"
                    className={styles.csSelect}
                    value={search.state.month}
                    onChange={(e) => search.setField("month", e.target.value)}
                  >
                    <option value="">Any month</option>
                    {MONTHS.map((m, i) => (
                      <option value={String(i + 1)} key={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.csField}>
                  <label htmlFor="cs-who">Who</label>
                  <select id="cs-who" className={styles.csSelect} value={search.state.who} onChange={(e) => search.setField("who", e.target.value)}>
                    <option value="">Anyone</option>
                    {WHO.map((w) => (
                      <option value={w.v} key={w.v}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.csField}>
                  <label htmlFor="cs-budget">Budget</label>
                  <select
                    id="cs-budget"
                    className={styles.csSelect}
                    value={search.state.budget}
                    onChange={(e) => search.setField("budget", e.target.value)}
                  >
                    {BUDGET.map((b) => (
                      <option value={b.v} key={b.v}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.csField}>
                  <label htmlFor="cs-flight">From {originLabel}</label>
                  <select
                    id="cs-flight"
                    className={styles.csSelect}
                    value={search.state.flight}
                    onChange={(e) => search.setField("flight", e.target.value)}
                  >
                    {FLIGHT.map((f) => (
                      <option value={f.v} key={f.v}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.csMeta}>
                  <span className={styles.csCount} aria-live="polite">
                    {search.results.length === 0
                      ? "No places match"
                      : (search.results.length === 1 ? "1 place" : `${search.results.length} places`) + (search.filtered ? " match" : "")}
                  </span>
                  {search.filtered && (
                    <button type="button" className={styles.csClear} onClick={search.clearAll}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.csMoods}>
                <span className={styles.csMoodlbl}>Mood</span>
                {MOOD.map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    className={`${styles.csMood}${search.state.mood[m.v] ? ` ${styles.csMoodOn}` : ""}`}
                    aria-pressed={!!search.state.mood[m.v]}
                    onClick={() => search.toggleMood(m.v)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {search.results.length === 0 ? (
                <div className={styles.csEmpty}>
                  <p>Nothing fits all of that. Loosen a filter — or tell your advisor and we&rsquo;ll shortlist by hand.</p>
                  <Link to="/enquire">Talk to your advisor</Link>
                </div>
              ) : (
                <div className={styles.csGrid}>
                  {search.results.map((c) => (
                    <CityCard city={c} origin={search.origin} key={c.slug} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            groups.map((g, i) => (
              <div className={`${styles.cigroup} reveal`} key={i}>
                <div className={styles.cigl}>
                  <span className="eyebrow">{g.label}</span>
                  <span className={styles.ciline} />
                </div>
                <div className={styles.cigrid}>
                  {g.cities.map((c, j) => (
                    <Link className="ci" to={toRoute(c.href)} key={j}>
                      <div className="cipic">
                        <span style={{ backgroundImage: `url('${c.image}')` }} />
                      </div>
                      <div className={styles.cin}>{c.name}</div>
                      <div className={styles.cic}>{c.country}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ fontSize: "clamp(30px,4vw,54px)" }}>
            {cta.heading}
          </h2>
          <p className="lede reveal d2" style={{ margin: "20px auto 0", maxWidth: "52ch" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
