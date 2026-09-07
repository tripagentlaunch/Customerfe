import { useAdvisorHref } from "../../lib/advisor";

// Ported from js/site.js's EXPERT HANDOFF block — the fixed, page-context-
// aware floating "Talk to your advisor" button, present on (almost) every
// page. css/site.css's .ta-advisor rules apply with zero new CSS.
export function AdvisorButton() {
  const advisor = useAdvisorHref();

  return (
    <a className="ta-advisor" aria-label="Talk to your advisor" href={advisor.href} target={advisor.external ? "_blank" : "_self"} rel="noopener">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
      <span>Talk to your advisor</span>
    </a>
  );
}
