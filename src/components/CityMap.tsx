import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FLOAT_PANE, GoogleMap, OVERLAY_MOUSE_TARGET, OverlayViewF, useJsApiLoader } from "@react-google-maps/api";
import type { CityMapData, CityMapVenue } from "../types/city";
import VenueCard from "./VenueCard";
import MockCityMap from "./MockCityMap";
import MapPin from "./MapPin";
import { catColor, catIcon } from "./cityMapCategories";
import styles from "./CityMap.module.css";
import ClusterPin from "./ClusterPin";
import { clusterPoints, worldPx } from "../lib/clusterPoints";
import { useLiveVenuePhoto } from "../hooks/useLiveVenuePhoto";
import { useRemoteConfig } from "../hooks/useRemoteConfig";
import { BUILD_MAPS_KEY } from "../lib/remoteConfig";
import { useIsMobile } from "../hooks/useIsMobile";

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

// Pins closer than this on screen merge into a count badge; from
// NO_CLUSTER_ZOOM (street level) every pin shows individually, and pins that
// would still sit on top of each other are fanned out in a small ring
// around their shared spot (2026-10-13, direct request: badges zoomed right
// in read as stuck).
const CLUSTER_RADIUS_PX = 84;
// Desktop: 56px clusters, and a badge click always zooms in at least
// MIN_CLUSTER_ZOOM_STEP levels (fitBounds alone barely moves when a big badge
// already spans most of the view). With 100+ venues the old behaviour took
// 4-5 clicks to reach a place. Phones keep the original behaviour.
const DESKTOP_CLUSTER_RADIUS_PX = 56;
const MIN_CLUSTER_ZOOM_STEP = 2;
const NO_CLUSTER_ZOOM = 14;
const OVERLAP_PX = 30;

