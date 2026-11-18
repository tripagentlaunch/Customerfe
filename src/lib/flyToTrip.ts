// "Add to trip" flight (2026-11-18, direct request): like a file going into the Mac Dock, a copy of the
// card's photo lifts off, arcs across the screen, shrinks and lands on the tray's count box. The tray
// (components/TripBar.tsx) listens for the events below: its number ticks up and the bar gives a small
// bump when the photo lands. Nothing here touches the trip itself; the caller adds the item as before.

export const TRIP_FLY_EVENT = "ta-trip-fly";
export type TripFlyDetail = { phase: "start" | "land"; reduced?: boolean };

const FLY_MS = 720;
const STEPS = 24;

const emit = (detail: TripFlyDetail) => window.dispatchEvent(new CustomEvent<TripFlyDetail>(TRIP_FLY_EVENT, { detail }));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// The photo inside a card: an <img>, or a CSS background (the phone sheet's photo).
function photoOf(box: Element): string | null {
  const img = box instanceof HTMLImageElement ? box : box.querySelector("img");
  const src = img?.currentSrc || img?.src;
  if (src) return src;
  const m = /url\((['"]?)(.*?)\1\)/.exec(getComputedStyle(box).backgroundImage || "");
  return m ? m[2] : null;
}

// `from` is the button that was pressed. The flight starts from the card's photo box (marked with
// data-fly-box); a card with no photo flies a small dark square from the button itself.
export function flyToTrip(from: Element) {
  if (typeof document === "undefined") return;
  const box = from.closest("[data-fly-box]") ?? from.closest('[role="dialog"]')?.querySelector("[data-fly-box]") ?? from;
  const r = box.getBoundingClientRect();
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  emit({ phase: "start" });
  if (reduced || !r.width || !r.height || typeof Element.prototype.animate !== "function") {
    requestAnimationFrame(() => emit({ phase: "land", reduced: true }));
    return;
  }

  const src = box === from ? null : photoOf(box);
  const side = Math.max(28, Math.min(r.width, r.height)); // the photo, cropped to a square
  const cx0 = r.left + r.width / 2;
  const cy0 = r.top + r.height / 2;

  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${side}px`,
    height: `${side}px`,
    zIndex: "100000",
    pointerEvents: "none",
    transformOrigin: "0 0",
    willChange: "transform, opacity",
    background: src ? `center / cover no-repeat url("${src}")` : "#1a1714",
    border: "2px solid #fff",
    boxSizing: "border-box",
    boxShadow: "0 6px 18px rgba(0,0,0,.28)",
    transform: `translate(${cx0 - side / 2}px, ${cy0 - side / 2}px)`,
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.remove();
    emit({ phase: "land" });
  };

  // Waits a couple of frames: on the very first add the tray mounts only after the item is added.
  let tries = 0;
  const go = () => {
    const target = document.querySelector<HTMLElement>("[data-trip-count]");
    if (!target && tries++ < 8) return void requestAnimationFrame(go);
    const t = target?.getBoundingClientRect();
    const cx2 = t ? t.left + t.width / 2 : window.innerWidth / 2;
    const cy2 = t ? t.top + t.height / 2 : window.innerHeight - 40;
    const endScale = (t ? Math.min(t.width, t.height) : 24) / side;
    // A curve that lifts up before dropping into the tray, so it reads as thrown, not slid.
    const px = (cx0 + cx2) / 2;
    const py = Math.min(cy0, cy2) - 70;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const u = i / STEPS;
      const e = ease(u);
      const x = (1 - e) * (1 - e) * cx0 + 2 * (1 - e) * e * px + e * e * cx2;
      const y = (1 - e) * (1 - e) * cy0 + 2 * (1 - e) * e * py + e * e * cy2;
      const s = 1 + (endScale - 1) * e;
      frames.push({
        offset: u,
        transform: `translate(${x - (side * s) / 2}px, ${y - (side * s) / 2}px) scale(${s})`,
        opacity: u < 0.9 ? 1 : 1 - (u - 0.9) * 6,
      });
    }
    const anim = el.animate(frames, { duration: FLY_MS, easing: "linear", fill: "forwards" });
    anim.onfinish = finish;
    anim.oncancel = finish;
    window.setTimeout(finish, FLY_MS + 800); // never leave a photo or a lagging count behind
  };
  requestAnimationFrame(() => requestAnimationFrame(go));
}
