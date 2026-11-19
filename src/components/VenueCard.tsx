import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CityMapVenue } from "../types/city";
import styles from "./VenueCard.module.css";
import { addItem, removeItem, useInTrip } from "../lib/tripState";
import { flyToTrip } from "../lib/flyToTrip";

const MOBILE_QUERY = "(max-width: 640px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const GAP = 14; // px between the marker point and the floating card
const EDGE_PAD = 10; // px keep-out from the map container's edges
// From the pin's centre to the card's edge: the pin is a circle up to ~38px across when highlighted, so the
// card keeps clear of all of it (a card over its own pin closed under the pointer).
const CLEAR = 26;
const CONTROLS_CLEAR = 64; // px kept free on the right for the map's zoom / full-screen buttons

type VAlign = "above" | "below";
type HAlign = "center" | "left" | "right";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// Map has no public getProjection() (only OverlayViews get one). For the
// small nudges needed to bring a floating card fully into view, a linear
// interpolation across the current viewport bounds is accurate enough — this
// is a UI convenience pan, not a geodesy calculation.
function panMapBy(map: google.maps.Map, dx: number, dy: number, reducedMotion: boolean) {
  if (!dx && !dy) return;
  if (!reducedMotion) {
    map.panBy(dx, dy);
    return;
  }
  const bounds = map.getBounds();
  const center = map.getCenter();
  const div = map.getDiv();
  if (!bounds || !center || !div) {
    map.panBy(dx, dy);
    return;
  }
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const w = div.clientWidth || 1;
  const h = div.clientHeight || 1;
  const lngPerPx = (ne.lng() - sw.lng()) / w;
  const latPerPx = (ne.lat() - sw.lat()) / h;
  map.setCenter({
    lat: center.lat() - dy * latPerPx,
    lng: center.lng() + dx * lngPerPx,
  });
}

