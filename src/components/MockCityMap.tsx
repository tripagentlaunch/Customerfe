import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CityMapData, CityMapVenue } from "../types/city";
import VenueCard from "./VenueCard";
import MapPin from "./MapPin";
import ClusterPin from "./ClusterPin";
import { clusterPoints } from "../lib/clusterPoints";
import { catColor, catIcon } from "./cityMapCategories";
import styles from "./MockCityMap.module.css";
import { useIsMobile } from "../hooks/useIsMobile";
import { siteHeaderBottom, useEdgePan } from "../hooks/useEdgePan";

// Placeholder for when there's no Google Maps key yet: venues plotted by
// lat/lon on a plain projected canvas (linear min/max normalisation across
// the city's own venues, not real map tiles) — same data, toggle and
// selection state as the real map, so switching a key back in later means
// deleting this component's branch in CityMap.tsx, not rewiring anything.
const PAD = 0.08;
const CLUSTER_RADIUS_PX = 84;
// Desktop only (phones keep the values above / the full overview): smaller
// clusters, a bigger zoom per badge click (scale factor; phones use 1.5), and
// opening on the city core — the same radius CityMap.tsx's initial fitBounds
// uses — so far-out day-trip venues don't shrink the city to one badge.
const DESKTOP_CLUSTER_RADIUS_PX = 56;
const MIN_CLUSTER_ZOOM_STEP = 2.5;
const CORE_RADIUS_DEG = 0.15;
const MAX_SCALE = 8;
const FIT_PADDING_PX = 80;

interface View {
  s: number;
  tx: number;
  ty: number;
}

// Keeps the zoomed canvas covering the viewport (no panning into empty space).
function clampView(v: View, w: number, h: number): View {
  return { s: v.s, tx: Math.min(0, Math.max(w - w * v.s, v.tx)), ty: Math.min(0, Math.max(h - h * v.s, v.ty)) };
}

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

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean; id: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A different city's data starts on its core (as the Google map does):
  // venues within CORE_RADIUS_DEG of the city's center. Zoom out for the rest.
  const isMobile = useIsMobile();
  const hasSize = size.w > 0;
  useEffect(() => {
    if (!hasSize || isMobile) {
      setView({ s: 1, tx: 0, ty: 0 });
      return;
    }
    const [lat, lon] = data.center;
    const core = data.venues.filter((v) => Math.hypot(v.lat - lat, v.lon - lon) < CORE_RADIUS_DEG);
    setView(core.length > 1 && core.length < data.venues.length ? fitView(core, 1) : { s: 1, tx: 0, ty: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hasSize, isMobile]);

  // Base (unzoomed) pixel position, then the on-screen position under the view.
  function base(v: CityMapVenue) {
    const p = project(v);
    return { x: (p.x / 100) * size.w, y: (p.y / 100) * size.h };
  }
  function screen(v: CityMapVenue) {
    const b = base(v);
    return { x: b.x * view.s + view.tx, y: b.y * view.s + view.ty };
  }

  const clusters = useMemo(() => {
    if (!size.w) return [];
    const pts = visibleVenues
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !(selected && selected.n === v.n && selected.lat === v.lat))
      .map((item) => ({ item, ...screen(item.v) }));
    return view.s >= MAX_SCALE ? pts.map((p) => ({ x: p.x, y: p.y, items: [p.item] })) : clusterPoints(pts, isMobile ? CLUSTER_RADIUS_PX : DESKTOP_CLUSTER_RADIUS_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleVenues, selected, size, view, project, isMobile]);

  function zoomAround(cx: number, cy: number, factor: number) {
    setView((cur) => {
      const s = Math.min(MAX_SCALE, Math.max(1, cur.s * factor));
      const k = s / cur.s;
      return clampView({ s, tx: cx - (cx - cur.tx) * k, ty: cy - (cy - cur.ty) * k }, size.w, size.h);
    });
  }

  function expandCluster(items: { v: CityMapVenue }[]) {
    setView(fitView(items.map(({ v }) => v), view.s * (isMobile ? 1.5 : MIN_CLUSTER_ZOOM_STEP)));
  }

  // View that fits these venues, zoomed in to at least `minScale`.
  function fitView(venues: CityMapVenue[], minScale: number): View {
    const pts = venues.map(base);
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const fit = Math.min((size.w - 2 * FIT_PADDING_PX) / (maxX - minX || 1), (size.h - 2 * FIT_PADDING_PX) / (maxY - minY || 1));
    const s = Math.min(MAX_SCALE, Math.max(minScale, fit));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return clampView({ s, tx: size.w / 2 - cx * s, ty: size.h / 2 - cy * s }, size.w, size.h);
  }

  // Drag-to-pan (mouse, pen and finger). A finger only pans once zoomed in (see
  // touchAction below); at the fit a swipe scrolls the page instead.
  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-map-ctl]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false, id: e.pointerId };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      containerRef.current?.setPointerCapture(d.id);
    }
    setView((cur) => clampView({ s: cur.s, tx: d.tx + dx, ty: d.ty + dy }, size.w, size.h));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  // Mouse near an edge slides the view that way once zoomed in (see useEdgePan).
  useEdgePan(
    containerRef,
    (dx, dy) => setView((cur) => clampView({ s: cur.s, tx: cur.tx - dx, ty: cur.ty - dy }, size.w, size.h)),
    !selected && view.s > 1,
    siteHeaderBottom
  );

  const selPos = selected && size.w ? screen(selected) : null;

  return (
    <div
      className={styles.plain}
      // At the fit there is nothing to pan, so vertical swipes scroll the page; zoomed
      // in, the map takes every gesture until the visitor zooms back out.
      style={{ touchAction: view.s > 1 ? "none" : "pan-y" }}
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {clusters.map((c) => {
        if (c.items.length > 1) {
          return (
            <div key={`cluster-${c.items.map((x) => x.i).join("-")}`} className={styles.pin} style={{ left: c.x, top: c.y }}>
              <ClusterPin count={c.items.length} label={`${c.items.length} places: zoom in`} onClick={() => expandCluster(c.items)} />
            </div>
          );
        }
        const { v, i } = c.items[0];
        return (
          <button
            key={`${v.n}-${i}`}
            type="button"
            className={styles.pin}
            style={{ left: c.x, top: c.y }}
            aria-label={v.n}
            onClick={(e) => onSelect(v, e.nativeEvent)}
          >
            <MapPin Icon={catIcon(v.cat)} color={catColor(v.cat)} active={false} />
          </button>
        );
      })}
      {selected && selPos && (
        <button
          type="button"
          className={styles.pin}
          style={{ left: selPos.x, top: selPos.y }}
          aria-label={selected.n}
          onClick={(e) => onSelect(selected, e.nativeEvent)}
        >
          <MapPin Icon={catIcon(selected.cat)} color={catColor(selected.cat)} active />
        </button>
      )}
      {selected && selPos && (
        <div className={styles.cardAnchor} style={{ left: selPos.x, top: selPos.y }}>
          <VenueCard venue={selected} map={null} mapContainerEl={containerRef.current} onClose={onClose} />
        </div>
      )}
      <div className={styles.zoomCtl} data-map-ctl>
        <button type="button" aria-label="Zoom in" disabled={view.s >= MAX_SCALE} onClick={() => zoomAround(size.w / 2, size.h / 2, 2)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" disabled={view.s <= 1} onClick={() => zoomAround(size.w / 2, size.h / 2, 0.5)}>
          −
        </button>
      </div>
    </div>
  );
}
