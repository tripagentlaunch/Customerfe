import { useMemo, useRef } from "react";
import type { CityMapData, CityMapVenue } from "../types/city";
import VenueCard from "./VenueCard";
import MapPin from "./MapPin";
import { catColor, catIcon } from "./cityMapCategories";
import styles from "./MockCityMap.module.css";

// Placeholder for when there's no Google Maps key yet: venues plotted by
// lat/lon on a plain projected canvas (linear min/max normalisation across
// the city's own venues, not real map tiles) — same data, toggle and
// selection state as the real map, so switching a key back in later means
// deleting this component's branch in CityMap.tsx, not rewiring anything.
const PAD = 0.08;

function makeProjector(venues: CityMapVenue[]) {
  const lats = venues.map((v) => v.lat);
  const lons = venues.map((v) => v.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = maxLat - minLat || 1;
  const lonSpan = maxLon - minLon || 1;

  return (v: CityMapVenue) => {
    const xRaw = (v.lon - minLon) / lonSpan;
    const yRaw = (maxLat - v.lat) / latSpan; // higher latitude (north) renders higher up
    return {
      x: PAD * 100 + xRaw * (1 - 2 * PAD) * 100,
      y: PAD * 100 + yRaw * (1 - 2 * PAD) * 100,
    };
  };
}

export default function MockCityMap({
  data,
  visibleVenues,
  selected,
  onSelect,
  onClose,
}: {
  data: CityMapData;
  visibleVenues: CityMapVenue[];
  selected: CityMapVenue | null;
  onSelect: (v: CityMapVenue, domEvent: Event | undefined) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Projected off every venue in the city (not just the toggled-visible
  // ones), so hiding/showing a category never reflows the other pins.
  const project = useMemo(() => makeProjector(data.venues), [data]);

  return (
    <div className={styles.plain} ref={containerRef}>
      {visibleVenues.map((v, i) => {
        const { x, y } = project(v);
        return (
          <button
            key={`${v.n}-${i}`}
            type="button"
            className={styles.pin}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={v.n}
            onClick={(e) => onSelect(v, e.nativeEvent)}
          >
            <MapPin Icon={catIcon(v.cat)} color={catColor(v.cat)} active={selected?.n === v.n && selected.lat === v.lat} />
          </button>
        );
      })}
      {selected && (
        <div className={styles.cardAnchor} style={{ left: `${project(selected).x}%`, top: `${project(selected).y}%` }}>
          <VenueCard venue={selected} map={null} mapContainerEl={containerRef.current} onClose={onClose} />
        </div>
      )}
    </div>
  );
}
