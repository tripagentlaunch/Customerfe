import { useEffect, useState } from "react";
import { fetchRemoteConfig, type RemoteConfig } from "../lib/remoteConfig";

// undefined = not yet resolved, null = resolved but the fetch failed
// (callers should treat that the same as "no key configured").
export function useRemoteConfig(): RemoteConfig | undefined | null {
  const [config, setConfig] = useState<RemoteConfig | undefined | null>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchRemoteConfig()
      .then((cfg) => {
        if (!cancelled) setConfig(cfg);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}