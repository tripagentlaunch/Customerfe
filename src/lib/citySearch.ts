// Ported from js/citysearch.js — the discovery engine for cities.html.
// Instant search + live filtering over 110 cities (When/Who/Mood/Budget/
// flight-distance), same matching/scoring/chip logic, reused verbatim
// where the shape allows (React owns state instead of DOM mutation).
import { useEffect, useMemo, useState } from "react";
export type FlightFrom = { hours: number | null; direct?: boolean };
export type CityDecision = {
  budget_week_inr?: { comfort_lakh?: number; luxury_lakh?: number };
  flight_from?: Record<string, FlightFrom>;
  visa?: { requirement?: string };
  best_months?: number[];
  vibe_tags?: string[];
  who_for?: string[];
  interest_tags?: string[];
};
type CitiesJson = Record<string, { name: string; country: string; region: string }>;
type CityDecisionJson = Record<string, CityDecision>;
type CityImagesJson = Record<string, { band?: { src?: string } }>;

export type CityRecord = {
  slug: string;
  name: string;
  country: string;
  region: string;
  d: CityDecision;
  band: string | null;
};

export const WHO = [
  { v: "couples", label: "Couples", tags: ["couples", "honeymoon"] },
  { v: "family-kids", label: "Family", tags: ["family-kids"] },
  { v: "friends", label: "Friends", tags: ["friends"] },
  { v: "solo", label: "Solo", tags: ["solo"] },
  { v: "multigen", label: "Multi-gen", tags: ["multigen"] },
] as const;

export const MOOD = [
  { v: "beach", label: "Beach", tags: ["beach"] },
  { v: "city", label: "City", tags: ["city"] },
  { v: "culture", label: "Culture", tags: ["culture", "history", "art"] },
  { v: "nature", label: "Nature", tags: ["nature", "wildlife", "safari"] },
  { v: "wellness", label: "Wellness", tags: ["wellness", "spa", "spiritual"] },
  { v: "nightlife", label: "Nightlife", tags: ["nightlife"] },
  { v: "food", label: "Food", tags: ["food", "wine"] },
  { v: "snow", label: "Snow", tags: ["snow", "ski"] },
  { v: "romance", label: "Romance", tags: ["romance"] },
  { v: "adventure", label: "Adventure", tags: ["adventure", "trek", "dive", "surf", "sailing"] },
] as const;

export const BUDGET = [
  { v: "", label: "Any budget" },
  { v: "a", label: "Under ₹3L / week", max: 3 },
  { v: "b", label: "₹3L – ₹5L / week", min: 3, max: 5 },
  { v: "c", label: "₹5L+ / week", min: 5 },
] as const;

export const FLIGHT = [
  { v: "", label: "Any distance" },
  { v: "4", label: "Within 4 hours", max: 4 },
  { v: "8", label: "Within 8 hours", max: 8 },
] as const;

export const ORIGINS: Record<string, string> = { del: "Delhi", bom: "Mumbai", blr: "Bengaluru" };

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type SearchState = {
  q: string;
  month: string;
  who: string;
  budget: string;
  flight: string;
  mood: Record<string, boolean>;
};

export const EMPTY_STATE: SearchState = { q: "", month: "", who: "", budget: "", flight: "", mood: {} };

function norm(s: string | null | undefined): string {
  const lower = String(s || "").toLowerCase();
  return lower.normalize ? lower.normalize("NFD").replace(/[̀-ͯ]/g, "") : lower;
}

function hasAny(arr: string[] | undefined, wanted: readonly string[]): boolean {
  if (!arr) return false;
  return wanted.some((w) => arr.indexOf(w) !== -1);
}

export function isFiltered(state: SearchState): boolean {
  if (state.q || state.month || state.who || state.budget || state.flight) return true;
  return Object.values(state.mood).some(Boolean);
}

export function matches(c: CityRecord, state: SearchState, origin: string): boolean {
  if (state.q) {
    const q = norm(state.q);
    if (norm(c.name).indexOf(q) === -1 && norm(c.country).indexOf(q) === -1) return false;
  }
  if (state.who) {
    const w = WHO.find((x) => x.v === state.who);
    if (w && !hasAny(c.d.who_for, w.tags)) return false;
  }
  for (const mv of Object.keys(state.mood)) {
    if (!state.mood[mv]) continue;
    const m = MOOD.find((x) => x.v === mv);
    if (!m) continue;
    const pool = (c.d.vibe_tags || []).concat(c.d.interest_tags || []);
    if (!hasAny(pool, m.tags)) return false;
  }
  if (state.budget) {
    const b = BUDGET.find((x) => x.v === state.budget);
    const cost = c.d.budget_week_inr ? c.d.budget_week_inr.comfort_lakh : null;
    if (b && cost != null) {
      if ("min" in b && b.min != null && cost < b.min) return false;
      if ("max" in b && b.max != null && cost > b.max) return false;
    }
  }
  if (state.flight) {
    const f = FLIGHT.find((x) => x.v === state.flight);
    const fr = c.d.flight_from && c.d.flight_from[origin];
    if (f && "max" in f && f.max != null) {
      if (!fr || fr.hours == null || fr.hours > f.max) return false;
    }
  }
  return true;
}

