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

  if (loading) {
    return <div className={styles.loading}>Loading venues…</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
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
