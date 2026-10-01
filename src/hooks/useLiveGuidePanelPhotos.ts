import { useCallback, useRef, useState } from "react";
import { fetchPlaceLookup, resolvePlacePhotoUrl } from "../lib/placesLookup";
import { extractPlaceCandidate } from "../lib/extractPlaceName";

export type LivePanelPhoto =
  | { status: "loading" }
  | { status: "success"; photoUrl: string }
  | { status: "not-found" | "error" | "no-candidate" };

type ItemKey = string; // `${panelKey}-${tierIndex}-${itemIndex}`

// SIMPLIFIED 2026-09-28: originally viewport-gated via IntersectionObserver,
// because panels could show up to 44 items at once. Since CityPage.tsx now
// paginates to 6 visible items per page, that gating became redundant AND
// buggy — every item's <li> is still mounted (just hidden via a "cg-hide"
// class), so the observer's target elements existed the whole time; only
// CSS display changed, which several browsers don't reliably re-fire an
// IntersectionObserver for. With only 6 items ever actually shown at once,
// the caller (GuidePanel) already knows exactly which items are on the
// current page — so this hook now just exposes a plain fireLookup the
// caller invokes directly for that page's own items, no observer at all.
export function useLiveGuidePanelPhotos(
  enabled: boolean,
  citySlug: string | undefined,
): {
  results: Record<ItemKey, LivePanelPhoto>;
  fireLookup: (key: ItemKey, itemName: string, itemArea: string | undefined) => void;
} {
  const [results, setResults] = useState<Record<ItemKey, LivePanelPhoto>>({});
  const attempted = useRef<Set<ItemKey>>(new Set());

  const fireLookup = useCallback(
    (key: ItemKey, itemName: string, itemArea: string | undefined) => {
      if (!enabled || !citySlug) return;
      if (attempted.current.has(key)) return;
      attempted.current.add(key);

      const candidate = extractPlaceCandidate(itemName);
      if (!candidate) {
        setResults((prev) => ({ ...prev, [key]: { status: "no-candidate" } }));
        return;
      }

      setResults((prev) => ({ ...prev, [key]: { status: "loading" } }));
      // REVERTED 2026-09-30 — fetchPlaceLookupWithPhoto's backend route
      // (/api/places/lookup-with-photo) does not actually exist on this
      // repo's prod branch (confirmed: grep against
      // app/routers/places_router.py comes back empty), even though it
      // was seen in an earlier session on a different branch state.
      // Every request 404'd, breaking image loading entirely. Reverted to
      // the real, working two-step endpoint this branch actually has.
      fetchPlaceLookup(candidate, itemArea ?? citySlug).then((result) => {
        if (!result || !result.found || !result.photo_url) {
          setResults((prev) => ({ ...prev, [key]: { status: result ? "not-found" : "error" } }));
          return;
        }
        setResults((prev) => ({
          ...prev,
          [key]: { status: "success", photoUrl: resolvePlacePhotoUrl(result.photo_url!) },
        }));
      });
    },
    [enabled, citySlug],
  );

  return { results, fireLookup };
}