function inWindow(c: CityRecord, state: SearchState): boolean {
  if (!state.month) return false;
  return (c.d.best_months || []).indexOf(+state.month) !== -1;
}

export function score(c: CityRecord, state: SearchState): number {
  let s = 0;
  if (state.month) s += inWindow(c, state) ? 0 : 1000;
  s += c.name.toLowerCase().charCodeAt(0) / 100;
  return s;
}

export function flightChip(c: CityRecord, origin: string): string | null {
  const fr = c.d.flight_from && c.d.flight_from[origin];
  if (!fr || fr.hours == null) return null;
  if (fr.hours === 0) return "At home";
  const h = fr.hours;
  const rounded = Math.round(h * 10) / 10;
  const label = (rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1)) + "h from " + ORIGINS[origin];
  return "~" + label;
}

export function monthsChip(c: CityRecord): string | null {
  const bm = (c.d.best_months || []).slice().sort((a, b) => a - b);
  if (!bm.length) return null;
  const set: Record<number, boolean> = {};
  bm.forEach((m) => (set[m] = true));
  let best: number[] | null = null;
  for (let s = 1; s <= 12; s++) {
    if (!set[s]) continue;
    if (set[((s + 10) % 12) + 1]) continue;
    const run = [s];
    let cur = s;
    while (set[(cur % 12) + 1]) {
      cur = (cur % 12) + 1;
      run.push(cur);
      if (run.length > 12) break;
    }
    if (!best || run.length > best.length) best = run;
  }
  if (!best) best = bm;
  if (best.length >= 11) return "Year-round";
  const a = best[0];
  const b = best[best.length - 1];
  return "Best " + MONTHS_SHORT[a - 1] + "–" + MONTHS_SHORT[b - 1];
}

export function visaChip(c: CityRecord): string | null {
  const v = c.d.visa;
  if (!v) return null;
  const r = v.requirement;
  if (r === "visa-free" || r === "none") return "Visa-free";
  if (r === "voa" || r === "visa-on-arrival") return "Visa on arrival";
  if (r === "e-visa") return "e-Visa";
  return null;
}

export function cardChips(c: CityRecord, origin: string): string[] {
  const chips: string[] = [];
  const fc = flightChip(c, origin);
  if (fc) chips.push(fc);
  const mc = monthsChip(c);
  if (mc) chips.push(mc);
  const vc = visaChip(c);
  if (vc && chips.length < 2) chips.push(vc);
  return chips.slice(0, 2);
}

function readOrigin(): string {
  try {
    const raw = localStorage.getItem("ta_profile");
    const p = raw ? JSON.parse(raw) : null;
    if (p && p.origin && ORIGINS[p.origin]) return p.origin;
  } catch {
    // ignore
  }
  return "del";
}

export async function loadCityList(): Promise<CityRecord[]> {
  const [cities, dec, img] = await Promise.all([
    fetch("/data/cities.json").then((r) => (r.ok ? (r.json() as Promise<CitiesJson>) : Promise.reject())),
    fetch("/data/city-decision.json").then((r) => (r.ok ? (r.json() as Promise<CityDecisionJson>) : Promise.reject())),
    fetch("/data/city-images.json")
      .then((r) => (r.ok ? (r.json() as Promise<CityImagesJson>) : ({} as CityImagesJson)))
      .catch(() => ({}) as CityImagesJson),
  ]);
  return Object.keys(cities).map((slug) => {
    const base = cities[slug] || { name: slug, country: "", region: "" };
    return {
      slug,
      name: base.name || slug,
      country: base.country || "",
      region: base.region || "",
      d: dec[slug] || {},
      band: img[slug]?.band?.src || null,
    };
  });
}

export { readOrigin };

export type CitySearch = {
  status: "loading" | "ready" | "error";
  origin: string;
  state: SearchState;
  results: CityRecord[];
  filtered: boolean;
  setQuery: (q: string) => void;
  setField: (k: "month" | "who" | "budget" | "flight", v: string) => void;
  toggleMood: (v: string) => void;
  clearAll: () => void;
};

// React port of citysearch.js's boot()/wire()/render() — data loads once,
// filtering/sorting is a memo instead of DOM re-render.
export function useCitySearch(): CitySearch {
  const [status, setStatus] = useState<CitySearch["status"]>("loading");
  const [list, setList] = useState<CityRecord[]>([]);
  const [origin, setOrigin] = useState("del");
  const [state, setState] = useState<SearchState>(EMPTY_STATE);

  useEffect(() => {
    let cancelled = false;
    setOrigin(readOrigin());
    loadCityList()
      .then((l) => {
        if (cancelled) return;
        setList(l);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    return list
      .filter((c) => matches(c, state, origin))
      .sort((a, b) => {
        const d = score(a, state) - score(b, state);
        return d !== 0 ? d : a.name.localeCompare(b.name);
      });
  }, [list, state, origin]);

  return {
    status,
    origin,
    state,
    results,
    filtered: isFiltered(state),
    setQuery: (q) => setState((s) => ({ ...s, q })),
    setField: (k, v) => setState((s) => ({ ...s, [k]: v })),
    toggleMood: (v) => setState((s) => ({ ...s, mood: { ...s.mood, [v]: !s.mood[v] } })),
    clearAll: () => setState(EMPTY_STATE),
  };
}
