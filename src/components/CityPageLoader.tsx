import { useEffect, useState } from "react";
import styles from "./CityPageLoader.module.css";

const MIN_DISPLAY_MS = 2400;
const MAX_WAIT_MS = 3000;

export function useCityPageReady(opts: {
  heroImage?: string;
  mapReady: boolean;
  criticalImages?: string[];
}) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);

  useEffect(() => {
    setMinTimeElapsed(false);
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [opts.heroImage]);

  useEffect(() => {
    setMapTimedOut(false);
    const t = setTimeout(() => setMapTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, [opts.heroImage]);

  return (opts.mapReady || mapTimedOut) && minTimeElapsed;
}

export default function CityPageLoader({ cityName }: { cityName: string }) {
  return (
    <div className={styles.loaderWrap}>
      <div className={styles.loaderInner}>
        <div className={styles.spinner} />
        <p className={styles.label}>Loading {cityName}…</p>
      </div>
    </div>
  );
}
