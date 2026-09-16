import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CityMapVenue } from "../types/city";
import styles from "./VenueCard.module.css";

const MOBILE_QUERY = "(max-width: 640px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const GAP = 14; // px between the marker point and the floating card
const EDGE_PAD = 10; // px keep-out from the map container's edges

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
}

export default function VenueCard({ venue, map, mapContainerEl, onClose }: VenueCardProps) {
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

  // Smart positioning: measure the card against the map container, flip
  // vertically/horizontally as needed, converge in at most two passes, then
  // pan the map just enough to bring any remaining overflow into view.
  useLayoutEffect(() => {
    if (isMobile) {
      settledRef.current = true;
      return;
    }
    if (settledRef.current) return;
    const card = cardRef.current;
    const mapEl = mapContainerEl;
    if (!card || !mapEl) return;

    const cardRect = card.getBoundingClientRect();
    if (cardRect.width === 0 && cardRect.height === 0) {
      const raf = requestAnimationFrame(() => setMeasureTick((t) => t + 1));
      return () => cancelAnimationFrame(raf);
    }

    const mapRect = mapEl.getBoundingClientRect();

    let nextValign = valign;
    let nextHalign = halign;

    if (!valignFlippedRef.current) {
      if (valign === "above" && cardRect.top < mapRect.top + EDGE_PAD) {
        nextValign = "below";
        valignFlippedRef.current = true;
      } else if (valign === "below" && cardRect.bottom > mapRect.bottom - EDGE_PAD) {
        nextValign = "above";
        valignFlippedRef.current = true;
      }
    }

    if (!halignFlippedRef.current) {
      if (halign === "center" && cardRect.left < mapRect.left + EDGE_PAD) {
        nextHalign = "left";
        halignFlippedRef.current = true;
      } else if (halign === "center" && cardRect.right > mapRect.right - EDGE_PAD) {
        nextHalign = "right";
        halignFlippedRef.current = true;
      }
    }

    if (nextValign !== valign || nextHalign !== halign) {
      setValign(nextValign);
      setHalign(nextHalign);
      return; // re-measure on the next layout pass with the new placement
    }

    settledRef.current = true;

    // Residual overflow even after the best-fit placement (e.g. the card is
    // simply taller than the map) — pan the map so the whole card is visible.
    const dx =
      cardRect.left < mapRect.left + EDGE_PAD
        ? cardRect.left - (mapRect.left + EDGE_PAD)
        : cardRect.right > mapRect.right - EDGE_PAD
          ? cardRect.right - (mapRect.right - EDGE_PAD)
          : 0;
    const dy =
      cardRect.top < mapRect.top + EDGE_PAD
        ? cardRect.top - (mapRect.top + EDGE_PAD)
        : cardRect.bottom > mapRect.bottom - EDGE_PAD
          ? cardRect.bottom - (mapRect.bottom - EDGE_PAD)
          : 0;
    if ((dx || dy) && map) panMapBy(map, dx, dy, reducedMotion);
  }, [valign, halign, isMobile, mapContainerEl, map, reducedMotion, venue.n, measureTick]);

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
    closeBtnRef.current?.focus();
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
      closeBtnRef.current?.focus();
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
      role="dialog"
      aria-modal="true"
      aria-label={venue.n}
    >
      {hasPhotos ? (
        <div className={styles.imageArea}>
          <img
            key={index}
            src={currentPhoto!.url}
            alt={currentPhoto!.alt ?? venue.n}
            loading={index === 0 ? "eager" : "lazy"}
            className={styles.image}
          />
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
        </div>
      ) : (
        <button ref={closeBtnRef} type="button" className={styles.closeTextOnly} onClick={onClose} aria-label="Close">
          ×
        </button>
      )}

      <div className={hasPhotos ? styles.body : styles.bodyTextOnly}>
        <span className={styles.nameRow}>
          <strong className={styles.name}>{venue.n}</strong>
          {venue.tier && <span className={styles.tier}>{venue.tier}</span>}
        </span>
        {venue.a && <span className={styles.area}>{venue.a}</span>}
        {venue.d && <p className={styles.desc}>{venue.d}</p>}
        {currentPhoto?.credit && <span className={styles.credit}>{currentPhoto.credit}</span>}
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
