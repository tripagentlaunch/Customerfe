import { useEffect, useRef, useState } from "react";
import { fetchPlaceLookup, resolvePlacePhotoUrl } from "../lib/placesLookup";
import { extractPlaceCandidate } from "../lib/extractPlaceName";
import type { CityDay } from "../types/city";

export type LiveSlotCoord =
  | { status: "loading" }
  | { status: "success"; photoUrl: string; lat: number; lon: number; placeName: string }
  | { status: "not-found" | "error" | "no-candidate" };

type SlotKey = string; // `${dayIndex}-${slotIndex}`

// Live-fetches a Places (New) lookup for each TARGET slot (one highlight
// per plan day — see lib/planHighlights.ts) that is missing a photo or
// coordinates, extracting a candidate name from the slot's own text
// (extractPlaceName.ts). Scoped to the test cities via `enabled`; results
// persist (a ref of already-attempted keys prevents re-fetching a slot that
// already resolved or already came back empty).
export interface PlanTarget {
  dayIndex: number;
  slotIndex: number;
}

export function useAgraLivePlanCoords(
  enabled: boolean,
  days: CityDay[] | undefined,
  targets: PlanTarget[],
): Record<SlotKey, LiveSlotCoord> {
  const [results, setResults] = useState<Record<SlotKey, LiveSlotCoord>>({});
  const attempted = useRef<Set<SlotKey>>(new Set());

  useEffect(() => {
    if (!enabled || !days) return;

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
    targets.forEach(({ dayIndex, slotIndex }) => {
      const slot = days[dayIndex]?.slots?.[slotIndex];
      if (!slot) return;
      // Skip when the slot already has BOTH a static photo and coordinates
      // — free, instant, no API call. A missing photo or missing coords is
      // a genuine gap worth one live lookup.
      if (slot.photo && typeof slot.lat === "number" && typeof slot.lon === "number") return;
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
        if (!result || !result.found || result.lat == null || result.lon == null) {
          setResults((prev) => ({ ...prev, [key]: { status: result ? "not-found" : "error" } }));
          return;
        }
        setResults((prev) => ({
          ...prev,
          [key]: {
            status: "success",
            photoUrl: result.photo_url ? resolvePlacePhotoUrl(result.photo_url) : "",
            lat: result.lat!,
            lon: result.lon!,
            placeName: result.place_name ?? candidate,
          },
        }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, days, targets.map((t) => `${t.dayIndex}-${t.slotIndex}`).join(",")]);

  return results;
}
