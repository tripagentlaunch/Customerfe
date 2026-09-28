import { useEffect, useRef, useState, useCallback } from "react";
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
//
// VIEWPORT-GATED (2026-09-28): firing all ~40+ items in a panel at once on
// tab-switch put too many simultaneous live Places calls in flight,
// pushing visible items' own load time out to 10-15s under that
// concurrent load. Each item now only fires its OWN lookup once it
// actually scrolls into view (via IntersectionObserver, 200px rootMargin
// so it starts a beat before the item is fully on screen) — so a typical
// first view (~6-8 items) resolves close to single-request speed, and
// the rest fire progressively as the visitor scrolls, never all at once.
export function useLiveGuidePanelPhotos(
  enabled: boolean,
  citySlug: string | undefined,
  activePanel: CityGuidePanel | undefined,
): {
  results: Record<ItemKey, LivePanelPhoto>;
  observeItem: (key: ItemKey, el: HTMLElement | null, itemName: string, itemArea: string | undefined) => void;
} {
  const [results, setResults] = useState<Record<ItemKey, LivePanelPhoto>>({});
  const attempted = useRef<Set<ItemKey>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elToKey = useRef<Map<Element, { key: ItemKey; name: string; area: string | undefined }>>(new Map());

  const fireLookup = useCallback(
    (key: ItemKey, itemName: string, itemArea: string | undefined) => {
      if (attempted.current.has(key)) return;
      attempted.current.add(key);

      const candidate = extractPlaceCandidate(itemName);
      if (!candidate) {
        setResults((prev) => ({ ...prev, [key]: { status: "no-candidate" } }));
        return;
      }

      setResults((prev) => ({ ...prev, [key]: { status: "loading" } }));
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
    [citySlug],
  );

  // Reset per-tab: new activePanel means a fresh observer, so switching
  // tabs and coming back re-observes correctly instead of reusing a stale
  // observer tied to the previous panel's items.
  useEffect(() => {
    if (!enabled || !activePanel || !citySlug) {
      observerRef.current?.disconnect();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const info = elToKey.current.get(entry.target);
          if (!info) continue;
          fireLookup(info.key, info.name, info.area);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [enabled, citySlug, activePanel, fireLookup]);

  const observeItem = useCallback(
    (key: ItemKey, el: HTMLElement | null, itemName: string, itemArea: string | undefined) => {
      if (!enabled) return;
      if (attempted.current.has(key)) return;
      if (!el) return;
      elToKey.current.set(el, { key, name: itemName, area: itemArea });
      observerRef.current?.observe(el);
    },
    [enabled],
  );

  return { results, observeItem };
}
