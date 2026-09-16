import { useEffect, useRef, useState } from "react";
import { Plane } from "lucide-react";
import { FLOAT_PANE, GoogleMap, OVERLAY_MOUSE_TARGET, OverlayViewF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { createCameraTween, targetForPoints } from "../lib/mapCamera";
import MapPin from "./MapPin";
import { CAT_COLOR, CAT_ICON, type CatKey } from "./cityMapCategories";
import styles from "./PlanRouteMap.module.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface PlanStop {
  lat: number;
  lon: number;
  dayNumber: string;
  label: string;
  // The short place name shown as the on-map label (e.g. "Katikies") —
  // falls back to `label` (the Morning/Afternoon/Evening slot name) where a
  // stop has no place of its own, e.g. an arrival-point stop.
  place?: string;
  // Picks the pin's icon — null falls back to a generic "do" glyph. The
  // arrival point (no real category of its own) is special-cased to a
  // plane below.
  category?: CatKey | null;
  // Set only by the arrival-point stop (see CityPage.tsx's activeDayStops)
  // to get the plane icon. Deliberately NOT inferred by matching `place`/
  // `label` against the literal string "Airport" — a real backend's
  // arrival-point label is far more likely to be something like "Dubai
  // International Airport" than that exact word, and a string match would
  // silently lose the icon for every real-world label.
  isAirport?: boolean;
}

const AIRPORT_ICON = Plane;

function pinIconFor(s: PlanStop) {
  if (s.isAirport) return AIRPORT_ICON;
  return CAT_ICON[s.category ?? "do"];
}

function pinColorFor(s: PlanStop) {
  if (s.isAirport) return "#3F5560";
  return CAT_COLOR[s.category ?? "do"];
}

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

// Same restrained, near-monochrome style as CityMap.tsx — kept as its own
// copy (not a shared import) for the same reason that file already gives:
// this map tracks a single advancing tour index, not category filters, so
// the two components have never shared state worth extracting a module for.
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

const STONE = "#8b8578";
const INK_SOFT = "#3e3a35";
const SIGNATURE = "#6e2a38";

// Tight per-leg shots vs. the wide birds-eye pull-back on a day change.
const LEG_PADDING_PX = 90;
const DAY_PADDING_PX = 56;
const LEG_MAX_ZOOM = 17;
const DAY_MAX_ZOOM = 15;
const PAN_MS = 750;
const ZOOM_OUT_MS = 900;
const HOLD_MS = 650;
const ZOOM_IN_MS = 900;

function currentLegPoints(stops: PlanStop[], activeIndex: number) {
  if (activeIndex > 0 && stops[activeIndex - 1] && stops[activeIndex]) {
    return [stops[activeIndex - 1], stops[activeIndex]];
  }
  const s = stops[Math.max(0, Math.min(activeIndex, stops.length - 1))];
  return s ? [s] : [];
}

