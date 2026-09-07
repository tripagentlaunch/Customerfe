// Ported from js/shell.js's trip model (localStorage 'ta_trip') — the same
// shape the legacy site's Trip Builder and city "add to trip" buttons write
// to. This is the read/write model + change event only; entry points that
// call addToTrip() from city/browse pages are a separate follow-up.
import { useEffect, useState } from "react";

export type TripLeg = { id: string; city: string; nights: number; hotel: string | null; acts: string[] };
export type Trip = { name: string; legs: TripLeg[]; showCost: boolean };
export type TripSummary = { name: string; legs: TripLeg[]; nights: number; count: number };

const KEY = "ta_trip";
export const TRIP_CHANGE_EVENT = "ta-trip-change";

export function getTrip(): Trip | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function getTripSummary(): TripSummary | null {
  const t = getTrip();
  if (!t || !Array.isArray(t.legs) || !t.legs.length) return null;
  const nights = t.legs.reduce((s, l) => s + (l.nights || 0), 0);
  return { name: t.name || "", legs: t.legs, nights, count: t.legs.length };
}

function persist(t: Trip) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(TRIP_CHANGE_EVENT));
}

export function addToTrip(slug: string, name?: string, nights?: number): boolean {
  if (!slug) return false;
  const t: Trip = getTrip() ?? { name: "", legs: [], showCost: false };
  if (!Array.isArray(t.legs)) t.legs = [];
  if (t.legs.some((l) => l && l.city === slug)) return false;
  t.legs.push({ id: "s" + Date.now().toString(36) + t.legs.length, city: slug, nights: nights || 3, hotel: null, acts: [] });
  if (!t.name && name) t.name = name;
  persist(t);
  return true;
}

export function removeFromTrip(slug: string) {
  const t = getTrip();
  if (!t || !Array.isArray(t.legs)) return;
  t.legs = t.legs.filter((l) => l.city !== slug);
  persist(t);
}

export function titleCase(s: string): string {
  return String(s || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Live-updating trip summary — mirrors shell.js's paintTripCount(), which
// re-reads on the custom change event, cross-tab storage events, and (for
// signed-in members) an 'ta-year-change' event.
export function useTripSummary(): TripSummary | null {
  const [summary, setSummary] = useState<TripSummary | null>(() => getTripSummary());

  useEffect(() => {
    function refresh() {
      setSummary(getTripSummary());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) refresh();
    }
    window.addEventListener(TRIP_CHANGE_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TRIP_CHANGE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return summary;
}
