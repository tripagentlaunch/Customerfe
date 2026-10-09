// Fetches the backend's /config endpoint (non-secret runtime values:
// WhatsApp number, coming-soon flag, inspector flag, Maps key) once per
// page load and caches the in-flight promise so every component asking for
// it (the 3 map components here, and ticket #7's consumers) shares a single
// network request instead of each firing its own.

export interface RemoteConfig {
  whatsapp_number: string;
  show_coming_soon: boolean;
  enable_inspector: boolean;
  google_maps_api_key: string;
}

let cached: Promise<RemoteConfig> | null = null;

// The site's own Maps JavaScript key (Vercel env, public by design — it is
// restricted to the site's domains in Google Cloud), preferred over /config's
// (2026-10-09): the backends' GOOGLE_MAPS_API_KEY was unset on Render, so
// /config returned "" and every map failed to load. It's also known on the
// first render, which CityMap needs — Google's loader only loads once per
// page, with whatever key it was first given.
export const BUILD_MAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

export function fetchRemoteConfig(): Promise<RemoteConfig> {
  if (!cached) {
    cached = fetch("/config", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
        return res.json() as Promise<RemoteConfig>;
      })
      .then((config) => ({ ...config, google_maps_api_key: BUILD_MAPS_KEY || config.google_maps_api_key }))
      .catch((err) => {
        cached = null; // allow a retry on the next call rather than caching a permanent failure
        // Maps still work without /config when the build has a key.
        if (BUILD_MAPS_KEY) {
          return { whatsapp_number: "", show_coming_soon: false, enable_inspector: false, google_maps_api_key: BUILD_MAPS_KEY };
        }
        throw err;
      });
  }
  return cached;
}