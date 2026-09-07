import { useEffect, useState } from "react";
import type { TripLeg } from "./tripState";

// Ported from js/shell.js's loadDec()/tripRange() — an indicative cost range
// for the cart, per-week luxury/comfort bands prorated by nights. Advisory
// only; the advisor prices it precisely (per copy in TripDrawer).
type CityDecision = Record<string, { budget_week_inr?: { comfort_lakh?: number; luxury_lakh?: number } }>;

let cache: CityDecision | null = null;
let inFlight: Promise<CityDecision> | null = null;

function loadDecision(): Promise<CityDecision> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = fetch("/data/city-decision.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        cache = d || {};
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return inFlight;
}

export type TripRange = { lo: number; hi: number; have: boolean };

export function useTripRange(legs: TripLeg[] | undefined): TripRange | null {
  const [dec, setDec] = useState<CityDecision | null>(cache);

  useEffect(() => {
    if (!dec) loadDecision().then(setDec);
  }, [dec]);

  if (!legs || !legs.length || !dec) return null;

  let lo = 0;
  let hi = 0;
  let have = legs.length > 0;
  for (const l of legs) {
    const d = dec[l.city];
    if (d?.budget_week_inr) {
      lo += (d.budget_week_inr.comfort_lakh || 0) * ((l.nights || 0) / 7);
      hi += (d.budget_week_inr.luxury_lakh || 0) * ((l.nights || 0) / 7);
    } else {
      have = false;
    }
  }
  return { lo, hi, have };
}
