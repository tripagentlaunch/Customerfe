import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FLOAT_PANE, GoogleMap, OVERLAY_MOUSE_TARGET, OverlayViewF, useJsApiLoader } from "@react-google-maps/api";
import type { CityMapData, CityMapVenue } from "../types/city";
import VenueCard from "./VenueCard";
import MockCityMap from "./MockCityMap";
import MapPin from "./MapPin";
import { catColor, catIcon } from "./cityMapCategories";
import styles from "./CityMap.module.css";
import ClusterPin from "./ClusterPin";
import ClusterCard from "./ClusterCard";
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

// Hover: a badge's card opens after a short pause (a mouse crossing the map
// doesn't flash cards) and stays while the pointer is on the badge or card.
const CARD_OPEN_MS = 120;
const CARD_CLOSE_MS = 220;

/** The city's own area: the venues around the middle of the city, ignoring a
 *  handful of far day trips, so the first view is the city and nothing else. */
function cityCore(venues: CityMapVenue[], center: { lat: number; lng: number }, share: number) {
  const dist = (v: CityMapVenue) => Math.hypot(v.lat - center.lat, (v.lon - center.lng) * Math.cos((center.lat * Math.PI) / 180));
  const near = venues.filter((v) => dist(v) < 0.15);
  const sorted = [...near].sort((a, b) => dist(a) - dist(b));
  return sorted.slice(0, Math.max(2, Math.ceil(sorted.length * share)));
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

  // The count badge whose card is open: its places and where it sits.
  const [openGroup, setOpenGroup] = useState<{ key: string; venues: CityMapVenue[]; lat: number; lng: number } | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  // Desktop: a click opens the card and pins it, so it stays when the pointer
  // wanders off the badge; only its ×, Escape, a click on the map or a zoom
  // closes it. A card opened by hovering still goes when the pointer leaves.
  const pinnedRef = useRef(false);
  function hoverGroup(next: typeof openGroup, delay: number) {
    if (pinnedRef.current && (!next || next.key === openGroup?.key)) return;
    if (next) pinnedRef.current = false;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpenGroup(next), delay);
  }
  function closeGroup() {
    pinnedRef.current = false;
    window.clearTimeout(hoverTimer.current);
    setOpenGroup(null);
  }
  function pinGroup(group: NonNullable<typeof openGroup>) {
    window.clearTimeout(hoverTimer.current);
    pinnedRef.current = true;
    setSelected(null);
    setOpenGroup(group);
  }
  function holdGroup() {
    window.clearTimeout(hoverTimer.current);
  }
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

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

  // Phone: the sheet covers the lower half of the screen, so bring the map
  // up to the top of the screen when it sits low.
  function revealMapAboveSheet() {
    const el = canvasRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.12) window.scrollBy({ top: top - 8, behavior: "smooth" });
  }

  function pickFromGroup(v: CityMapVenue) {
    closeGroup();
    if (map) {
      map.panTo({ lat: v.lat, lng: v.lon });
      if ((map.getZoom() ?? 0) < NO_CLUSTER_ZOOM) map.setZoom(NO_CLUSTER_ZOOM);
    }
    setSelected(v);
  }

  // Where a desktop card goes: on whichever side of the badge has more of the
  // map (it scrolls inside when even that is short); shifted in near an edge.
  function cardPlacement(lat: number, lng: number): { transform: string; maxHeight: number } {
    const b = map?.getBounds();
    const h = map?.getDiv().clientHeight ?? 600;
    if (!b) return { transform: "translate(-50%, calc(-100% - 26px))", maxHeight: 420 };
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    const fy = (ne.lat() - lat) / (ne.lat() - sw.lat() || 1);
    const fx = (lng - sw.lng()) / (ne.lng() - sw.lng() || 1);
    const x = fx < 0.3 ? "-24px" : fx > 0.7 ? "calc(-100% + 24px)" : "-50%";
    const above = fy * h - 40;
    const below = (1 - fy) * h - 40;
    return above >= below
      ? { transform: `translate(${x}, calc(-100% - 26px))`, maxHeight: Math.max(220, Math.min(460, above)) }
      : { transform: `translate(${x}, 26px)`, maxHeight: Math.max(220, Math.min(460, below)) };
  }

  function expandCluster(items: { v: CityMapVenue }[]) {
    // Phone: the places sheet stays up while the map zooms underneath it;
    // only its × (or picking a place) closes it.
    if (!isMobile) closeGroup();
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
            //
            // Phones (2026-10-22, direct request): the city and nothing else.
            // The small map frames the closest 85% of in-city places, and
            // panning/zooming out stops at the city's own area (every venue
            // within reach, day trips included, plus a margin).
            requestAnimationFrame(() => {
              const core = cityCore(visibleVenues, center, isMobile ? 0.85 : 1);
              if (core.length > 1) {
                const bounds = new google.maps.LatLngBounds();
                core.forEach((v) => bounds.extend({ lat: v.lat, lng: v.lon }));
                m.fitBounds(bounds, isMobile ? 24 : 40);
                const area = new google.maps.LatLngBounds();
                visibleVenues
                  .filter((v) => Math.hypot(v.lat - center.lat, v.lon - center.lng) < 0.6)
                  .forEach((v) => area.extend({ lat: v.lat, lng: v.lon }));
                const span = area.toSpan();
                const padLat = Math.max(span.lat() * 0.25, 0.05);
                const padLng = Math.max(span.lng() * 0.25, 0.05);
                const ne = area.getNorthEast();
                const sw = area.getSouthWest();
                google.maps.event.addListenerOnce(m, "idle", () => {
                  m.setOptions({
                    restriction: {
                      latLngBounds: { north: ne.lat() + padLat, south: sw.lat() - padLat, east: ne.lng() + padLng, west: sw.lng() - padLng },
                      strictBounds: false,
                    },
                    minZoom: Math.max(3, (m.getZoom() ?? 11) - (isMobile ? 1 : 2)),
                  });
                });
              }
              fireReadyOnce();
            });
          }}
          onClick={() => {
            setSelected(null);
            // Phone: the sheet is dismissed only by its ×.
            if (!isMobile) closeGroup();
          }}
          onZoomChanged={() => {
            if (!map) return;
            setZoom(map.getZoom() ?? 11);
            if (!isMobile) closeGroup();
          }}
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
              const key = `cluster-${c.items.map((x) => x.i).join("-")}`;
              const group = { key, venues: c.items.map((x) => x.v), lat, lng };
              const isOpen = openGroup?.key === key;
              return (
                <OverlayViewF key={key} position={{ lat, lng }} mapPaneName={OVERLAY_MOUSE_TARGET}>
                  <div style={{ transform: "translate(-50%, -50%)" }}>
                    <ClusterPin
                      count={c.items.length}
                      open={isOpen}
                      // Desktop: hover or a click shows what's inside (the
                      // click pins it open); the card's footer zooms in.
                      // Phone: a tap shows what's inside (its card zooms in).
                      onClick={() => {
                        if (!isMobile) return pinGroup(group);
                        setSelected(null);
                        setOpenGroup(isOpen ? null : group);
                        if (!isOpen) revealMapAboveSheet();
                      }}
                      onMouseEnter={isMobile ? undefined : () => { setSelected(null); hoverGroup(group, isOpen ? 0 : CARD_OPEN_MS); }}
                      onMouseLeave={isMobile ? undefined : () => hoverGroup(null, CARD_CLOSE_MS)}
                    />
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
                  // A tap on a phone (no hover) opens the card too.
                  onClick={(e) => {
                    closeGroup();
                    selectVenue(v, e.nativeEvent);
                  }}
                >
                  <MapPin Icon={catIcon(v.cat)} color={catColor(v.cat)} active={selected?.n === v.n && selected.lat === v.lat} />
                </button>
              </OverlayViewF>
            );
          })}
          {openGroup && !isMobile && (
            <OverlayViewF key={`card-${openGroup.key}`} position={{ lat: openGroup.lat, lng: openGroup.lng }} mapPaneName={FLOAT_PANE}>
              <div style={{ transform: cardPlacement(openGroup.lat, openGroup.lng).transform }}>
                <ClusterCard
                  maxHeight={cardPlacement(openGroup.lat, openGroup.lng).maxHeight}
                  venues={openGroup.venues}
                  city={slug}
                  livePhotos={livePlacesEnabled}
                  sheet={false}
                  onPick={pickFromGroup}
                  onZoom={() => expandCluster(openGroup.venues.map((v) => ({ v })))}
                  onClose={closeGroup}
                  onMouseEnter={holdGroup}
                  onMouseLeave={() => hoverGroup(null, CARD_CLOSE_MS)}
                />
              </div>
            </OverlayViewF>
          )}
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
        {openGroup && isMobile && (
          <ClusterCard
            venues={openGroup.venues}
            city={slug}
            livePhotos={livePlacesEnabled}
            sheet
            onPick={pickFromGroup}
            onZoom={() => expandCluster(openGroup.venues.map((v) => ({ v })))}
            onClose={closeGroup}
          />
        )}
      </div>
    </div>
  );
}