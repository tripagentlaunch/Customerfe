import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAdvisorHref } from "../../lib/advisor";
import { TaraAI } from "../TaraAI";

// Ported from js/site.js's EXPERT HANDOFF block — the fixed, page-context-
// aware floating "Talk to your advisor" button, present on (almost) every
// page. Styled by css/site.css's .ta-advisor rules (see the "one look"
// block at the end of that file).
export function AdvisorButton() {
  const advisor = useAdvisorHref();
  const { pathname } = useLocation();

  // One look everywhere (2026-10-13, direct request): it used to turn pink
  // over dark sections and black elsewhere, which read as a glitch. Past
  // the first screen it shrinks to a round icon so it covers less of the
  // page; hovering it, or being back near the top, shows the label again.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      setCompact(window.scrollY > window.innerHeight * 0.6);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
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
      className={`ta-advisor${compact ? " ta-advisor-compact" : ""}`}
      aria-label="Talk to Tara AI"
      href={advisor.href}
      target={advisor.external ? "_blank" : "_self"}
      rel="noopener"
    >
      <span className="ta-advisor-inner">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.7}>
          <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
        <span className="ta-advisor-label">
          Talk to <TaraAI />
        </span>
      </span>
    </a>
  );
}
