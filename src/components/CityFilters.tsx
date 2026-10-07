import { BUDGET, FLIGHT, MONTHS, MOOD, ORIGINS, WHO, type CitySearch } from "../lib/citySearch";
import styles from "./CityFilters.module.css";

// Search box + When/Who/Budget/Distance selects + Mood chips for the city
// search (useCitySearch). Lives on the Destinations page; whatever list sits
// beneath it filters itself from the same `search` object.
export default function CityFilters({ search }: { search: CitySearch }) {
  const originLabel = ORIGINS[search.origin] || "Delhi";
  return (
    <div>
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
          <select id="cs-month" className={styles.csSelect} value={search.state.month} onChange={(e) => search.setField("month", e.target.value)}>
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
          <select id="cs-budget" className={styles.csSelect} value={search.state.budget} onChange={(e) => search.setField("budget", e.target.value)}>
            {BUDGET.map((b) => (
              <option value={b.v} key={b.v}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.csField}>
          <label htmlFor="cs-flight">From {originLabel}</label>
          <select id="cs-flight" className={styles.csSelect} value={search.state.flight} onChange={(e) => search.setField("flight", e.target.value)}>
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
    </div>
  );
}
