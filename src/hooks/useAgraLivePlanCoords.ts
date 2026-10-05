import { useEffect, useRef, useState } from "react";
import { fetchPlaceLookup, resolvePlacePhotoUrl } from "../lib/placesLookup";
import { extractPlaceCandidate } from "../lib/extractPlaceName";
import type { CityDay } from "../types/city";

export type LiveSlotCoord =
  | { status: "loading" }
  | { status: "success"; photoUrl: string; lat: number; lon: number; placeName: string }
  | { status: "not-found" | "error" | "no-candidate" };

type SlotKey = string; // `${dayIndex}-${slotIndex}`

// Live-fetches Places (New) lookups for every slot in the ACTIVE day that
// has no coordinates on file, extracting a candidate name from each
// slot's own text (extractPlaceName.ts) rather than one hardcoded query —
// so multiple slots on the same day can resolve real coordinates, letting
// PlanRouteMap's "needs >=2 stops" condition actually be satisfied once
// enough of them come back. Scoped to Agra only via `enabled`; results
// persist across day switches (a ref of already-attempted keys prevents
// re-fetching a slot that already resolved or already came back empty).
export function useAgraLivePlanCoords(
  enabled: boolean,
  days: CityDay[] | undefined,
  dayIndex: number | undefined,
): Record<SlotKey, LiveSlotCoord> {
  const [results, setResults] = useState<Record<SlotKey, LiveSlotCoord>>({});
  const attempted = useRef<Set<SlotKey>>(new Set());

  useEffect(() => {
    if (!enabled || !days || dayIndex == null) return;
    const day = days[dayIndex];
    if (!day) return;

    // No cancel-on-cleanup flag here, deliberately: StrictMode's dev-only
    // mount->cleanup->mount double-invoke marks every slot's key in
    // `attempted` during the FIRST invocation (synchronously, before any
    // fetch resolves), so the SECOND invocation issues no new fetches —
    // if the first invocation's own cleanup also cancelled its in-flight
    // promises, every result would be silently discarded and no slot
    // would ever reach "success" for that mount. These fetches are
    // idempotent and cheap, and setState after unmount is safe in React
    // 18, so results are always applied once they arrive; `attempted`
    // alone is what prevents duplicate network calls.
    (day.slots ?? []).forEach((slot, slotIndex) => {
      // Skip whenever a static photo already exists — free, instant, no
      // API call — even if lat/lon are still null. Only a genuine gap
      // (no photo on file at all) triggers a live Places lookup; this is
      // deliberately NOT gated on lat/lon alone, which would re-fetch a
      // slot Pexels (or a future backfill) already solved for free.
      if (slot.photo) return;
      const key = `${dayIndex}-${slotIndex}`;
      if (attempted.current.has(key)) return;
      attempted.current.add(key);

      const candidate = extractPlaceCandidate(slot.text);
      if (!candidate) {
        setResults((prev) => ({ ...prev, [key]: { status: "no-candidate" } }));
        return;
      }

      setResults((prev) => ({ ...prev, [key]: { status: "loading" } }));
      fetchPlaceLookup(candidate, "Agra").then((result) => {
        if (!result || !result.found || !result.photo_url || result.lat == null || result.lon == null) {
          setResults((prev) => ({ ...prev, [key]: { status: result ? "not-found" : "error" } }));
          return;
        }
        setResults((prev) => ({
          ...prev,
          [key]: {
            status: "success",
            photoUrl: resolvePlacePhotoUrl(result.photo_url!),
            lat: result.lat!,
            lon: result.lon!,
            placeName: result.place_name ?? candidate,
          },
        }));
      });
    });
  }, [enabled, days, dayIndex]);

  return results;
}
