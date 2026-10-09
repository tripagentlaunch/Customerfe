import { useEffect, useState } from "react";
import { fetchCityVenues, type Venue } from "../lib/api";
import styles from "./live-venues.module.css";

interface LiveVenuesProps {
  slug: string;
}

export default function LiveVenues({ slug }: LiveVenuesProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchCityVenues(slug)
      .then((data) => {
        if (!cancelled) setVenues(data.venues);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load venues.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 2026-10-09: nothing at all unless there are venues to show — this sits in
  // the closing CTA band, where "Loading venues…" / "Failed to load venues."
  // (the endpoint 500s/503s or returns none for most cities) read as a bug.
  if (loading || error || venues.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrap}>
      {venues.map((venue) => (
        <div key={venue.id} className={styles.card}>
          {venue.raw.image_url && (
            <img
              className={styles.image}
              src={venue.raw.image_url}
              alt={venue.raw.name || venue.name_raw}
              loading="lazy"
            />
          )}
          <div className={styles.body}>
            <p className={styles.name}>{venue.raw.name || venue.name_raw}</p>
            <p className={styles.category}>{venue.category}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
