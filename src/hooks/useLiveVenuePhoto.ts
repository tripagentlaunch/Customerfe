import { useEffect, useState } from "react";
import { fetchPlaceLookupWithPhoto } from "../lib/placesLookup";
import type { CityMapVenue } from "../types/city";

export type LiveVenuePhoto =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; photoUrl: string }
  | { status: "not-found" | "error" };

export function useLiveVenuePhoto(
  enabled: boolean,
  citySlug: string | undefined,
  venue: CityMapVenue | null,
): LiveVenuePhoto {
  const [result, setResult] = useState<LiveVenuePhoto>({ status: "idle" });

  useEffect(() => {
    if (!enabled || !venue || !citySlug) {
      setResult({ status: "idle" });
      return;
    }
    if (venue.photos && venue.photos.length > 0) {
      setResult({ status: "idle" });
      return;
    }

    let cancelled = false;
    setResult({ status: "loading" });
    fetchPlaceLookupWithPhoto(venue.n, venue.a || citySlug).then((res) => {
      if (cancelled) return;
      if (!res || !res.found || !res.photo_url) {
        setResult({ status: res ? "not-found" : "error" });
        return;
      }
      setResult({ status: "success", photoUrl: res.photo_url });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, citySlug, venue?.n, venue?.lat, venue?.lon]);

  return result;
}
