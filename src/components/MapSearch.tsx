import { useId, useMemo, useRef, useState } from "react";
import type { CityMapVenue } from "../types/city";
import { catColor, catIcon } from "./cityMapCategories";
import styles from "./MapSearch.module.css";

// Search on the city map (2026-11-19, direct request: "a search bar on the top right, which would search the
// location in that map"). It looks through the places already on the map, by name and by neighbourhood,
// in the browser: no lookup goes anywhere. A place flies to its pin and opens its card; a neighbourhood
// frames all of its places.

type Hit =
  | { kind: "place"; v: CityMapVenue }
  | { kind: "area"; area: string; venues: CityMapVenue[] };

const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const CAT_LABEL: Record<CityMapVenue["cat"], string> = { stay: "Stay", eat: "Table", party: "After dark", do: "Sight" };
const MAX = 8;

export default function MapSearch({ venues, onPlace, onArea }: {
  venues: CityMapVenue[];
  onPlace: (v: CityMapVenue) => void;
  onArea: (venues: CityMapVenue[]) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const hits = useMemo<Hit[]>(() => {
    const k = fold(q);
    if (k.length < 2) return [];
    const words = k.split(" ");
    const has = (s: string) => { const f = fold(s); return words.every((w) => f.includes(w)); };
    const starts = (s: string) => fold(s).startsWith(k) || fold(s).split(" ").some((w) => w.startsWith(words[0]));
    const places = venues.filter((v) => has(v.n)).sort((a, b) => Number(starts(b.n)) - Number(starts(a.n)) || a.n.length - b.n.length);
    // Neighbourhoods: an area written "Plaka / Monastiraki" or "Syntagma (Hotel Grande Bretagne)" counts
    // towards each neighbourhood it names, so "Plaka" is one entry with all of its places.
    const byArea = new Map<string, { label: string; vs: CityMapVenue[] }>();
    for (const v of venues) {
      for (const part of (v.a ?? "").replace(/\([^)]*\)/g, "").split(/\s*(?:\/|,|&|\band\b|·)\s*/)) {
        const label = part.trim();
        if (label.length < 3 || !has(label)) continue;
        const key = fold(label);
        const e = byArea.get(key) ?? { label, vs: [] };
        if (!e.vs.includes(v)) e.vs.push(v);
        byArea.set(key, e);
      }
    }
    const areas: Hit[] = [...byArea.values()].filter((e) => e.vs.length >= 2).sort((a, b) => b.vs.length - a.vs.length).slice(0, 3)
      .map((e) => ({ kind: "area", area: e.label, venues: e.vs }));
    // A place whose own name matches comes first; neighbourhoods first only when no name starts with it.
    const placeHits = places.slice(0, MAX).map((v): Hit => ({ kind: "place", v }));
    const namesLead = places.some((v) => starts(v.n));
    return (namesLead ? [...placeHits, ...areas] : [...areas, ...placeHits]).slice(0, MAX);
  }, [q, venues]);

  function choose(h: Hit) {
    setOpen(false);
    inputRef.current?.blur();
    if (h.kind === "place") { setQ(h.v.n); onPlace(h.v); }
    else { setQ(h.area); onArea(h.venues); }
  }

  const showList = open && fold(q).length >= 2;
  return (
    <div className={styles.box} data-map-ctl onKeyDown={(e) => e.stopPropagation()}>
      <svg className={styles.icon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
      </svg>
      <input
        ref={inputRef}
        className={`ta-map-q ${styles.input}`}
        type="search"
        value={q}
        placeholder="Search this map"
        aria-label="Search places on this map"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        maxLength={60}
        onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && hits[active]) { e.preventDefault(); choose(hits[active]); }
          else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
        }}
      />
      {q && (
        <button type="button" className={styles.clear} aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); inputRef.current?.focus(); }}>
          ×
        </button>
      )}
      {showList && (
        <ul className={styles.list} id={listId} role="listbox">
          {hits.length === 0 && <li className={styles.empty}>Nothing on this map by that name</li>}
          {hits.map((h, i) => {
            const key = h.kind === "place" ? `p-${h.v.n}-${h.v.lat}` : `a-${h.area}`;
            const Icon = h.kind === "place" ? catIcon(h.v.cat) : null;
            return (
              <li
                key={key}
                role="option"
                aria-selected={i === active}
                className={`${styles.item}${i === active ? ` ${styles.on}` : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(h)}
              >
                {h.kind === "place" ? (
                  <>
                    <span className={styles.dot} style={{ background: catColor(h.v.cat) }}>{Icon && <Icon size={12} strokeWidth={2} />}</span>
                    <span className={styles.text}>
                      <span className={styles.name}>{h.v.n}</span>
                      <span className={styles.sub}>{[CAT_LABEL[h.v.cat], h.v.a].filter(Boolean).join(" · ")}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`${styles.dot} ${styles.areaDot}`} aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
                    </span>
                    <span className={styles.text}>
                      <span className={styles.name}>{h.area}</span>
                      <span className={styles.sub}>Neighbourhood · {h.venues.length} {h.venues.length === 1 ? "place" : "places"}</span>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