// Screen offsets that fan out pins sharing (or nearly sharing) a spot.
function fanOffsets(n: number): { dx: number; dy: number }[] {
  const r = 18 + n * 3;
  return Array.from({ length: n }, (_, k) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
    return { dx: Math.round(r * Math.cos(a)), dy: Math.round(r * Math.sin(a)) };
  });
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
  const config = useRemoteConfig();
  // undefined = /config hasn't resolved yet; "" = resolved with no key
  // (or the fetch failed) — both render the same loading/mock branches
  // below as "falsy", only the first also skips straight past the mock.
  // The build's key when there is one (available on the first render — the
  // loader below fires immediately and only ever loads once, so starting it
  // before /config resolved loaded Maps with no key: Google's NoApiKeys).
  const mapsKey = BUILD_MAPS_KEY || (config === undefined ? undefined : config?.google_maps_api_key ?? "");

  const { isLoaded, loadError } = useJsApiLoader({
    id: "ta-google-map-script",
    googleMapsApiKey: mapsKey ?? "",
  });

  const data = useCityMapData(slug);
  const [selected, setSelected] = useState<CityMapVenue | null>(null);
  const livePhoto = useLiveVenuePhoto(livePlacesEnabled, slug, selected);
  const effectiveSelected: CityMapVenue | null =
    selected && livePhoto.status === "success"
      ? { ...selected, photos: [{ url: livePhoto.photoUrl, alt: selected.n, credit: null }] }
      : selected;
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(11);
  const isMobile = useIsMobile();
  const clusterRadius = isMobile ? CLUSTER_RADIUS_PX : DESKTOP_CLUSTER_RADIUS_PX;

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

  // Only single pins take hover (which opens the card), so a hovered pin is
  // never inside a badge and needs no special-casing here.
  const clusters = useMemo(() => {
    const pts = visibleVenues
      .map((v, i) => ({ v, i }))
      .map((item) => ({ item, ...worldPx(item.v.lat, item.v.lon, zoom) }));
    if (zoom < NO_CLUSTER_ZOOM) return clusterPoints(pts, clusterRadius).map((c) => ({ ...c, offsets: null }));
    return clusterPoints(pts, OVERLAP_PX).flatMap((c) => {
      const offsets = c.items.length > 1 ? fanOffsets(c.items.length) : [{ dx: 0, dy: 0 }];
      return c.items.map((item, k) => ({ x: c.x, y: c.y, items: [item], offsets: offsets[k] }));
    });
  }, [visibleVenues, zoom, clusterRadius]);

  function expandCluster(items: { v: CityMapVenue }[]) {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    items.forEach(({ v }) => bounds.extend({ lat: v.lat, lng: v.lon }));
    // Places on (nearly) one spot: fitBounds would dive to the map's
    // maximum zoom — street level is enough to fan them out.
    const span = bounds.toSpan();
    if (span.lat() < 0.002 && span.lng() < 0.002) {
      map.setCenter(bounds.getCenter());
      map.setZoom(NO_CLUSTER_ZOOM + 2);
      return;
    }
    const before = map.getZoom() ?? 11;
    map.fitBounds(bounds, 70);
    if (isMobile) return;
    google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) < before + MIN_CLUSTER_ZOOM_STEP) {
        map.setCenter(bounds.getCenter());
        map.setZoom(before + MIN_CLUSTER_ZOOM_STEP);
      }
    });
  }

  const center = useMemo(
    () => (data ? { lat: data.center[0], lng: data.center[1] } : { lat: 20, lng: 0 }),
    [data]
  );

  if (data === null) {
    return <div className={styles.fallback}>Map not available for this destination yet.</div>;
  }

  if (mapsKey === undefined || data === undefined) {
    return (
      <div className={styles.wrap}>
        <div className={styles.canvas}>
          <div className={styles.fallback}>Loading map…</div>
        </div>
      </div>
    );
  }

  if (!mapsKey) {
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

  if (!isLoaded) {
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
            setZoom(m.getZoom() ?? 11);
            // Fit to the dense in-city cluster only — day-trip venues
            // (Fatehpur Sikri, Vrindavan, etc.) can sit 40-60km out, and
            // including them in fitBounds would zoom out so far the main
            // city cluster becomes tiny/unclickable. A simple distance
            // filter around the data's own center keeps the initial view
            // at city scale; distant pins are still there to reach by
            // zooming/panning out manually.
            //
            // Deferred one frame: fitBounds computed synchronously inside
            // onLoad can run before the map's container has its final
            // rendered size (still mid-layout), producing a bad initial
            // zoom/pan that only self-corrects once the user manually
            // interacts with the map. requestAnimationFrame waits for the
            // browser's next paint, by which point the container is
            // reliably sized.
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
          onZoomChanged={() => map && setZoom(map.getZoom() ?? 11)}
          options={{
            styles: MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: true,
            fullscreenControl: true,
            clickableIcons: false,
          }}
        >
          {clusters.map((c) => {
            if (c.items.length > 1) {
              const lat = c.items.reduce((a, { v }) => a + v.lat, 0) / c.items.length;
              const lng = c.items.reduce((a, { v }) => a + v.lon, 0) / c.items.length;
              return (
                <OverlayViewF key={`cluster-${c.items.map((x) => x.i).join("-")}`} position={{ lat, lng }} mapPaneName={OVERLAY_MOUSE_TARGET}>
                  <div style={{ transform: "translate(-50%, -50%)" }}>
                    <ClusterPin count={c.items.length} onClick={() => expandCluster(c.items)} />
                  </div>
                </OverlayViewF>
              );
            }
            const { v, i } = c.items[0];
            const shift = c.offsets && (c.offsets.dx || c.offsets.dy) ? ` translate(${c.offsets.dx}px, ${c.offsets.dy}px)` : "";
            return (
              <OverlayViewF key={`${v.n}-${i}`} position={{ lat: v.lat, lng: v.lon }} mapPaneName={OVERLAY_MOUSE_TARGET}>
                <button
                  type="button"
                  aria-label={v.n}
                  style={shift ? { ...PIN_BUTTON_STYLE, transform: PIN_BUTTON_STYLE.transform + shift } : PIN_BUTTON_STYLE}
                  onMouseEnter={(e) => selectVenue(v, e.nativeEvent)}
                  onMouseLeave={() => setSelected(null)}
                >
                  <MapPin Icon={catIcon(v.cat)} color={catColor(v.cat)} active={selected?.n === v.n && selected.lat === v.lat} />
                </button>
              </OverlayViewF>
            );
          })}
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