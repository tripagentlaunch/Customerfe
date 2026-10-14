import { useEffect, useState } from "react";
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
