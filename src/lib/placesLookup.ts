// Live Google Places (New) lookup, proxied through the backend's
// /api/places/lookup + /api/places/photo endpoints (see
// tripagent-site-main/backend/app/services/places_service.py).
//
// Deliberately NOT cached client-side, and never written back into
// cities.generated.json — Places API (New) content (photos, names) has no
// caching exception in Google's terms, so every render that needs this
// data makes a fresh live call. The backend's own cache is a few-minutes
// request-dedup only, not a substitute for this being live per pageview.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8002";

export interface PlaceLookupResult {
  found: boolean;
  place_name?: string;
  lat?: number;
  lon?: number;
  photo_url?: string;
  attribution?: string | null;
}

export async function fetchPlaceLookup(name: string, city: string): Promise<PlaceLookupResult | null> {
  try {
    const url = `${API_BASE}/api/places/lookup?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as PlaceLookupResult;
  } catch {
    return null;
  }
}

// The lookup's `photo_url` is already a same-origin-shaped path off our
// own backend (`/api/places/photo?ref=...`), not a fetchable frontend URL
// on its own — this resolves it against the API base the same way the
// lookup call itself was made.
export function resolvePlacePhotoUrl(photoUrl: string): string {
  return `${API_BASE}${photoUrl}`;
}

// Combined lookup+photo in one request (backend fetches the photo bytes
// server-side and returns them inline as a data: URL) — cuts the
// frontend's round-trip count from 2 sequential requests to 1. Prefer
// this over fetchPlaceLookup + resolvePlacePhotoUrl for any NEW caller;
// the two-step form remains for existing callers already wired to it.
export interface PlaceLookupWithPhotoResult {
  found: boolean;
  place_name?: string;
  lat?: number;
  lon?: number;
  photo_url?: string; // a data: URL here, not a /api/places/photo path
  attribution?: string | null;
}

export async function fetchPlaceLookupWithPhoto(name: string, city: string): Promise<PlaceLookupWithPhotoResult | null> {
  try {
    const url = `${API_BASE}/api/places/lookup-with-photo?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as PlaceLookupWithPhotoResult;
  } catch {
    return null;
  }
}
