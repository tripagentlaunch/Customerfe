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
