import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BUDGET, FLIGHT, MONTHS, MOOD, ORIGINS, WHO, type CitySearch } from "../lib/citySearch";
import { useIsMobile } from "../hooks/useIsMobile";
import styles from "./CityFilters.module.css";

// Search box + When/Who/Budget/Distance selects + Mood chips for the city
// search (useCitySearch). Lives on the Destinations page; whatever list sits
// beneath it filters itself from the same `search` object.
export default function CityFilters({ search }: { search: CitySearch }) {
  const originLabel = ORIGINS[search.origin] || "Bengaluru";
  const isMobile = useIsMobile();

  // Phone: the four selects live in a bottom sheet behind one Filters button.
  // `open` mounts the sheet; `closing` plays the slide-down before unmounting.
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeSheet = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 240);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    document.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => {
    if (!isMobile) setOpen(false);
  }, [isMobile]);
  // Phone mood row: selected chips are listed first (left), the rest keep their
  // order; the row scrolls back to the start so the selection is in view.
  const moodRowRef = useRef<HTMLDivElement>(null);
  const moods = isMobile ? [...MOOD.filter((m) => search.state.mood[m.v]), ...MOOD.filter((m) => !search.state.mood[m.v])] : MOOD;
  const selectedMoods = MOOD.filter((m) => search.state.mood[m.v]).length;
  useEffect(() => {
    if (isMobile) moodRowRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [selectedMoods, isMobile]);
  const activeFilters = [search.state.month, search.state.who, search.state.budget, search.state.flight].filter(Boolean).length;

  const fields = (
    <>
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
    </>
  );
  const meta = (
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
  );

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

      {isMobile ? (
        <div className={styles.csBarM}>
          <button type="button" className={styles.csFilterBtn} onClick={() => setOpen(true)} aria-haspopup="dialog">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="8" cy="17" r="2" />
            </svg>
            Filters
            {activeFilters > 0 && <span className={styles.csBadge}>{activeFilters}</span>}
          </button>
          {meta}
        </div>
      ) : (
        <div className={styles.csBar}>
          {fields}
          {meta}
        </div>
      )}

      <div ref={moodRowRef} className={styles.csMoods} role="group" aria-label="Mood">
        <span className={styles.csMoodlbl}>Mood</span>
        {moods.map((m) => (
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

      {isMobile &&
        open &&
        createPortal(
          <div className={`${styles.sheetRoot}${closing ? ` ${styles.sheetClosing}` : ""}`}>
            <div className={styles.sheetScrim} onClick={closeSheet} />
            <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filters">
              <div className={styles.sheetGrab} aria-hidden="true" />
              <div className={styles.sheetHead}>
                <h3>Filters</h3>
                <button type="button" className={styles.sheetClose} onClick={closeSheet} aria-label="Close filters">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
                  </svg>
                </button>
              </div>
              <div className={styles.sheetBody}>{fields}</div>
              <div className={styles.sheetFoot}>
                {search.filtered && (
                  <button type="button" className={styles.sheetClear} onClick={search.clearAll}>
                    Clear all
                  </button>
                )}
                <button type="button" className={styles.sheetDone} onClick={closeSheet}>
                  {search.results.length === 0 ? "No places match" : `Show ${search.results.length} ${search.results.length === 1 ? "place" : "places"}`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
