import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BUDGET, FLIGHT, MONTHS, MOOD, ORIGINS, WHO, type CitySearch } from "../lib/citySearch";
import { useIsMobile } from "../hooks/useIsMobile";
import styles from "./CityFilters.module.css";
import HomeSearch from "./HomeSearch";

type Opt = { v: string; label: string };

// Styled dropdown (replaces the browser's native <select> menu, 2026-11-13).
export function Dropdown({ id, value, options, onChange }: { id: string; value: string; options: readonly Opt[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const selIdx = Math.max(0, options.findIndex((o) => o.v === value));
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const toggle = () => {
    setActive(selIdx);
    setOpen((o) => !o);
  };
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return toggle();
      setActive((a) => Math.min(options.length - 1, Math.max(0, a + (e.key === "ArrowDown" ? 1 : -1))));
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      pick(options[active].v);
    }
  };
  return (
    <div className={styles.csDd} ref={ref} onKeyDown={onKey}>
      <button type="button" id={id} className={styles.csDdBtn} aria-haspopup="listbox" aria-expanded={open} onClick={toggle}>
        <span>{options[selIdx]?.label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={open ? styles.csDdUp : undefined}>
          <path d="M2 4.5l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <ul className={styles.csMenu} role="listbox" aria-labelledby={id}>
          {options.map((o, i) => (
            <li key={o.v || "any"} role="option" aria-selected={o.v === value} className={`${styles.csOpt}${o.v === value ? ` ${styles.csOptOn}` : ""}${i === active ? ` ${styles.csOptActive}` : ""}`} onMouseEnter={() => setActive(i)} onClick={() => pick(o.v)}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Phone sheet: single-select chips, wrapping onto as many rows as needed.
function Chips({ value, options, onChange, label }: { value: string; options: readonly Opt[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className={styles.csChips} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v || "any"} type="button" role="radio" aria-checked={o.v === value} className={`${styles.csChip}${o.v === value ? ` ${styles.csChipOn}` : ""}`} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Search box + When/Who/Budget/Distance selects + Mood chips for the city
// search (useCitySearch). Lives on the Destinations page; whatever list sits
// beneath it filters itself from the same `search` object.
export default function CityFilters({ search, showMood = true, showWho = true }: { search: CitySearch; showMood?: boolean; showWho?: boolean }) {
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
  const activeFilters = selectedMoods + [search.state.month, showWho ? search.state.who : "", search.state.budget, search.state.flight].filter(Boolean).length;

  const fields = (
    <>
      <div className={styles.csField}>
        <label htmlFor="cs-month">When</label>
        {isMobile ? <Chips label="cs-month" value={search.state.month} options={[{ v: "", label: "Any month" }, ...MONTHS.map((m, i) => ({ v: String(i + 1), label: m }))]} onChange={(v) => search.setField("month", v)} /> : <Dropdown id="cs-month" value={search.state.month} options={[{ v: "", label: "Any month" }, ...MONTHS.map((m, i) => ({ v: String(i + 1), label: m }))]} onChange={(v) => search.setField("month", v)} />}
      </div>
      {showWho && (
      <div className={styles.csField}>
        <label htmlFor="cs-who">Who</label>
        {isMobile ? <Chips label="cs-who" value={search.state.who} options={[{ v: "", label: "Anyone" }, ...WHO]} onChange={(v) => search.setField("who", v)} /> : <Dropdown id="cs-who" value={search.state.who} options={[{ v: "", label: "Anyone" }, ...WHO]} onChange={(v) => search.setField("who", v)} />}
      </div>
      )}
      <div className={styles.csField}>
        <label htmlFor="cs-budget">Budget</label>
        {isMobile ? <Chips label="cs-budget" value={search.state.budget} options={BUDGET} onChange={(v) => search.setField("budget", v)} /> : <Dropdown id="cs-budget" value={search.state.budget} options={BUDGET} onChange={(v) => search.setField("budget", v)} />}
      </div>
      <div className={styles.csField}>
        <label htmlFor="cs-flight">From {originLabel}</label>
        {isMobile ? <Chips label="cs-flight" value={search.state.flight} options={FLIGHT} onChange={(v) => search.setField("flight", v)} /> : <Dropdown id="cs-flight" value={search.state.flight} options={FLIGHT} onChange={(v) => search.setField("flight", v)} />}
      </div>
    </>
  );
  const meta = (
    <div className={styles.csMeta}>
      {/* Count ("110 places") removed 2026-11-13, direct request. */}
      {search.filtered && (
        <button type="button" className={styles.csClear} onClick={search.clearAll}>
          Clear
        </button>
      )}
    </div>
  );

  return (
    <div>
      {!isMobile && (
        <>
      {/* Was the plain "Search a city or country…" input (.csSearchwrap); now the homepage's bar, filtering this page's list in place. */}
      <div className={styles.csSearchWhite}>
        <HomeSearch
          labelHtml="Search a city or a country"
          value={search.state.q}
          onValueChange={search.setQuery}
          showResults={false}
        />
      </div>

        </>
      )}
      {isMobile ? (
        <>
          <div className={styles.csTopRow}>
            <div className={`${styles.csSearchWhite} ${styles.csTopSearch}`}>
              <HomeSearch labelHtml="Search a city or a country" value={search.state.q} onValueChange={search.setQuery} showResults={false} />
            </div>
            <button type="button" className={styles.csFilterBtn} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Filters">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="8" cy="17" r="2" />
              </svg>
              Filters
              {activeFilters > 0 && <span className={styles.csBadge}>{activeFilters}</span>}
            </button>
          </div>
          {search.filtered && (
            <div className={styles.csBarM}>
              <button type="button" className={styles.csClear} onClick={search.clearAll}>
                Clear
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.csBar}>
          {fields}
          {meta}
        </div>
      )}

      {showMood && !isMobile && (
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
      )}

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
              <div className={styles.sheetBody}>
                {fields}
                {showMood && (
                  <div className={styles.csField}>
                    <label>Mood</label>
                    <div className={styles.csChips} role="group" aria-label="Mood">
                      {MOOD.map((m) => (
                        <button key={m.v} type="button" aria-pressed={!!search.state.mood[m.v]} className={`${styles.csChip}${search.state.mood[m.v] ? ` ${styles.csChipOn}` : ""}`} onClick={() => search.toggleMood(m.v)}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
