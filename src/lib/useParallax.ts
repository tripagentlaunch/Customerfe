import { useEffect } from "react";

// Scroll-linked parallax drift for every [data-parallax] element under
// `rootSelector` — ported from ExoticPage.tsx's useExoticMotion (just the
// [data-parallax]/--py part; this page has no sticky chapter bar or
// --hero hero-exit logic to carry over). Each element's --py is its
// parent's offset from the viewport's centre times its own `data-parallax`
// speed; one rAF per scroll frame, nothing under reduced motion.
export function useParallax(rootSelector: string) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    if (layers.length === 0) return;

    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of layers) {
        const r = el.parentElement!.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const speed = Number(el.dataset.parallax) || 0.2;
        el.style.setProperty("--py", `${((r.top + r.height / 2 - vh / 2) * -speed).toFixed(1)}px`);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootSelector]);
}
