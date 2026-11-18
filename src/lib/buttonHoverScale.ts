// Any other button-like link can opt in with a `data-grow` attribute.
// Sitewide button hover (2026-11-13, direct request): the text inside every `.btn` grows a
// little on hover while the button itself stays fixed, like the home hero's "Find my trip" /
// "Chat with us" (components/buttons/InverseButtons: an inner label scaled to 1.1).
//
// Most buttons are plain `<Link className="btn …">Label</Link>` with no inner element to
// scale, so the content is wrapped on first hover and put back shortly after the pointer
// leaves. Moving the existing nodes (not copying) keeps React's references valid, and
// unwrapping when idle means a later re-render never finds an unexpected DOM shape.
// The hero pair already has its own label span and is skipped. Mouse devices only.
const CLS = "ta-btn-lbl";

function wrap(btn: HTMLElement) {
  if (btn.querySelector(":scope > ." + CLS)) return;
  if (btn.querySelector(':scope > [class*="label"]')) return; // InverseButtons: has its own
  if (!btn.firstChild) return;
  const span = document.createElement("span");
  span.className = CLS;
  while (btn.firstChild) span.appendChild(btn.firstChild);
  btn.appendChild(span);
  // A freshly inserted element has no "before" style, so if :hover already matched it would
  // appear at the final size (a jump). Paint it at scale(1) first, then switch the grow on.
  void span.offsetWidth;
  window.requestAnimationFrame(() => span.classList.add(CLS + "-go"));
}

function unwrap(btn: HTMLElement) {
  const span = btn.querySelector(":scope > ." + CLS);
  if (!span) return;
  while (span.firstChild) btn.insertBefore(span.firstChild, span);
  span.remove();
}

export function installButtonHoverScale(): () => void {
  if (typeof window === "undefined" || !window.matchMedia("(hover:hover)").matches) return () => {};
  const timers = new WeakMap<HTMLElement, number>();
  const btnOf = (t: EventTarget | null) => (t instanceof Element ? (t.closest(".btn, [data-grow]") as HTMLElement | null) : null);

  const over = (e: MouseEvent) => {
    const btn = btnOf(e.target);
    if (!btn || (btn as HTMLButtonElement).disabled) return;
    const t = timers.get(btn);
    if (t) window.clearTimeout(t);
    wrap(btn);
  };
  const out = (e: MouseEvent) => {
    const btn = btnOf(e.target);
    if (!btn || btn.contains(e.relatedTarget as Node | null)) return;
    const t = window.setTimeout(() => {
      if (!btn.matches(":hover")) unwrap(btn);
    }, 500);
    timers.set(btn, t);
  };
  document.addEventListener("mouseover", over);
  document.addEventListener("mouseout", out);
  return () => {
    document.removeEventListener("mouseover", over);
    document.removeEventListener("mouseout", out);
  };
}
