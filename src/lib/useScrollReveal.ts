import { useEffect } from "react";

// css/site.css ships `.reveal`/`.reveal-clip` at opacity:0 until a `.in`
// class is added; on the static site js/site.js does that via an
// IntersectionObserver as the visitor scrolls. Ported pages don't load that
// script, so without this every `.reveal` element stays invisible forever.
// This is the minimal equivalent (observe + add `.in`, no stagger
// choreography) — a page-agnostic hook so every future ported page gets it
// by calling it once, not just CityPage.
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    const targets = document.querySelectorAll(".reveal:not(.in), .reveal-clip:not(.in)");
    if (targets.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }

    // A fixed 14% threshold can never be reached by an element taller than
    // ~7x the viewport (e.g. /cities' results block, ~10,000px: at most ~7%
    // of it can ever be on screen), so such elements stayed at opacity:0
    // forever. Reveal once EITHER 14% of the element OR 30% of the viewport's
    // height is inside it, and fire at fine-grained steps so tall elements
    // actually get a callback at that point.
    const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rootH = entry.rootBounds?.height ?? window.innerHeight;
          const enough = entry.intersectionRatio >= 0.14 || entry.intersectionRect.height >= rootH * 0.3;
          if (entry.isIntersecting && enough) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: thresholds }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
