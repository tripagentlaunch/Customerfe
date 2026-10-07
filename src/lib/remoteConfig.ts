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

export function fetchRemoteConfig(): Promise<RemoteConfig> {
  if (!cached) {
    cached = fetch("/config", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
        return res.json() as Promise<RemoteConfig>;
      })
      .catch((err) => {
        cached = null; // allow a retry on the next call rather than caching a permanent failure
        throw err;
      });
  }
  return cached;
}