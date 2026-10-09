import { useEffect, useState } from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import animationData from "./travel-loader.json";
import styles from "./CityPageLoader.module.css";

// 2026-10-09: city pages showed the loader for ~11-12s although their
// content was ready in ~3s — MIN_DISPLAY_MS forced 10s, and the map and
// every critical image could hold it for up to 15s. Now: a short minimum
// so it doesn't flicker, the map waited for at most MAP_WAIT_MS, and the
// whole loader capped at MAX_WAIT_MS on slow connections.
const MIN_DISPLAY_MS = 400;
const MAP_WAIT_MS = 2500;
const MAX_WAIT_MS = 3000;

export function useCityPageReady(opts: {
  heroImage?: string;
  mapReady: boolean;
  criticalImages?: string[];
}) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    setMinTimeElapsed(false);
    setImagesReady(false);
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [opts.heroImage]);

  useEffect(() => {
    setMapTimedOut(false);
    const t = setTimeout(() => setMapTimedOut(true), MAP_WAIT_MS);
    return () => clearTimeout(t);
  }, [opts.heroImage]);

  useEffect(() => {
    const urls = opts.criticalImages ?? [];
    if (urls.length === 0) {
      setImagesReady(true);
      return;
    }
    let loaded = 0;
    const total = urls.length;
    const timeout = setTimeout(() => setImagesReady(true), MAX_WAIT_MS);
    urls.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= total) {
          clearTimeout(timeout);
          setImagesReady(true);
        }
      };
      img.src = src;
    });
    return () => clearTimeout(timeout);
  }, [opts.criticalImages]);

  return (opts.mapReady || mapTimedOut) && minTimeElapsed && imagesReady;
}

export default function CityPageLoader({ cityName }: { cityName: string }) {
  return (
    <div className={styles.loaderWrap}>
      <div className={styles.loaderInner}>
        <Player
          autoplay
          loop
          src={animationData}
          style={{ height: "200px", width: "200px" }}
        />
        <p className={styles.label}>Loading {cityName}…</p>
      </div>
    </div>
  );
}
