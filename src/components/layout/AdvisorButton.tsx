import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAdvisorHref } from "../../lib/advisor";
import { useIsMobile } from "../../hooks/useIsMobile";
import { TaraAI } from "../TaraAI";

// Ported from js/site.js's EXPERT HANDOFF block — the fixed, page-context-
// aware floating "Talk to your advisor" button, present on (almost) every
// page. Styled by css/site.css's .ta-advisor rules (see the "one look"
// block at the end of that file).
export function AdvisorButton() {
  const advisor = useAdvisorHref();

  // Desktop: always the compact icon (2026-10-14, direct request) — as a
  // wide pill it sat over text near the right edge; the label opens on
  // hover/focus and site.css keeps it inside the page margin.
  // Phone (<=900px, mobile handoff): loads as the icon, opens to show its
  // label after 0.5s, holds it for 5s, then settles back to the icon.
  const isMobile = useIsMobile(900);
  const [phoneCompact, setPhoneCompact] = useState(true);
  useEffect(() => {
    if (!isMobile) return;
    setPhoneCompact(true);
    const open = window.setTimeout(() => setPhoneCompact(false), 500);
    const close = window.setTimeout(() => setPhoneCompact(true), 5500);
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(close);
    };
  }, [isMobile]);
  const compact = !isMobile || phoneCompact;

  // Phone: step out of the way while a form or the footer is on screen — it
  // sat on top of the "Email Tara" button at the end of the enquiry form.
  const { pathname } = useLocation();
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (!isMobile) {
      setAway(false);
      return;
    }
    let raf = 0;
    const check = () => {
      raf = 0;
      const vh = window.innerHeight;
      const hit = Array.from(document.querySelectorAll("main form:not([role=search]), footer.footer")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.top < vh && r.bottom > 0;
      });
      setAway(hit);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    // Pages render their forms a moment after the route changes.
    const settle = window.setTimeout(queue, 300);
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile, pathname]);

  // Phone: faint while the page is scrolling down (so it doesn't sit solid over
  // the text being read), back to normal on scroll up or once scrolling stops.
  const [dim, setDim] = useState(false);
  useEffect(() => {
    if (!isMobile) {
      setDim(false);
      return;
    }
    let lastY = window.scrollY;
    let idle = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      if (Math.abs(dy) < 4) return;
      lastY = y;
      window.clearTimeout(idle);
      if (dy > 0 && y > 80) {
        setDim(true);
        idle = window.setTimeout(() => setDim(false), 700);
      } else {
        setDim(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
    };
  }, [isMobile]);

  return (
    <a
      className={`ta-advisor${compact ? " ta-advisor-compact" : ""}${away ? " ta-advisor-away" : ""}${dim ? " ta-advisor-dim" : ""}`}
      aria-label="Talk to Tara AI"
      tabIndex={away ? -1 : undefined}
      aria-hidden={away || undefined}
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