interface VenueCardProps {
  venue: CityMapVenue;
  map: google.maps.Map | null;
  mapContainerEl: HTMLDivElement | null;
  onClose: () => void;
  isLoadingPhoto?: boolean;
  /** The city the map is of: when given, the card has the guide's "Add to trip" button (2026-11-19). */
  trip?: { city: string; cityLabel?: string };
  /** Desktop hover: the map keeps the card open while the pointer is on it. */
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

// The same trip entry as the guide card of this place ("<city>:<section>:<name>"), so adding it on the
// map ticks it in the guide too, and the other way round.
function tripRef(city: string, venue: CityMapVenue) {
  return `${city}:${venue.cat}:${venue.n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

// "Add to trip" on the map's card (2026-11-19, direct request): the guide card's square "+" that opens
// sideways on hover, and the same flight of the photo into the tray below.
function TripButton({ venue, trip, onPhoto }: { venue: CityMapVenue; trip: { city: string; cityLabel?: string }; onPhoto: boolean }) {
  const ref = tripRef(trip.city, venue);
  const inTrip = useInTrip(ref);
  const label = inTrip ? "In your trip" : "Add to trip";
  return (
    <button
      type="button"
      className={`${styles.tripBtn}${onPhoto ? "" : ` ${styles.tripBtnText}`}${inTrip ? ` ${styles.tripIn}` : ""}`}
      aria-pressed={inTrip}
      aria-label={inTrip ? "Remove from your trip" : "Add to your trip"}
      onClick={(e) => {
        e.stopPropagation();
        if (inTrip) {
          removeItem(ref);
          return;
        }
        flyToTrip(e.currentTarget);
        addItem(trip.city, trip.cityLabel, {
          ref, kind: venue.cat === "stay" ? "hotel" : venue.cat === "party" ? "event" : "experience",
          title: venue.n, section: venue.cat, area: venue.a || null, photo: venue.photos?.[0]?.url ?? null,
        });
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {inTrip ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
      <span className={styles.tripBtnLbl}>{label}</span>
    </button>
  );
}

export default function VenueCard({ venue, map, mapContainerEl, onClose, isLoadingPhoto = false, trip, onPointerEnter, onPointerLeave }: VenueCardProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  const photos = useMemo(() => (venue.photos ?? []).filter((p) => p.url), [venue.photos]);
  const hasPhotos = photos.length > 0;

  const [index, setIndex] = useState(0);
  const [valign, setValign] = useState<VAlign>("above");
  const [halign, setHalign] = useState<HAlign>("center");

  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const settledRef = useRef(false);
  // A marker vertically centered in a short map can overflow BOTH "above"
  // and "below" (card taller than either half). Without a cap, the flip
  // logic below would ping-pong between them forever. At most one flip per
  // axis, then accept whatever's left over to the pan-into-view step.
  const valignFlippedRef = useRef(false);
  const halignFlippedRef = useRef(false);
  const autofocusedRef = useRef(false);
  // Google's OverlayView positions its pane asynchronously, outside React's
  // render/commit cycle — a useLayoutEffect can fire before that pane has a
  // real position, measuring a zero-size box. Retry every frame until the
  // card actually has laid-out dimensions before trusting any measurement.
  const [measureTick, setMeasureTick] = useState(0);

  // Reset per-venue state (carousel position, placement guess) whenever a
  // different venue opens — keyed via the effect dep, not a remount, so the
  // card doesn't flash/unmount between two different venues.
  useLayoutEffect(() => {
    setIndex(0);
    setValign("above");
    setHalign("center");
    setMeasureTick(0);
    settledRef.current = false;
    valignFlippedRef.current = false;
    halignFlippedRef.current = false;
    autofocusedRef.current = false;
  }, [venue.n, venue.lat, venue.lon]);

  // Where the card sits, worked out from scratch each time (2026-11-19, direct request: never cut off):
  // the pin's point, the card's size and the map's box. Above the pin when it fits whole there, else
  // below, else beside the pin (right or left, whichever has room), moved up or down to stay inside the
  // map. Only a card bigger than the map itself is left to the pan below. Offsets are from the pin.
  const [spot, setSpot] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (isMobile) {
      settledRef.current = true;
      return;
    }
    if (settledRef.current) return;
    const card = cardRef.current;
    const mapEl = mapContainerEl;
    const pinEl = card?.parentElement;
    if (!card || !mapEl || !pinEl) return;

    const cardRect = card.getBoundingClientRect();
    if (cardRect.width === 0 && cardRect.height === 0) {
      const raf = requestAnimationFrame(() => setMeasureTick((t) => t + 1));
      return () => cancelAnimationFrame(raf);
    }
    // In Google's own fullscreen mode the map's inner div fills the screen while mapEl keeps its small
    // layout box: measure against the fullscreen element whenever the card is inside it.
    const fsEl = document.fullscreenElement;
    const m = (fsEl && fsEl.contains(card) ? fsEl : mapEl).getBoundingClientRect();
    const pin = pinEl.getBoundingClientRect();
    const px = pin.left, py = pin.top;
    const w = cardRect.width, h = cardRect.height;
    // The right edge keeps clear of the map's zoom and full-screen buttons (desktop: halfway down the right).
    const top = m.top + EDGE_PAD, bottom = m.bottom - EDGE_PAD, left = m.left + EDGE_PAD, right = m.right - (map ? CONTROLS_CLEAR : EDGE_PAD);
    const clampX = (x: number) => Math.min(Math.max(x, left), Math.max(left, right - w));
    const clampY = (y: number) => Math.min(Math.max(y, top), Math.max(top, bottom - h));

    let x: number, y: number, v: VAlign, hz: HAlign;
    if (py - CLEAR - h >= top) {                       // above, whole
      v = "above"; y = py - CLEAR - h; x = clampX(px - w / 2);
    } else if (py + CLEAR + h <= bottom) {             // below, whole
      v = "below"; y = py + CLEAR; x = clampX(px - w / 2);
    } else {                                         // beside the pin
      v = "above";
      const roomRight = right - (px + CLEAR), roomLeft = px - CLEAR - left;
      x = roomRight >= w || roomRight >= roomLeft ? px + CLEAR : px - CLEAR - w;
      x = clampX(x);
      y = clampY(py - h / 2);
    }
    hz = Math.abs(x - (px - w / 2)) < 1 ? "center" : x > px - w / 2 ? "left" : "right";
    settledRef.current = true;
    const next = { top: Math.round(y - py), left: Math.round(x - px) };
    if (!spot || spot.top !== next.top || spot.left !== next.left) setSpot(next);
    if (v !== valign) setValign(v);
    if (hz !== halign) setHalign(hz);

    // Only a card larger than the map can still overflow: pan the map to show as much as possible.
    const dy = y < top ? y - top : y + h > bottom && h <= bottom - top ? y + h - bottom : 0;
    const dx = x < left ? x - left : x + w > right && w <= right - left ? x + w - right : 0;
    if ((dx || dy) && map) panMapBy(map, dx, dy, reducedMotion);
  }, [isMobile, mapContainerEl, map, reducedMotion, venue.n, measureTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // The card can change size after it is placed: its photo arrives after the text (a live lookup), or the
  // image loads in. It used to keep the side it chose for the smaller card and grow up past the map's top
  // edge, cutting the photo off (2026-11-19, direct request). Any change of size places it again.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || isMobile || typeof ResizeObserver === "undefined") return;
    // The map itself can change size too: it grows to the screen's height as a place opens from the guide,
    // which moves the pin under the card.
    const sizes = new Map<Element, string>();
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const e of entries) {
        const r = e.target.getBoundingClientRect();
        const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
        if (sizes.has(e.target) && sizes.get(e.target) !== key) changed = true;
        sizes.set(e.target, key);
      }
      if (!changed) return;
      settledRef.current = false;
      valignFlippedRef.current = false;
      halignFlippedRef.current = false;
      setMeasureTick((t) => t + 1);
    });
    ro.observe(el);
    if (mapContainerEl) ro.observe(mapContainerEl);
    return () => ro.disconnect();
  }, [isMobile, venue.n, mapContainerEl]);

  // The photo arriving changes the card's height in the same render the observer above would restart on,
  // so it is placed again here too (otherwise it grew over its own pin and closed under the pointer).
  const firstPhotoRender = useRef(true);
  useLayoutEffect(() => {
    if (firstPhotoRender.current) { firstPhotoRender.current = false; return; }
    settledRef.current = false;
    valignFlippedRef.current = false;
    halignFlippedRef.current = false;
    setMeasureTick((t) => t + 1);
  }, [hasPhotos, isLoadingPhoto]);

  // The map pans to the place as the card opens (and the page may still be scrolling to the map), so the
  // pin moves under a card that was placed for where it was. For the first few seconds, once the pin has
  // come to rest somewhere new, the card is placed again; and on the map's own "idle" after a move.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || isMobile || !mapContainerEl) return;
    const pinAt = () => {
      const a = (el.parentElement ?? el).getBoundingClientRect();
      const m = mapContainerEl.getBoundingClientRect();
      return { x: Math.round(a.left - m.left), y: Math.round(a.top - m.top) };
    };
    const replace = () => {
      settledRef.current = false;
      valignFlippedRef.current = false;
      halignFlippedRef.current = false;
      setMeasureTick((t) => t + 1);
    };
    let placedAt = pinAt();
    let last = placedAt;
    let still = 0;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const now = pinAt();
      still = now.x === last.x && now.y === last.y ? still + 1 : 0;
      last = now;
      if (still >= 2 && (Math.abs(now.x - placedAt.x) > 2 || Math.abs(now.y - placedAt.y) > 2)) {
        placedAt = now;
        replace();
      }
      if (Date.now() - started > 4000) window.clearInterval(timer);
    }, 90);
    const idle = map?.addListener?.("idle", () => {
      const now = pinAt();
      if (Math.abs(now.x - placedAt.x) > 2 || Math.abs(now.y - placedAt.y) > 2) {
        placedAt = now;
        replace();
      }
    });
    return () => {
      window.clearInterval(timer);
      idle?.remove();
    };
  }, [isMobile, mapContainerEl, map, venue.n, venue.lat, venue.lon]);

  // Pointer on the card keeps it open (desktop hover). Listened for on the element itself: Google Maps stops
  // the pointer events bubbling out of its panes, so React's own onPointerEnter/Leave never heard them and
  // the card closed under the pointer.
  const enterRef = useRef(onPointerEnter);
  const leaveRef = useRef(onPointerLeave);
  enterRef.current = onPointerEnter;
  leaveRef.current = onPointerLeave;
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const enter = () => enterRef.current?.();
    const leave = () => leaveRef.current?.();
    // Mouse events, the same family as the pin's onMouseLeave: pointer events fire first, so the card's
    // "stay open" arrived before the pin's "close", which then won.
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, [isMobile]);

  // Prevent swipe/drag/scroll on the card from panning or zooming the map —
  // required on both the desktop (in-pane) card and the mobile portaled one.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !window.google?.maps?.OverlayView) return;
    window.google.maps.OverlayView.preventMapHitsAndGesturesFrom(el);
  }, [isMobile, venue.n]);

  // Autofocus the close button on open — via the same "wait until the card
  // is actually laid out" retry as the positioning effect above (a button
  // inside Google's not-yet-drawn OverlayView pane can silently refuse
  // .focus() calls), and via useLayoutEffect so it wins any race against
  // Google Maps' own internal focus handling on marker click.
  useLayoutEffect(() => {
    if (autofocusedRef.current) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      const raf = requestAnimationFrame(() => setMeasureTick((t) => t + 1));
      return () => cancelAnimationFrame(raf);
    }
    autofocusedRef.current = true;
    closeBtnRef.current?.focus({ preventScroll: true });
  }, [venue.n, measureTick]);

  // A carousel chevron can unmount the instant it's clicked (e.g. "next" at
  // the last photo — that button stops rendering once index reaches the
  // end). If the just-removed button held focus, the browser drops focus to
  // <body>, which is outside the card and silently breaks every further
  // keydown (Esc, arrows, Tab trap) since they're scoped to the card root.
  // Pull focus back onto the always-present close button whenever that
  // happens.
  useEffect(() => {
    if (cardRef.current && !cardRef.current.contains(document.activeElement)) {
      closeBtnRef.current?.focus({ preventScroll: true });
    }
  }, [index]);

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setIndex((i) => Math.min(photos.length - 1, i + 1));
  }

  // Preload the next image so advancing the carousel feels instant.
  useEffect(() => {
    const next = photos[index + 1];
    if (!next) return;
    const img = new Image();
    img.src = next.url;
  }, [index, photos]);

  useEffect(() => {
    const root = cardRef.current;
    if (!root) return;
    const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (hasPhotos && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (hasPhotos && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "Tab") {
        const focusables = Array.from(root!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [hasPhotos, onClose, photos.length]);

  const currentPhoto = hasPhotos ? photos[index] : null;

  const card = (
    <div
      ref={cardRef}
      className={`${styles.card} ${isMobile ? styles.sheet : ""}`}
      data-valign={valign}
      data-halign={halign}
      style={spot && !isMobile ? { top: spot.top, left: spot.left, bottom: "auto", right: "auto", transform: "none" } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={venue.n}

    >
      {hasPhotos ? (
        <div className={styles.imageArea} data-fly-box>
          <img
            key={index}
            src={currentPhoto!.url}
            alt={currentPhoto!.alt ?? venue.n}
            loading={index === 0 ? "eager" : "lazy"}
            className={styles.image}
          />
          {venue.tier && <span className={styles.tierBadge}>{venue.tier}</span>}
          {index > 0 && (
            <button
              type="button"
              className={`${styles.chevron} ${styles.chevronPrev}`}
              onClick={goPrev}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              className={`${styles.chevron} ${styles.chevronNext}`}
              onClick={goNext}
              aria-label="Next photo"
            >
              ›
            </button>
          )}
          {photos.length > 1 && (
            <div className={styles.dots} role="tablist" aria-label="Photo selector">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Photo ${i + 1} of ${photos.length}`}
                  className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
          <button ref={closeBtnRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
          {trip && <TripButton venue={venue} trip={trip} onPhoto />}
        </div>
      ) : (
        <>
          {isLoadingPhoto && (
            <div className={styles.photoLoading}>
              <span className={styles.spinner} />
            </div>
          )}
          <button ref={closeBtnRef} type="button" className={styles.closeTextOnly} onClick={onClose} aria-label="Close">
            ×
          </button>
        </>
      )}

      <div className={hasPhotos ? styles.body : styles.bodyTextOnly}>
        <span className={styles.nameRow}>
          <strong className={styles.name}>{venue.n}</strong>
          {!hasPhotos && venue.tier && <span className={styles.tier}>{venue.tier}</span>}
        </span>
        {venue.a && <span className={styles.area}>{venue.a}</span>}
        {venue.d && <p className={styles.desc}>{venue.d}</p>}
        {currentPhoto?.credit && <span className={styles.credit}>{currentPhoto.credit}</span>}
        {trip && !hasPhotos && <TripButton venue={venue} trip={trip} onPhoto={false} />}
      </div>
    </div>
  );

  if (isMobile) {
    if (!mapContainerEl) return null;
    return createPortal(card, mapContainerEl);
  }

  return (
    <div className={styles.anchor} style={{ "--gap": `${GAP}px` } as React.CSSProperties}>
      {card}
    </div>
  );
}
