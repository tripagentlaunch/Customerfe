import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CityMapVenue } from "../types/city";
import { fetchPlaceLookupWithPhoto } from "../lib/placesLookup";
import { CATEGORIES, catColor, catIcon } from "./cityMapCategories";
import styles from "./ClusterCard.module.css";

// What a count badge on the city map holds (2026-10-22, direct request): the
// places in the group with a photo each, opened by hovering the badge on
// desktop and tapping it on a phone. A row opens that place's own card; the
// footer zooms in to the group. Photos are the venue's own when it has one,
// else a live Places lookup (same as VenueCard: never cached client-side).
const SHOWN = 8;
const CAT_ONE: Record<CityMapVenue["cat"], string> = { stay: "Stay", eat: "Table", do: "Sight", party: "After dark" };

function useThumbs(venues: CityMapVenue[], live: boolean, city: string) {
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const key = venues.map((v) => v.n).join("|");
  useEffect(() => {
    let cancelled = false;
    setThumbs({});
    venues.forEach((v) => {
      const own = v.photos?.find((p) => p.url)?.url;
      if (own) {
        setThumbs((t) => ({ ...t, [v.n]: own }));
        return;
      }
      if (!live) return;
      fetchPlaceLookupWithPhoto(v.n, v.a || city).then((res) => {
        if (!cancelled) setThumbs((t) => ({ ...t, [v.n]: res?.found && res.photo_url ? res.photo_url : null }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, live, city]);
  return thumbs;
}

export default function ClusterCard({
  venues,
  city,
  livePhotos,
  sheet,
  maxHeight,
  onPick,
  onZoom,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  venues: CityMapVenue[];
  city: string;
  livePhotos: boolean;
  /** Phone: a sheet along the bottom of the screen instead of a card at the badge. */
  sheet: boolean;
  /** Desktop: the room on the badge's side of the map; the list scrolls inside. */
  maxHeight?: number;
  onPick: (v: CityMapVenue) => void;
  onZoom: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const shown = venues.slice(0, SHOWN);
  const thumbs = useThumbs(shown, livePhotos, city);
  const counts = CATEGORIES.map((c) => ({ ...c, n: venues.filter((v) => v.cat === c.key).length })).filter((c) => c.n > 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const card = (
    <div
      className={`${styles.card} ${sheet ? styles.sheet : ""}`}
      style={maxHeight ? { maxHeight } : undefined}
      role="dialog"
      aria-label={`${venues.length} places`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      // Clicks inside must not reach the map (which closes cards).
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className={styles.head}>
        <div>
          <div className={styles.title}>{venues.length} places here</div>
          <div className={styles.counts}>
            {counts.map((c) => (
              <span key={c.key}>
                <i style={{ background: c.color }} />
                {c.n} {c.n === 1 ? CAT_ONE[c.key] : c.label}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <ul className={styles.list}>
        {shown.map((v) => {
          const Icon = catIcon(v.cat);
          const src = thumbs[v.n];
          return (
            <li key={`${v.n}-${v.lat}`}>
              <button type="button" className={styles.row} onClick={() => onPick(v)}>
                <span className={styles.thumb} style={{ color: catColor(v.cat) }}>
                  {src ? <img src={src} alt="" loading="lazy" /> : src === undefined && livePhotos ? <span className={styles.shimmer} /> : <Icon size={16} />}
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{v.n}</span>
                  <span className={styles.meta}>
                    {CAT_ONE[v.cat] ?? "Sight"}
                    {v.tier ? ` · ${v.tier}` : ""}
                    {v.a ? ` · ${v.a}` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.zoom} onClick={onZoom}>
        {venues.length > SHOWN ? `Zoom in to see all ${venues.length}` : "Zoom in"}
      </button>
    </div>
  );
  // The phone map is small: the sheet sits over the page's bottom edge, the
  // map (and the badge tapped) still in view above it.
  return sheet ? createPortal(card, document.body) : card;
}
