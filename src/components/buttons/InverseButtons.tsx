import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { toRoute } from "../../lib/toRoute";
import styles from "./InverseButtons.module.css";

// "Inverse" = the hairline-outline/solid-fill treatment meant for sitting on
// a dark photo (hero sections), as opposed to the plain on-light `.btn-gold`
// used elsewhere on the page. Extracted from the homepage hero's "Plan Your
// Trip"/"Ask Your Advisor" buttons (and CityPage's identical twins) so both
// places — and anywhere else that needs this exact pair later — share one
// definition: change it here, it changes everywhere it's used.

// Same external/anchor passthrough toRoute() already does internally
// (`#...`, `http...` pass through untouched) — used here to decide between
// a real react-router `<Link>` (SPA-routed internal pages) and a plain `<a>`
// (external URLs, mailto:, tel:, in-page anchors), which a `<Link>` doesn't
// handle correctly. Previously this check didn't exist — CityPage's
// secondary CTA happened to hardcode `<a>` while its primary (and both of
// HeroCarousel's) hardcoded `<Link>`, which only worked by accident of each
// call site's own hrefs; this makes both buttons correct for either case.
function isExternalOrAnchor(href: string): boolean {
  return href.startsWith("#") || href.startsWith("http");
}

interface InverseButtonProps {
  to: string;
  children: ReactNode;
  className?: string;
  // Only meaningful for the external/`<a>` branch (e.g. a WhatsApp deep
  // link opening in a new tab) — ignored for internal `<Link>`s.
  target?: string;
  rel?: string;
}

function InverseLink({ to, children, className, target, rel }: InverseButtonProps) {
  if (isExternalOrAnchor(to)) {
    return (
      <a className={className} href={to} target={target} rel={rel}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={toRoute(to)}>
      {children}
    </Link>
  );
}

// Primary: solid white fill, dark text, unchanged on hover — only the label
// scales up. Template: "Plan Your Trip" (homepage hero) / the city hero's
// primary CTA.
export function PrimaryInverseButton({ to, children, className, target, rel }: InverseButtonProps) {
  return (
    <InverseLink
      to={to}
      target={target}
      rel={rel}
      className={`btn btn-gold on-dark btn-square ${styles.primary} ${className ?? ""}`.trim()}
    >
      <span className={styles.label}>{children}</span>
    </InverseLink>
  );
}

// Secondary: ghost outline, no fill override of its own — relies on the
// shared `.btn-ghost.on-dark`'s own fill-on-hover; only adds the
// label-scale hover on top of it. Template: "Ask Your Advisor".
export function SecondaryInverseButton({ to, children, className, target, rel }: InverseButtonProps) {
  return (
    <InverseLink
      to={to}
      target={target}
      rel={rel}
      className={`btn btn-ghost on-dark ${styles.secondary} ${className ?? ""}`.trim()}
    >
      <span className={styles.label}>{children}</span>
    </InverseLink>
  );
}
