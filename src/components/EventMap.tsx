import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { FLOAT_PANE, GoogleMap, OVERLAY_MOUSE_TARGET, OverlayViewF, useJsApiLoader } from "@react-google-maps/api";
import { createCameraTween } from "../lib/mapCamera";
import MapPin from "./MapPin";
import styles from "./PlanRouteMap.module.css";
import eventStyles from "./EventMap.module.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface EventPoint {
  lat: number;
  lon: number;
  // The label/name shown on the map for this point — the event's own name,
  // not its location label, so it reads the same as the tag/list entry
  // driving the highlight.
  name: string;
  // Always set by the caller (CityPage falls back to a deterministic
  // placeholder when the event has no authored photo) — optional here only
  // so a point with no photo at all just renders without one instead of
  // crashing.
  photo?: string;
}

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

// Same restrained style as CityMap.tsx/PlanRouteMap.tsx — kept as its own
// copy for the same reason those two already give: this map tracks a single
// highlighted point, not a route or category filters, so there's nothing
// worth sharing beyond the visual constants themselves.
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

const SIGNATURE = "#6e2a38";
const PAN_MS = 900;
const ZOOM = 14;

function RealEventMap({ point }: { point: EventPoint | null }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ta-google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const tweenRef = useRef<ReturnType<typeof createCameraTween> | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    const tween = tweenRef.current;
    if (!map || !tween || !point) return;
    tween.tweenTo({ center: { lat: point.lat, lng: point.lon }, zoom: ZOOM }, PAN_MS);
  }, [point]);

  useEffect(() => () => tweenRef.current?.cancel(), []);

  if (loadError || !isLoaded || !point) return <div className={styles.plain} />;

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={{ lat: point.lat, lng: point.lon }}
      zoom={ZOOM}
      onLoad={(m) => {
        mapRef.current = m;
        tweenRef.current = createCameraTween(m);
      }}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        clickableIcons: false,
      }}
    >
      <OverlayViewF position={{ lat: point.lat, lng: point.lon }} mapPaneName={OVERLAY_MOUSE_TARGET}>
        <div title={point.name} style={{ transform: "translate(-50%, -50%)" }}>
          <MapPin Icon={Sparkles} color={SIGNATURE} size={34} active />
        </div>
      </OverlayViewF>
      <OverlayViewF position={{ lat: point.lat, lng: point.lon }} mapPaneName={FLOAT_PANE} getPixelPositionOffset={() => ({ x: 10, y: -24 })}>
        <div className={styles.mapLabel}>{point.name}</div>
      </OverlayViewF>
      {/* The photo, directly above the pin — offset by half the pin's own
          height plus a small gap, then translate(-50%,-100%) so that offset
          point is the image's own bottom-center rather than its top-left
          (the default for an untransformed overlay). */}
      {point.photo && (
        <OverlayViewF position={{ lat: point.lat, lng: point.lon }} mapPaneName={FLOAT_PANE} getPixelPositionOffset={() => ({ x: 0, y: -27 })}>
          <img className={eventStyles.eventPhoto} style={{ transform: "translate(-50%, -100%)" }} src={point.photo} alt="" />
        </OverlayViewF>
      )}
    </GoogleMap>
  );
}

// No key yet — a plain centered placeholder rather than a blank box, mirroring
// CityMap/PlanRouteMap's own real-map/no-key split.
function FallbackEventMap({ point }: { point: EventPoint | null }) {
  if (!point) return <div className={styles.plain} />;
  return (
    <div className={styles.plain}>
      <div className={eventStyles.stopWrapRelative} style={{ left: "50%", top: "50%" }}>
        {point.photo && <img className={eventStyles.eventPhotoAbove} src={point.photo} alt="" />}
        <div className={styles.stopWrap}>
          <MapPin Icon={Sparkles} color={SIGNATURE} size={30} active />
          <span className={styles.stopLabel}>{point.name}</span>
        </div>
      </div>
    </div>
  );
}

export default function EventMap({ point }: { point: EventPoint | null }) {
  if (GOOGLE_MAPS_API_KEY) return <RealEventMap point={point} />;
  return <FallbackEventMap point={point} />;
}
