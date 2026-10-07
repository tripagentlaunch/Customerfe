import { useEffect, useRef } from "react";
import { FLOAT_PANE, GoogleMap, OVERLAY_MOUSE_TARGET, OverlayViewF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import MapPin from "./MapPin";
import { CAT_COLOR, CAT_ICON, type CatKey } from "./cityMapCategories";
import styles from "./PlanRouteMap.module.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// One stop per plan day (that day's highlight), in day order.
export interface PlanStop {
  lat: number;
  lon: number;
  dayNumber: string;
  label: string;
  // The short place name shown as the on-map label (e.g. "Katikies").
  place?: string;
  // Picks the pin's icon — null falls back to a generic "do" glyph.
  category?: CatKey | null;
}

const pinIconFor = (s: PlanStop) => CAT_ICON[s.category ?? "do"];
const pinColorFor = (s: PlanStop) => CAT_COLOR[s.category ?? "do"];

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

// Same restrained, near-monochrome style as CityMap.tsx — kept as its own
// copy (not a shared import): this map shows one fixed route, not category
// filters, so the two components have never shared state worth extracting.
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

const INK_SOFT = "#3e3a35";
const SIGNATURE = "#6e2a38";
// Generous margin around the route so it sits zoomed out, pins close together.
const FIT_PADDING_PX = 160;

// The route is shown whole and still: every day's highlight is a pin, joined
// Day 1 -> Day N in order (an open path — Day N is NOT joined back to Day 1).
// The active day's pin is enlarged and labelled, and the one leg that leads
// into it (for Day 1, the leg leaving it) is drawn solid; every other leg is
// dashed.
function activeLegIndex(activeIndex: number) {
  return activeIndex <= 0 ? 0 : activeIndex - 1;
}

function RealPlanRouteMap({ stops, activeIndex }: { stops: PlanStop[]; activeIndex: number }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ta-google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const stopsKey = stops.map((s) => `${s.lat},${s.lon}`).join("|");

  function fitAll() {
    const map = mapRef.current;
    if (!map || stops.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lon }));
    map.fitBounds(bounds, FIT_PADDING_PX);
  }

  // Re-frame only when the set of stops changes (e.g. a live lookup resolves
  // another day's coordinates) — never when the active day changes.
  useEffect(() => {
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey]);

  if (loadError || !isLoaded || stops.length === 0) {
    return <div className={styles.plain} />;
  }

  const legAt = activeLegIndex(activeIndex);

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={{ lat: stops[0].lat, lng: stops[0].lon }}
      zoom={12}
      onLoad={(m) => {
        mapRef.current = m;
        // Deferred one frame so the container has its final size (see the
        // same note in CityMap.tsx).
        requestAnimationFrame(fitAll);
      }}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        clickableIcons: false,
      }}
    >
      {stops.slice(0, -1).map((s, i) => {
        const isActive = i === legAt;
        return (
          <PolylineF
            key={i}
            path={[
              { lat: s.lat, lng: s.lon },
              { lat: stops[i + 1].lat, lng: stops[i + 1].lon },
            ]}
            options={{
              strokeColor: isActive ? SIGNATURE : INK_SOFT,
              // Dashed = a solid line at 0 opacity plus a repeating dash icon
              // (the standard react-google-maps technique for a dashed line).
              strokeOpacity: isActive ? 1 : 0,
              strokeWeight: isActive ? 3 : 1.5,
              icons: isActive ? undefined : [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.55, scale: 3 }, offset: "0", repeat: "12px" }],
            }}
          />
        );
      })}
      {stops.map((s, i) => (
        <OverlayViewF key={i} position={{ lat: s.lat, lng: s.lon }} mapPaneName={OVERLAY_MOUSE_TARGET}>
          <div title={`${s.dayNumber} — ${s.place ?? s.label}`} style={{ transform: "translate(-50%, -50%)" }}>
            <MapPin Icon={pinIconFor(s)} color={pinColorFor(s)} size={i === activeIndex ? 34 : 26} active={i === activeIndex} />
          </div>
        </OverlayViewF>
      ))}
      {stops[activeIndex] && (
        <OverlayViewF position={{ lat: stops[activeIndex].lat, lng: stops[activeIndex].lon }} mapPaneName={FLOAT_PANE} getPixelPositionOffset={() => ({ x: 12, y: -26 })}>
          <div className={styles.mapLabel}>{stops[activeIndex].place ?? stops[activeIndex].label}</div>
        </OverlayViewF>
      )}
    </GoogleMap>
  );
}

// No key yet — the plain projected-canvas placeholder (mirrors
// CityMap.tsx/MockCityMap's own real-map/no-key split).
function FallbackPlanRouteMap({ stops, activeIndex }: { stops: PlanStop[]; activeIndex: number }) {
  const PAD = 0.25;
  const lats = stops.map((s) => s.lat);
  const lons = stops.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = maxLat - minLat || 1;
  const lonSpan = maxLon - minLon || 1;
  const project = (s: PlanStop) => ({
    x: PAD * 100 + ((s.lon - minLon) / lonSpan) * (1 - 2 * PAD) * 100,
    y: PAD * 100 + ((maxLat - s.lat) / latSpan) * (1 - 2 * PAD) * 100,
  });
  const points = stops.map(project);
  const legAt = activeLegIndex(activeIndex);

  return (
    <div className={styles.plain}>
      <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none">
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          return (
            <line
              key={i}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              vectorEffect="non-scaling-stroke"
              className={`${styles.leg}${i === legAt ? ` ${styles.current}` : ""}`}
            />
          );
        })}
      </svg>
      {points.map((p, i) => (
        <div key={i} className={styles.stopWrap} style={{ left: `${p.x}%`, top: `${p.y}%` }} title={`${stops[i].dayNumber} — ${stops[i].place ?? stops[i].label}`}>
          <MapPin Icon={pinIconFor(stops[i])} color={pinColorFor(stops[i])} size={i === activeIndex ? 30 : 22} active={i === activeIndex} />
          {i === activeIndex && <span className={styles.stopLabel}>{stops[i].place ?? stops[i].label}</span>}
        </div>
      ))}
    </div>
  );
}

export default function PlanRouteMap({ stops, activeIndex }: { stops: PlanStop[]; activeIndex: number }) {
  if (GOOGLE_MAPS_API_KEY) return <RealPlanRouteMap stops={stops} activeIndex={activeIndex} />;
  return <FallbackPlanRouteMap stops={stops} activeIndex={activeIndex} />;
}