function RealPlanRouteMap({ stops, activeIndex }: { stops: PlanStop[]; activeIndex: number }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ta-google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const tweenRef = useRef<ReturnType<typeof createCameraTween> | null>(null);
  const prevDayKeyRef = useRef<string | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True only during a day change's wide birds-eye hold — while true, every
  // leg of the new day renders fully solid ("traced in") instead of the
  // normal current/dotted styling, which resumes once the zoom-in starts.
  const [revealDay, setRevealDay] = useState(false);

  function mapPxSize() {
    const div = mapRef.current?.getDiv();
    return { width: div?.clientWidth || 600, height: div?.clientHeight || 400 };
  }

  useEffect(() => {
    const map = mapRef.current;
    const tween = tweenRef.current;
    if (!map || !tween || stops.length === 0) return;

    // A step change mid-hold (someone clicking through days quickly) must
    // not leave the previous hold's timer to fire later and clobber this
    // one — cancel it before starting anything new.
    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    const dayKey = stops[0]?.dayNumber ?? "";
    const isDayChange = prevDayKeyRef.current !== null && prevDayKeyRef.current !== dayKey;
    prevDayKeyRef.current = dayKey;

    const legTarget = targetForPoints(currentLegPoints(stops, activeIndex), mapPxSize(), LEG_PADDING_PX, LEG_MAX_ZOOM);

    if (isDayChange) {
      const dayTarget = targetForPoints(stops, mapPxSize(), DAY_PADDING_PX, DAY_MAX_ZOOM);
      setRevealDay(true);
      tween.tweenTo(dayTarget, ZOOM_OUT_MS, () => {
        holdTimeoutRef.current = setTimeout(() => {
          holdTimeoutRef.current = null;
          setRevealDay(false);
          tween.tweenTo(legTarget, ZOOM_IN_MS);
        }, HOLD_MS);
      });
    } else {
      setRevealDay(false);
      tween.tweenTo(legTarget, PAN_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, activeIndex]);

  useEffect(
    () => () => {
      tweenRef.current?.cancel();
      if (holdTimeoutRef.current !== null) clearTimeout(holdTimeoutRef.current);
    },
    []
  );

  const initialTargetRef = useRef<ReturnType<typeof targetForPoints> | null>(null);
  if (!initialTargetRef.current && stops.length > 0) {
    // Before mount there's no map div to size against yet, so the very
    // first framing just centers on the first leg at a reasonable fixed
    // zoom — onLoad below immediately corrects it once real sizing exists,
    // before the map has had a chance to paint the wrong one.
    const s = stops[Math.max(0, Math.min(activeIndex, stops.length - 1))];
    initialTargetRef.current = { center: { lat: s.lat, lng: s.lon }, zoom: 15 };
  }

  if (loadError || !isLoaded || stops.length === 0 || !initialTargetRef.current) {
    return <div className={styles.plain} />;
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={initialTargetRef.current.center}
      zoom={initialTargetRef.current.zoom}
      onLoad={(m) => {
        mapRef.current = m;
        tweenRef.current = createCameraTween(m);
        prevDayKeyRef.current = stops[0]?.dayNumber ?? "";
        const div = m.getDiv();
        const mapPx = { width: div?.clientWidth || 600, height: div?.clientHeight || 400 };
        tweenRef.current.setImmediate(targetForPoints(currentLegPoints(stops, activeIndex), mapPx, LEG_PADDING_PX, LEG_MAX_ZOOM));
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
        const next = stops[i + 1];
        const traveled = i + 1 <= activeIndex;
        const isCurrentLeg = i + 1 === activeIndex;
        const path = [
          { lat: s.lat, lng: s.lon },
          { lat: next.lat, lng: next.lon },
        ];
        // Upcoming legs are dotted (a solid line at 0 opacity plus a
        // repeating dash icon — the standard react-google-maps technique
        // for a dashed Polyline); traveled/current legs are plain solid.
        // While the new day's route is being "traced in" (revealDay), every
        // leg is shown solid regardless of traveled/current/upcoming.
        return (
          <PolylineF
            key={i}
            path={path}
            options={{
              strokeColor: revealDay ? INK_SOFT : isCurrentLeg ? SIGNATURE : traveled ? INK_SOFT : STONE,
              strokeOpacity: revealDay ? 0.8 : isCurrentLeg ? 1 : traveled ? 0.35 : 0,
              strokeWeight: isCurrentLeg && !revealDay ? 3 : 1.5,
              icons:
                !revealDay && !traveled && !isCurrentLeg
                  ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.45, scale: 3 }, offset: "0", repeat: "12px" }]
                  : undefined,
            }}
          />
        );
      })}
      {stops.map((s, i) => (
        <OverlayViewF key={i} position={{ lat: s.lat, lng: s.lon }} mapPaneName={OVERLAY_MOUSE_TARGET}>
          <div title={`${s.dayNumber} — ${s.label}`} style={{ transform: "translate(-50%, -50%)" }}>
            <MapPin Icon={pinIconFor(s)} color={pinColorFor(s)} size={i === activeIndex ? 34 : 26} active={i === activeIndex} dim={i > activeIndex} />
          </div>
        </OverlayViewF>
      ))}
      {/* On-map text labels — Marker's own `label` option only allows a
          single short glyph with no real typographic control, so labels are
          rendered as small floating pills in the map's overlay pane instead.
          Only the current leg's two endpoints (from/to) are labelled — the
          rest stay unlabelled until it's their turn, so the map doesn't show
          the whole day's names at once. */}
      {stops.map(
        (s, i) =>
          (i === activeIndex || i === activeIndex - 1) && (
            <OverlayViewF key={`label-${i}`} position={{ lat: s.lat, lng: s.lon }} mapPaneName={FLOAT_PANE} getPixelPositionOffset={() => ({ x: 10, y: -24 })}>
              <div className={styles.mapLabel}>{s.place ?? s.label}</div>
            </OverlayViewF>
          )
      )}
    </GoogleMap>
  );
}

// No key yet — the same plain projected-canvas placeholder this component
// always used, kept as the fallback (mirrors CityMap.tsx/MockCityMap's own
// real-map/no-key split) rather than leaving a blank box.
function FallbackPlanRouteMap({ stops, activeIndex }: { stops: PlanStop[]; activeIndex: number }) {
  const PAD = 0.1;
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

  return (
    <div className={styles.plain}>
      <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="plan-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10Z" fill="var(--signature, #6E2A38)" />
          </marker>
        </defs>
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          const traveled = i + 1 <= activeIndex;
          const isCurrentLeg = i + 1 === activeIndex;
          return (
            <line
              key={i}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              vectorEffect="non-scaling-stroke"
              className={`${styles.leg}${traveled ? ` ${styles.traveled}` : ""}${isCurrentLeg ? ` ${styles.current}` : ""}`}
              markerEnd={isCurrentLeg ? "url(#plan-arrow)" : undefined}
            />
          );
        })}
      </svg>
      {points.map((p, i) => (
        <div key={i} className={styles.stopWrap} style={{ left: `${p.x}%`, top: `${p.y}%` }} title={`${stops[i].dayNumber} — ${stops[i].label}`}>
          <MapPin Icon={pinIconFor(stops[i])} color={pinColorFor(stops[i])} size={i === activeIndex ? 30 : 22} active={i === activeIndex} dim={i > activeIndex} />
          {/* Only the current leg's two endpoints are labelled — see the
              matching comment in RealPlanRouteMap above. */}
          {(i === activeIndex || i === activeIndex - 1) && <span className={styles.stopLabel}>{stops[i].place ?? stops[i].label}</span>}
        </div>
      ))}
    </div>
  );
}

export default function PlanRouteMap({ stops, activeIndex }: { stops: PlanStop[]; activeIndex: number }) {
  if (GOOGLE_MAPS_API_KEY) return <RealPlanRouteMap stops={stops} activeIndex={activeIndex} />;
  return <FallbackPlanRouteMap stops={stops} activeIndex={activeIndex} />;
}
