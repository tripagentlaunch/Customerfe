import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FLOAT_PANE, GoogleMap, OVERLAY_MOUSE_TARGET, OverlayViewF, useJsApiLoader } from "@react-google-maps/api";
import type { CityMapData, CityMapVenue } from "../types/city";
import VenueCard from "./VenueCard";
import MockCityMap from "./MockCityMap";
import MapPin from "./MapPin";
import { catColor, catIcon } from "./cityMapCategories";
import styles from "./CityMap.module.css";
import { useLiveVenuePhoto } from "../hooks/useLiveVenuePhoto";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

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

export default function CityMap({
  slug,
  livePlacesEnabled = false,
  onReady,
}: {
  slug: string;
  livePlacesEnabled?: boolean;
  onReady?: () => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ta-google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
  });

  const data = useCityMapData(slug);
  const [selected, setSelected] = useState<CityMapVenue | null>(null);
  const livePhoto = useLiveVenuePhoto(livePlacesEnabled, slug, selected);
  const effectiveSelected: CityMapVenue | null =
    selected && livePhoto.status === "success"
      ? { ...selected, photos: [{ url: livePhoto.photoUrl, alt: selected.n, credit: null }] }
      : selected;
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const triggerElRef = useRef<HTMLElement | null>(null);

  // Fires onReady exactly once per slug for every terminal state: no venue
  // data for this city, a hard script load error, or (further down) once the
  // real map actually finishes loading. Without this, CityPageLoader would
  // hang forever on a city with no key, no data, or a failed script load.
  const firedReadyRef = useRef(false);
  useEffect(() => {
    firedReadyRef.current = false;
  }, [slug]);
  function fireReadyOnce() {
    if (firedReadyRef.current) return;
    firedReadyRef.current = true;
    onReady?.();
  }

  useEffect(() => {
    if (data === null || loadError) fireReadyOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loadError]);

  function selectVenue(v: CityMapVenue, domEvent: Event | undefined) {
    triggerElRef.current = (domEvent?.target as HTMLElement) ?? null;
    setSelected(v);
  }

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
    // Mock map has no async load step of its own — safe to fire immediately.
    fireReadyOnce();
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
          onLoad={(m) => {
            setMap(m);
            requestAnimationFrame(() => {
              const core = visibleVenues.filter((v) => {
                const dLat = v.lat - center.lat;
                const dLon = v.lon - center.lng;
                return Math.sqrt(dLat * dLat + dLon * dLon) < 0.15;
              });
              if (core.length > 1) {
                const bounds = new google.maps.LatLngBounds();
                core.forEach((v) => bounds.extend({ lat: v.lat, lng: v.lon }));
                m.fitBounds(bounds, 40);
              }
              fireReadyOnce();
            });
          }}
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
              <button
                type="button"
                aria-label={v.n}
                style={PIN_BUTTON_STYLE}
                onMouseEnter={(e) => selectVenue(v, e.nativeEvent)}
                onMouseLeave={() => setSelected(null)}
              >
                <MapPin Icon={catIcon(v.cat)} color={catColor(v.cat)} active={selected?.n === v.n && selected.lat === v.lat} />
              </button>
            </OverlayViewF>
          ))}
          {effectiveSelected && (
            <OverlayViewF
              key={`${effectiveSelected.n}-${effectiveSelected.lat}-${effectiveSelected.lon}`}
              position={{ lat: effectiveSelected.lat, lng: effectiveSelected.lon }}
              mapPaneName={FLOAT_PANE}
              getPixelPositionOffset={() => ({ x: 0, y: 0 })}
            >
              <VenueCard venue={effectiveSelected} map={map} mapContainerEl={canvasRef.current} onClose={closeWithFocusRestore} isLoadingPhoto={livePhoto.status === "loading"} />
            </OverlayViewF>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
