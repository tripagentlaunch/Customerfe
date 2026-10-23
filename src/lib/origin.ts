import { useEffect, useState } from "react";

// Where the visitor flies from (2026-10-09, direct request). City heroes
// said "From India · 1h nonstop", which was really Delhi's time and made
// no sense for Indian cities (Amritsar is 1h from Delhi, 3h with a stop
// from Bengaluru). Flight times exist per origin in city-decision.json;
// the visitor picks theirs (Bengaluru by default) and the city hero and the
// destination cards both use it. Saved in ta_profile.origin, the key the
// destination search already read.

export const ORIGINS: Record<string, string> = { blr: "Bengaluru", del: "Delhi", bom: "Mumbai" };
export const DEFAULT_ORIGIN = "blr";
const EVENT = "ta-origin-change";

type Profile = { origin?: string } & Record<string, unknown>;

function readProfile(): Profile {
  try {
    const raw = localStorage.getItem("ta_profile");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readOrigin(): string {
  const o = readProfile().origin;
  return o && ORIGINS[o] ? o : DEFAULT_ORIGIN;
}

export function saveOrigin(code: string): void {
  if (!ORIGINS[code]) return;
  try {
    localStorage.setItem("ta_profile", JSON.stringify({ ...readProfile(), origin: code }));
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: code }));
}

// Auto-fill from the visitor's location (2026-10-23, direct request): the
// first time they open a city page with no origin of their own saved, ask the
// browser where they are and pick the nearest origin in ORIGINS. A visitor
// who denies, or whose browser can't say, keeps the default; one who picks a
// city by hand always wins (also if they pick before the answer arrives).
const ORIGIN_COORDS: Record<string, [number, number]> = {
  blr: [12.9716, 77.5946],
  del: [28.6139, 77.209],
  bom: [19.076, 72.8777],
};
// Beyond this the "nearest" origin isn't near at all (someone in London is
// not flying from Mumbai): keep the default instead.
const MAX_ORIGIN_KM = 1500;
const ASKED_KEY = "ta_origin_geo_asked";

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function nearestOrigin(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestKm = Infinity;
  for (const [code, [oLat, oLng]] of Object.entries(ORIGIN_COORDS)) {
    if (!ORIGINS[code]) continue;
    const km = distanceKm(lat, lng, oLat, oLng);
    if (km < bestKm) {
      best = code;
      bestKm = km;
    }
  }
  return bestKm <= MAX_ORIGIN_KM ? best : null;
}

// Asks at most once per browser session, and never once an origin is saved.
export function detectOrigin(): void {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  if (readProfile().origin) return;
  try {
    if (sessionStorage.getItem(ASKED_KEY)) return;
    sessionStorage.setItem(ASKED_KEY, "1");
  } catch {
    // storage unavailable: ask on this page only
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (readProfile().origin) return; // they chose one while we waited
      const code = nearestOrigin(pos.coords.latitude, pos.coords.longitude);
      if (code) saveOrigin(code);
    },
    () => {
      // denied or unavailable: the default stays
    },
    { timeout: 10000, maximumAge: 3600000 }
  );
}

// [origin, setOrigin] — every component using it updates together, and
// across tabs via the storage event.
export function useOrigin(): [string, (code: string) => void] {
  const [origin, setOrigin] = useState(readOrigin);
  useEffect(() => {
    const onChange = (e: Event) => setOrigin((e as CustomEvent).detail || readOrigin());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ta_profile") setOrigin(readOrigin());
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return [
    origin,
    (code: string) => {
      setOrigin(code);
      saveOrigin(code);
    },
  ];
}

export type FlightFrom = { hours: number | null; direct?: boolean };
let decisions: Promise<Record<string, { flight_from?: Record<string, FlightFrom> }>> | null = null;

// One fetch of city-decision.json per page load, shared.
export function flightTimes(slug: string): Promise<Record<string, FlightFrom> | null> {
  if (!decisions) {
    decisions = fetch("/data/city-decision.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => {
        decisions = null;
        return {};
      });
  }
  return decisions.then((d) => d?.[slug]?.flight_from ?? null);
}

// "3h" / "1.5h", or null when unknown; 0 means the visitor is already there.
export function hoursLabel(hours: number | null | undefined): string | null {
  if (hours == null) return null;
  const r = Math.round(hours * 10) / 10;
  return `${r % 1 === 0 ? r : r.toFixed(1)}h`;
}
