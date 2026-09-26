import { useEffect, useRef, useState } from "react";
import { fetchPlaceLookup, resolvePlacePhotoUrl } from "../lib/placesLookup";
import { extractPlaceCandidate } from "../lib/extractPlaceName";
import type { CityData } from "../types/city";

export type LiveEventLocation =
  | { status: "loading" }
  | { status: "success"; photoUrl: string; lat: number; lon: number; placeName: string }
  | { status: "not-found" | "error" | "no-candidate" };

type EventKey = string; // event name, used as-is since events aren't otherwise indexed

// Same pattern as useAgraLivePlanCoords, applied to whatsOn.events[]
// instead of plan.days[].slots[]. A candidate venue name is extracted
// from `${event.name} ${event.note}` (not hardcoded per-event) — for a
// citywide event with no single venue ("Ram Barat", "Full-moon night
// viewings"), extractPlaceCandidate is expected to either find nothing
// confident or have the live Places search itself come back empty; both
// cases correctly stay unresolved rather than guessing a location.
export function useAgraLiveEventLocations(
  enabled: boolean,
  events: CityData["whatsOn"]["events"] | undefined,
): Record<EventKey, LiveEventLocation> {
  const [results, setResults] = useState<Record<EventKey, LiveEventLocation>>({});
  const attempted = useRef<Set<EventKey>>(new Set());

  useEffect(() => {
    if (!enabled || !events) return;

    // No cancel-on-cleanup flag — see the matching comment in
    // useAgraLivePlanCoords.ts for why that silently drops results under
    // StrictMode's dev-only double-invoke.
    events.forEach((event) => {
      if (event.location) return; // already real
      const key = event.name ?? "";
      if (!key || attempted.current.has(key)) return;
      attempted.current.add(key);

      const candidate = extractPlaceCandidate(`${event.name ?? ""} ${event.note ?? ""}`);
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
  }, [enabled, events]);

  return results;
}
