// Ported from js/shell.js's trip model (localStorage 'ta_trip') — the same
// shape the legacy site's Trip Builder and city "add to trip" buttons write
// to. This is the read/write model + change event only; entry points that
// call addToTrip() from city/browse pages are a separate follow-up.
import { useEffect, useState } from "react";

// What a visitor adds from the city pages ("Add to your trip"). Kept in this browser with the
// rest of the trip (no backend). A hotel is where they stay; everything else can be placed on a
// day and a part of the day (day / slot stay null until placed).
export type TripSlot = "morning" | "afternoon" | "evening";
export type TripItem = {
  ref: string; // stable id of the place: "<city>:<section>:<name>" (plan cards: "<city>:plan:d<day>-<n>")
  kind: "hotel" | "experience" | "event" | "plan";
  title: string;
  section?: string | null; // stay | do | eat | party | plan
  area?: string | null;
  photo?: string | null;
  day: number | null; // 1-based day within this city, null = not placed yet
  slot: TripSlot | null;
};
export type TripLeg = { id: string; city: string; nights: number; hotel: string | null; acts: string[]; label?: string; items?: TripItem[] };
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

// ---- items (hotels, things to do, plan cards) -------------------------------------------------

export const TRIP_SLOTS: TripSlot[] = ["morning", "afternoon", "evening"];

function ensureLeg(t: Trip, slug: string, label?: string): TripLeg {
  let leg = t.legs.find((l) => l && l.city === slug);
  if (!leg) {
    leg = { id: "s" + Date.now().toString(36) + t.legs.length, city: slug, nights: 3, hotel: null, acts: [], label, items: [] };
    t.legs.push(leg);
    if (!t.name && label) t.name = label;
  }
  if (label && !leg.label) leg.label = label;
  if (!Array.isArray(leg.items)) leg.items = [];
  return leg;
}

// Keeps the older hotel / acts fields in step with the items.
function syncLegacy(leg: TripLeg) {
  const items = leg.items ?? [];
  leg.hotel = items.find((i) => i.kind === "hotel")?.title ?? null;
  leg.acts = items.filter((i) => i.kind !== "hotel").map((i) => i.title);
}

function freshTrip(): Trip {
  const t = getTrip();
  return t && Array.isArray(t.legs) ? t : { name: "", legs: [], showCost: false };
}

export function addItem(slug: string, cityLabel: string | undefined, item: Omit<TripItem, "day" | "slot"> & { day?: number | null; slot?: TripSlot | null }) {
  const t = freshTrip();
  const leg = ensureLeg(t, slug, cityLabel);
  if (leg.items!.some((i) => i.ref === item.ref)) return;
  leg.items!.push({ ...item, day: item.day ?? null, slot: item.slot ?? null });
  syncLegacy(leg);
  persist(t);
}

export function removeItem(ref: string) {
  const t = freshTrip();
  for (const leg of t.legs) {
    if (!leg.items) continue;
    leg.items = leg.items.filter((i) => i.ref !== ref);
    syncLegacy(leg);
  }
  persist(t);
}

export function toggleItem(slug: string, cityLabel: string | undefined, item: Omit<TripItem, "day" | "slot"> & { day?: number | null; slot?: TripSlot | null }) {
  if (isInTrip(item.ref)) removeItem(item.ref);
  else addItem(slug, cityLabel, item);
}

export function isInTrip(ref: string): boolean {
  return !!getTrip()?.legs?.some((l) => l?.items?.some((i) => i.ref === ref));
}

export function placeItem(ref: string, day: number | null, slot: TripSlot | null) {
  const t = freshTrip();
  for (const leg of t.legs) {
    const it = leg.items?.find((i) => i.ref === ref);
    if (it) {
      it.day = day;
      it.slot = day ? slot ?? it.slot ?? "morning" : null;
    }
  }
  persist(t);
}

export function setNights(legId: string, nights: number) {
  const t = freshTrip();
  const leg = t.legs.find((l) => l.id === legId);
  if (!leg) return;
  leg.nights = Math.max(1, Math.min(365, Math.round(nights) || 1));
  // days that no longer exist send their items back to "not placed"
  for (const i of leg.items ?? []) if (i.day && i.day > leg.nights) { i.day = null; i.slot = null; }
  persist(t);
}

export function moveLeg(legId: string, dir: -1 | 1) {
  const t = freshTrip();
  const i = t.legs.findIndex((l) => l.id === legId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= t.legs.length) return;
  [t.legs[i], t.legs[j]] = [t.legs[j], t.legs[i]];
  persist(t);
}

// Moves a city to a new position in the trip (drag and drop on the builder).
export function moveLegTo(legId: string, index: number) {
  const t = freshTrip();
  const i = t.legs.findIndex((l) => l.id === legId);
  if (i < 0) return;
  const [leg] = t.legs.splice(i, 1);
  t.legs.splice(Math.max(0, Math.min(index, t.legs.length)), 0, leg);
  persist(t);
}

// Puts the cities in the given order (ids of the legs), e.g. after a drag.
export function setLegOrder(ids: string[]) {
  const t = freshTrip();
  const byId = new Map(t.legs.map((l) => [l.id, l]));
  const next = ids.map((id) => byId.get(id)).filter((l): l is TripLeg => !!l);
  if (next.length !== t.legs.length) return;
  t.legs = next;
  persist(t);
}

// The trip's length in days is the sum of its cities' days. Setting it splits the days equally
// across the cities (any left over go to the first ones, one each); at least one day per city.
export function setTripDays(total: number) {
  const t = freshTrip();
  const n = t.legs.length;
  if (!n) return;
  const days = Math.max(n, Math.min(365, Math.round(total) || n));
  const base = Math.floor(days / n);
  const extra = days % n;
  t.legs.forEach((l, i) => {
    l.nights = base + (i < extra ? 1 : 0);
    for (const it of l.items ?? []) if (it.day && it.day > l.nights) { it.day = null; it.slot = null; }
  });
  persist(t);
}

export function renameTrip(name: string) {
  const t = freshTrip();
  t.name = name;
  persist(t);
}

export function clearTrip() {
  persist({ name: "", legs: [], showCost: false });
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
// The whole trip (or null), re-read on every change; for the builder page and the add buttons.
export function useTrip(): Trip | null {
  const [trip, setTrip] = useState<Trip | null>(() => getTrip());
  useEffect(() => {
    const refresh = () => setTrip(getTrip());
    const onStorage = (e: StorageEvent) => e.key === KEY && refresh();
    window.addEventListener(TRIP_CHANGE_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TRIP_CHANGE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return trip;
}

export function useInTrip(ref: string | undefined): boolean {
  const trip = useTrip();
  return !!ref && !!trip?.legs?.some((l) => l?.items?.some((i) => i.ref === ref));
}

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
