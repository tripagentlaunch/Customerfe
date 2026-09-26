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
