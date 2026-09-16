import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FLOAT_PANE, GoogleMap, OVERLAY_MOUSE_TARGET, OverlayViewF, useJsApiLoader } from "@react-google-maps/api";
import type { CityMapData, CityMapVenue } from "../types/city";
import VenueCard from "./VenueCard";
import MockCityMap from "./MockCityMap";
import MapPin from "./MapPin";
import { catColor, catIcon } from "./cityMapCategories";
import styles from "./CityMap.module.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// Per-city chunk (src/data/venue-coords/<slug>.json) so a city page only ever
// ships its own venues, not all 110 cities' worth.
const VENUE_COORD_LOADERS = import.meta.glob("../data/venue-coords/*.json") as Record<
  string,
  () => Promise<{ default: CityMapData }>
>;

function useCityMapData(slug: string) {
  const [data, setData] = useState<CityMapData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setData(undefined);
    const load = VENUE_COORD_LOADERS[`../data/venue-coords/${slug}.json`];
    if (!load) {
      setData(null);
      return;
    }
    load()
      .then((mod) => {
        if (!cancelled) setData(mod.default);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return data;
}

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const PIN_BUTTON_STYLE: CSSProperties = { transform: "translate(-50%, -50%)", background: "none", border: "none", padding: 0, cursor: "pointer" };

// Restrained, near-monochrome maison style — mutes default Google POI/road
// clutter so the curated markers stay the focus.
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f4f1ea" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5f5f5f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#faf9f6" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e7e6e2" }] },
  { featureType: "road.arterial", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dfe4e2" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#8a8680" }] },
];

export default function CityMap({ slug }: { slug: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ta-google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
  });

  const data = useCityMapData(slug);
  const [selected, setSelected] = useState<CityMapVenue | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  // The marker's own DOM node (best-effort focus target on close — see
  // restoreFocus, which falls back when this isn't reliably focusable).
  const triggerElRef = useRef<HTMLElement | null>(null);

  function selectVenue(v: CityMapVenue, domEvent: Event | undefined) {
    triggerElRef.current = (domEvent?.target as HTMLElement) ?? null;
    setSelected(v);
  }

  // Classic (non-Advanced) MarkerF markers are usually canvas-drawn, not
  // reliably focusable DOM nodes — try it anyway, but fall back to the map
  // container, so focus always lands somewhere sensible after Esc/close.
  function restoreFocus() {
    const marker = triggerElRef.current;
    if (marker && document.contains(marker) && typeof marker.focus === "function") {
      marker.focus();
      if (document.activeElement === marker) return;
    }
    canvasRef.current?.focus();
  }

  function closeWithFocusRestore() {
    setSelected(null);
    restoreFocus();
  }

  const visibleVenues = data?.venues ?? [];

  const center = useMemo(
    () => (data ? { lat: data.center[0], lng: data.center[1] } : { lat: 20, lng: 0 }),
    [data]
  );

  if (data === null) {
    return <div className={styles.fallback}>Map not available for this destination yet.</div>;
  }

  // No Google Maps key yet — a plain projected-pin map stands in, using the
  // same data/toggle/selection state as the real map above so swapping the
  // key back in later is just deleting this branch, not rewiring anything.
  if (!GOOGLE_MAPS_API_KEY) {
    if (data === undefined) {
      return (
        <div className={styles.wrap}>
          <div className={styles.canvas}>
            <div className={styles.fallback}>Loading map…</div>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.wrap}>
        <div className={styles.canvas} ref={canvasRef} tabIndex={-1}>
          <MockCityMap
            data={data}
            visibleVenues={visibleVenues}
            selected={selected}
            onSelect={selectVenue}
            onClose={closeWithFocusRestore}
          />
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div className={styles.fallback}>The map could not be loaded right now.</div>;
  }

  if (!isLoaded || data === undefined) {
    return (
      <div className={styles.wrap}>
        <div className={styles.canvas}>
          <div className={styles.fallback}>Loading map…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.canvas} ref={canvasRef} tabIndex={-1}>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={11}
          onLoad={(m) => setMap(m)}
          onClick={() => setSelected(null)}
          options={{
            styles: MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: true,
            fullscreenControl: true,
            clickableIcons: false,
          }}
        >
          {visibleVenues.map((v, i) => (
            <OverlayViewF key={`${v.n}-${i}`} position={{ lat: v.lat, lng: v.lon }} mapPaneName={OVERLAY_MOUSE_TARGET}>
              <button type="button" aria-label={v.n} style={PIN_BUTTON_STYLE} onClick={(e) => selectVenue(v, e.nativeEvent)}>
                <MapPin Icon={catIcon(v.cat)} color={catColor(v.cat)} active={selected?.n === v.n && selected.lat === v.lat} />
              </button>
            </OverlayViewF>
          ))}
          {selected && (
            <OverlayViewF
              key={`${selected.n}-${selected.lat}-${selected.lon}`}
              position={{ lat: selected.lat, lng: selected.lon }}
              mapPaneName={FLOAT_PANE}
              getPixelPositionOffset={() => ({ x: 0, y: 0 })}
            >
              <VenueCard venue={selected} map={map} mapContainerEl={canvasRef.current} onClose={closeWithFocusRestore} />
            </OverlayViewF>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
