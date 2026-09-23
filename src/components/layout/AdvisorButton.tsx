import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAdvisorHref } from "../../lib/advisor";

// Ported from js/site.js's EXPERT HANDOFF block — the fixed, page-context-
// aware floating "Talk to your advisor" button, present on (almost) every
// page. css/site.css's .ta-advisor rules apply with zero new CSS beyond the
// .ta-advisor-on-hero class this component now toggles.
export function AdvisorButton() {
  const advisor = useAdvisorHref();
  const { pathname } = useLocation();

  // Forces the button into its "dark" variant (pink fill — see site.css's
  // .ta-advisor-on-hero override) for as long as the button's OWN top edge
  // still falls within a hero section's vertical span — not "is any part of
  // the hero visible somewhere on screen" (that check was measuring the
  // wrong thing: it kept the button dark for up to a full viewport-height
  // of extra scroll after the button itself had already visually moved
  // onto the lighter section below the hero). Three different class names
  // cover every dark section this applies to: `.hero` (static pages + the
  // homepage carousel), `.city-hero` (CityPage/DestinationPage/ZonePage's
  // shared template — city-page.module.css, applied via :global()), and
  // `.how-it-works-band` (the homepage's dark "How It Works" tabbed
  // section — HowItWorksTabs.tsx).
  //
  // The button's own rect is read via ref rather than re-deriving its
  // fixed `bottom: clamp(...)` offset in JS, so this automatically stays
  // correct through the sub-560px breakpoint where it becomes a circular
  // icon-only button at the same fixed position (site.css).
  //
  // Plain scroll listener + getBoundingClientRect(), not IntersectionObserver:
  // an observer's callbacks are delivered asynchronously (not inside
  // .observe() itself), which under React 18 StrictMode's dev-only
  // double-invoke (mount → cleanup → mount) opened a window for a
  // disconnected observer's stale, in-flight callback to land after the
  // live one and never get corrected. A synchronous rect check on each
  // scroll event has no such queue to race against.
  const [onHero, setOnHero] = useState(false);
  const buttonRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    let raf = 0;
    function measure() {
      raf = 0;
      const button = buttonRef.current;
      if (!button) return;
      const buttonTop = button.getBoundingClientRect().top;
      const heroes = document.querySelectorAll(".hero, .city-hero, .how-it-works-band");
      let found = false;
      heroes.forEach((hero) => {
        const rect = hero.getBoundingClientRect();
        if (buttonTop >= rect.top && buttonTop <= rect.bottom) found = true;
      });
      setOnHero(found);
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  return (
    <a
      ref={buttonRef}
      className={`ta-advisor${onHero ? " ta-advisor-on-hero" : ""}`}
      aria-label="Talk to your advisor"
      href={advisor.href}
      target={advisor.external ? "_blank" : "_self"}
      rel="noopener"
    >
      <span className="ta-advisor-inner">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.7}>
          <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
        <span>Talk to your advisor</span>
      </span>
    </a>
  );
}
