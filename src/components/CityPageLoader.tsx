import { useEffect, useRef, useState } from "react";
import centers from "../data/city-centers.json";
import styles from "./CityPageLoader.module.css";

// 2026-10-09: city pages showed the loader for ~11-12s although their
// content was ready in ~3s — MIN_DISPLAY_MS forced 10s, and the map and
// every critical image could hold it for up to 15s. Now: a short minimum
// so it doesn't flicker, the map waited for at most MAP_WAIT_MS, and the
// whole loader capped at MAX_WAIT_MS on slow connections.
// 800 (was 400, 2026-11-19): long enough for the coordinates to count up and land on the city.
const MIN_DISPLAY_MS = 800;
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

// "Arriving in <city>" (2026-11-19, option C, chosen by the user from four on-brand loaders; it replaces a
// stock Lottie travel animation): the city's name in the display serif, its real latitude and longitude
// counting up to their values in tabular figures, and a small beacon in the site's signature colour.
// City centres come from the map's own data (src/data/city-centers.json, from venue-coords/<slug>.json).
const CENTERS = centers as unknown as Record<string, [number, number]>;

function fmt(v: number, pos: string, neg: string): string {
  return `${Math.abs(v).toFixed(4).padStart(7, "0")}° ${v >= 0 ? pos : neg}`;
}

export default function CityPageLoader({ cityName, slug }: { cityName: string; slug?: string }) {
  const at = slug ? CENTERS[slug] : undefined;
  const [shown, setShown] = useState<[number, number]>([0, 0]);
  const raf = useRef(0);
  useEffect(() => {
    if (!at) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(at);
      return;
    }
    const t0 = performance.now() + 80;
    const dur = 650;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - t, 3);
      setShown([at[0] * e, at[1] * e]);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [at?.[0], at?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.loaderWrap} role="status" aria-live="polite" aria-label={`Loading ${cityName}`}>
      <div className={styles.loaderInner}>
        <span className={styles.eyebrow}>
          <span className={styles.beacon} aria-hidden="true" />
          Arriving in
        </span>
        <span className={styles.name}>{cityName}</span>
        {at && (
          <span className={styles.coords} aria-hidden="true">
            <span>{fmt(shown[0], "N", "S")}</span>
            <span>{fmt(shown[1], "E", "W")}</span>
          </span>
        )}
      </div>
    </div>
  );
}
