import { useEffect, useRef } from "react";
import type { RefObject } from "react";

// Moves a map by itself while a mouse pointer rests near one of its edges: the
// cursor going to the left edge slides the view left, the right edge slides it
// right, and the same for top and bottom. The closer to the edge, the faster.
//
// Mouse only — a finger drags the map directly, so touch and pen are ignored.
// It never fights what the visitor is doing: no panning while a button is held
// (a drag), while the pointer is over a pin, card or map control, or while
// `enabled` is false (a card is open). A short pause before it starts means a
// pointer that just crosses an edge on its way past doesn't nudge the map.
//
// `pan(dx, dy)` moves the VIEW by that many px (negative dx = towards the left).
// While it runs the container gets data-edge-pan="left top ..." so CSS can show
// which edge is moving.
const START_DELAY_MS = 220;
const MAX_SPEED_PX_PER_S = 560;
const EDGE_MIN_PX = 56;
const EDGE_MAX_PX = 120;
const EDGE_SHARE = 0.14;
const IGNORE = 'button, a, input, [role="dialog"], [data-map-ctl], .gm-bundled-control, .gm-fullscreen-control';

const edgeSize = (len: number) => Math.min(EDGE_MAX_PX, Math.max(EDGE_MIN_PX, len * EDGE_SHARE));
// 0 at the inner border of the edge band, 1 at the very edge; eased so it starts gently.
const strength = (depth: number, size: number) => {
  const t = Math.min(1, Math.max(0, depth / size));
  return t * t;
};

export function useEdgePan(
  ref: RefObject<HTMLElement | null>,
  pan: (dx: number, dy: number) => void,
  enabled: boolean,
  /** Px at the top of the window that are covered (the fixed site header), if any. */
  topCover: () => number = () => 0
) {
  // The latest pan callback, so the listeners below needn't be re-attached every render.
  const panRef = useRef(pan);
  panRef.current = pan;
  const coverRef = useRef(topCover);
  coverRef.current = topCover;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let startTimer = 0;
    let last = 0;

    const velocity = () => {
      if (!pointer) return { vx: 0, vy: 0 };
      // Only the part of the map that can actually be pointed at counts: inside
      // the window and below anything fixed over its top.
      const b = el.getBoundingClientRect();
      const r = {
        left: Math.max(b.left, 0),
        right: Math.min(b.right, window.innerWidth),
        top: Math.max(b.top, coverRef.current(), 0),
        bottom: Math.min(b.bottom, window.innerHeight),
      };
      const ex = edgeSize(r.right - r.left);
      const ey = edgeSize(r.bottom - r.top);
      const left = strength(ex - (pointer.x - r.left), ex);
      const right = strength(ex - (r.right - pointer.x), ex);
      const top = strength(ey - (pointer.y - r.top), ey);
      const bottom = strength(ey - (r.bottom - pointer.y), ey);
      return { vx: right - left, vy: bottom - top };
    };

    const label = (vx: number, vy: number) =>
      [vx < 0 ? "left" : vx > 0 ? "right" : "", vy < 0 ? "top" : vy > 0 ? "bottom" : ""].filter(Boolean).join(" ");

    const stop = () => {
      window.clearTimeout(startTimer);
      startTimer = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      delete el.dataset.edgePan;
    };

    const step = (now: number) => {
      const { vx, vy } = velocity();
      if (!pointer || (!vx && !vy)) {
        stop();
        return;
      }
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      panRef.current(vx * MAX_SPEED_PX_PER_S * dt, vy * MAX_SPEED_PX_PER_S * dt);
      el.dataset.edgePan = label(vx, vy);
      raf = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.buttons !== 0 || (e.target as HTMLElement).closest(IGNORE)) {
        pointer = null;
        stop();
        return;
      }
      pointer = { x: e.clientX, y: e.clientY };
      if (raf || startTimer) return;
      const { vx, vy } = velocity();
      if (!vx && !vy) return;
      startTimer = window.setTimeout(() => {
        startTimer = 0;
        last = 0;
        raf = requestAnimationFrame(step);
      }, START_DELAY_MS);
    };
    const onLeave = () => {
      pointer = null;
      stop();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onLeave);
    el.addEventListener("wheel", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onLeave);
      el.removeEventListener("wheel", onLeave);
      stop();
    };
  }, [ref, enabled]);
}

/** Where the fixed site header (and the invisible strip that reveals it) ends, so
 *  the map's top edge zone sits below it, where the pointer can actually go. */
export const siteHeaderBottom = () =>
  Math.max(
    document.querySelector<HTMLElement>(".ta-hd")?.getBoundingClientRect().bottom ?? 0,
    document.querySelector<HTMLElement>(".ta-hd-edge")?.getBoundingClientRect().bottom ?? 0
  );
