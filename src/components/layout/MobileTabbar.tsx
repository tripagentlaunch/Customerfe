import { useNavMenu } from "../../lib/navMenu";
import { useTripDrawer } from "../../lib/tripDrawer";
import { useTripSummary } from "../../lib/tripState";
import { useAdvisorHref } from "../../lib/advisor";

// Ported from js/shell.js's mobile bottom tab-bar — Discover · Plan · My
// Trip · Advisor, thumb-reach on every screen <900px (css/site.css's
// .ta-tabbar rules already hide this above that breakpoint).
export function MobileTabbar() {
  const { openMenuWithRoom } = useNavMenu();
  const tripDrawer = useTripDrawer();
  const tripSummary = useTripSummary();
  const advisor = useAdvisorHref();

  return (
    <nav className="ta-tabbar" aria-label="Quick actions">
      <button type="button" onClick={() => openMenuWithRoom("discover")}>
        Discover
      </button>
      <button type="button" onClick={() => openMenuWithRoom("plan")}>
        Plan
      </button>
      <button type="button" onClick={() => tripDrawer.open()}>
        <span className="tct" hidden={!tripSummary}>
          {tripSummary?.count ?? 0}
        </span>
        My&nbsp;Trip
      </button>
      <a href={advisor.href} target={advisor.external ? "_blank" : undefined} rel={advisor.external ? "noopener" : undefined}>
        Advisor
      </a>
    </nav>
  );
}
