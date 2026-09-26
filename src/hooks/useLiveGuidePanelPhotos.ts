import { useEffect, useRef, useState } from "react";
import { fetchPlaceLookup, resolvePlacePhotoUrl } from "../lib/placesLookup";
import { extractPlaceCandidate } from "../lib/extractPlaceName";
import type { CityGuidePanel } from "../types/city";

export type LivePanelPhoto =
  | { status: "loading" }
  | { status: "success"; photoUrl: string }
  | { status: "not-found" | "error" | "no-candidate" };

type ItemKey = string; // `${panelKey}-${tierIndex}-${itemIndex}`

// Mirrors useAgraLivePlanCoords/useAgraLiveEventLocations, but for guide
// panel items ("do"/"eat"/"stay"/"party") that shipped with photo: null.
// Only resolves items in the currently active panel tab — the caller must
// pass just that one panel (not the full guide.panels array) so switching
// tabs is what triggers new lookups, not mounting the page.
// Logged below so real per-tab-view call volume can be tracked while this
// is still gated to LIVE_PLACES_TEST_CITIES.
export function useLiveGuidePanelPhotos(
  enabled: boolean,
  citySlug: string | undefined,
  activePanel: CityGuidePanel | undefined,
): Record<ItemKey, LivePanelPhoto> {
  const [results, setResults] = useState<Record<ItemKey, LivePanelPhoto>>({});
  const attempted = useRef<Set<ItemKey>>(new Set());

  useEffect(() => {
    if (!enabled || !activePanel || !citySlug) return;

    let fired = 0;
    activePanel.tiers.forEach((tier, tierIndex) => {
      tier.items.forEach((item, itemIndex) => {
        if (item.photo) return; // static Pexels photo already present — skip live call
        const key = `${activePanel.key}-${tierIndex}-${itemIndex}`;
        if (attempted.current.has(key)) return;
        attempted.current.add(key);

        const candidate = extractPlaceCandidate(item.name);
        if (!candidate) {
          setResults((prev) => ({ ...prev, [key]: { status: "no-candidate" } }));
          return;
        }

        fired += 1;
        setResults((prev) => ({ ...prev, [key]: { status: "loading" } }));
        fetchPlaceLookup(candidate, item.area ?? citySlug).then((result) => {
          if (!result || !result.found || !result.photo_url) {
            setResults((prev) => ({ ...prev, [key]: { status: result ? "not-found" : "error" } }));
            return;
          }
          setResults((prev) => ({
            ...prev,
            [key]: { status: "success", photoUrl: resolvePlacePhotoUrl(result.photo_url!) },
          }));
        });
      });
    });

    if (fired > 0) {
      // eslint-disable-next-line no-console
      console.info(`[PLACES] guide-panel live lookups fired: ${fired} (city=${citySlug}, panel=${activePanel.key})`);
    }
  }, [enabled, citySlug, activePanel]);

  return results;
}
