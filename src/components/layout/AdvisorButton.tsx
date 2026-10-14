import { useAdvisorHref } from "../../lib/advisor";
import { TaraAI } from "../TaraAI";

// Ported from js/site.js's EXPERT HANDOFF block — the fixed, page-context-
// aware floating "Talk to your advisor" button, present on (almost) every
// page. Styled by css/site.css's .ta-advisor rules (see the "one look"
// block at the end of that file).
export function AdvisorButton() {
  const advisor = useAdvisorHref();

  // Always the compact icon (2026-10-14, direct request): as a wide pill,
  // or even as an icon at the old size and offset, it sat over text near
  // the right edge (the "How it works" copy, the footer). The label opens
  // on hover/focus; site.css sizes and places it inside the page margin.
  return (
    <a
      className="ta-advisor ta-advisor-compact"
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
