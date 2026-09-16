// Smooth camera animation for the base Google Maps JS API, which doesn't
// tween zoom on its own (setZoom snaps instantly; only panTo animates, and
// only the center). Both pieces here are needed together: a manual
// requestAnimationFrame tween drives center+zoom in lockstep, and
// zoomForBounds computes what zoom actually fits a set of points — the
// standard Mercator-tile formula fitBounds uses internally, reimplemented
// here because fitBounds itself has no "tell me the zoom, don't move yet"
// mode.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CameraTarget {
  center: LatLng;
  zoom: number;
}

const WORLD_PX = 256;

function latRad(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
}

function zoomFraction(pxSize: number, fraction: number): number {
  return Math.log(pxSize / WORLD_PX / Math.max(fraction, 1e-9)) / Math.LN2;
}

// Degenerate (single-point, zero-span) bounds naturally produce a huge
// zoom here, which the maxZoom clamp below turns into "just zoom in as far
// as we'll allow" — no special-casing needed for a lone point.
export function targetForPoints(points: { lat: number; lon: number }[], mapPx: { width: number; height: number }, paddingPx: number, maxZoom = 17): CameraTarget {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lons);
  const maxLng = Math.max(...lons);

  const latFraction = (latRad(maxLat) - latRad(minLat)) / Math.PI;
  let lngDiff = maxLng - minLng;
  if (lngDiff < 0) lngDiff += 360;
  const lngFraction = lngDiff / 360;

  const paddedWidth = Math.max(40, mapPx.width - paddingPx * 2);
  const paddedHeight = Math.max(40, mapPx.height - paddingPx * 2);

  const zoom = Math.min(zoomFraction(paddedHeight, latFraction), zoomFraction(paddedWidth, lngFraction), maxZoom);

  return {
    center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
    zoom: Math.max(2, zoom),
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// A tween that owns its own rAF loop and can be redirected mid-flight —
// calling tweenTo again cancels whatever's in progress and starts fresh
// from the current interpolated position, so rapid step changes never
// fight each other or snap backwards.
// Unlike center (cheap — panning just loads a few more tiles at the same
// zoom level, same as a normal drag), every zoom *level* change makes the
// map fetch a whole new tile pyramid layer from Google's servers. Calling
// setZoom on every animation frame (~60/sec) turns one "zoom in" gesture
// into dozens of full tile-layer reloads in under a second — multiplied by
// a 6s auto-advance running continuously, that's enough real API/tile
// traffic to trip a quota within a couple of minutes. Throttling how often
// the *zoom* actually gets pushed to the map (while still updating center
// every frame, since that part is cheap) keeps the animation looking just
// as smooth with a small fraction of the tile requests.
const ZOOM_UPDATE_INTERVAL_MS = 120;

export function createCameraTween(map: google.maps.Map) {
  let frameId: number | null = null;
  let current: CameraTarget | null = null;

  function cancel() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function tweenTo(target: CameraTarget, durationMs: number, onDone?: () => void) {
    cancel();
    const start = current ?? {
      center: { lat: map.getCenter()?.lat() ?? target.center.lat, lng: map.getCenter()?.lng() ?? target.center.lng },
      zoom: map.getZoom() ?? target.zoom,
    };
    const startTime = performance.now();
    let lastZoomUpdate = 0;

    function step(now: number) {
      const t = Math.min(1, (now - startTime) / durationMs);
      const e = easeOutCubic(t);
      current = {
        center: {
          lat: start.center.lat + (target.center.lat - start.center.lat) * e,
          lng: start.center.lng + (target.center.lng - start.center.lng) * e,
        },
        zoom: start.zoom + (target.zoom - start.zoom) * e,
      };
      map.setCenter(current.center);
      const isLastFrame = t >= 1;
      if (isLastFrame || now - lastZoomUpdate >= ZOOM_UPDATE_INTERVAL_MS) {
        map.setZoom(current.zoom);
        lastZoomUpdate = now;
      }
      if (!isLastFrame) {
        frameId = requestAnimationFrame(step);
      } else {
        frameId = null;
        onDone?.();
      }
    }
    frameId = requestAnimationFrame(step);
  }

  function setImmediate(target: CameraTarget) {
    cancel();
    current = target;
    map.setCenter(target.center);
    map.setZoom(target.zoom);
  }

  return { tweenTo, setImmediate, cancel };
}
