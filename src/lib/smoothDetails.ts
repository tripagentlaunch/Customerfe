// Smooth open/close for every native <details> accordion on the site (2026-11-16, direct request).
// One document-level listener, so FAQ lists, footer folds and any future <details> animate without touching each page.
// A native <details> jumps because its content is removed from layout when closed. Here the click is intercepted and the
// element's height is animated between its closed and open heights (Web Animations API), then `open` is set or cleared.
// While closing, `data-closing` is set so CSS can flip the + / chevron straight away instead of after the animation.
// Skipped under prefers-reduced-motion (falls back to the native instant toggle).

const DURATION = 320;
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

type Running = { anim: Animation; opening: boolean };
const running = new WeakMap<HTMLDetailsElement, Running>();

function reduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animate(el: HTMLDetailsElement, opening: boolean) {
  const prev = running.get(el);
  // Reverse from wherever a running animation currently is.
  const startHeight = el.getBoundingClientRect().height;
  if (prev) prev.anim.cancel();

  // Measure the other state's height without painting it.
  let endHeight: number;
  if (opening) {
    el.open = true; // stays open from here; the animation grows it from its closed height
    endHeight = el.getBoundingClientRect().height;
  } else {
    const wasOpen = el.open;
    el.open = false;
    endHeight = el.getBoundingClientRect().height;
    el.open = wasOpen;
  }

  el.style.overflow = "hidden";
  el.style.boxSizing = "border-box";
  if (opening) el.removeAttribute("data-closing");
  else el.setAttribute("data-closing", "");

  const anim = el.animate([{ height: `${startHeight}px` }, { height: `${endHeight}px` }], { duration: DURATION, easing: EASE });
  running.set(el, { anim, opening });
  const finish = (cancelled: boolean) => {
    if (running.get(el)?.anim !== anim) return; // superseded by a newer animation
    running.delete(el);
    el.style.overflow = "";
    el.style.boxSizing = "";
    el.removeAttribute("data-closing");
    if (!cancelled) el.open = opening;
  };
  anim.onfinish = () => finish(false);
  anim.oncancel = () => finish(true);
}

export function initSmoothDetails() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const target = e.target as Element | null;
    const summary = target?.closest("summary");
    if (!summary) return;
    const el = summary.parentElement;
    if (!(el instanceof HTMLDetailsElement) || summary !== el.querySelector(":scope > summary")) return;
    if (reduced() || typeof el.animate !== "function") return;
    e.preventDefault();
    const r = running.get(el);
    const opening = r ? !r.opening : !el.open;
    // One open at a time (2026-11-16, direct request): opening an item closes its open siblings (the other <details>
    // in the same list). Items in different containers, such as the footer's separate columns, are left alone.
    if (opening) {
      for (const sib of Array.from(el.parentElement?.children ?? [])) {
        if (sib !== el && sib instanceof HTMLDetailsElement && (sib.open || running.get(sib)?.opening)) animate(sib, false);
      }
    }
    animate(el, opening);
  });
}
