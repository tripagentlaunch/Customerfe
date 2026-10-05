import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useAdvisorHref } from "../../lib/advisor";
import { useTripSummary } from "../../lib/tripState";
import { useTripDrawer } from "../../lib/tripDrawer";
import { useProfileDrawer } from "../../lib/profileDrawer";
import { TaraAI } from "../TaraAI";

// Right-hand Profile sidebar, built on the My Trip drawer's own markup and
// CSS (.ta-cart*, TripDrawer.tsx) so the two feel like one family. Holds
// the links that used to sit loose in the header: My Year, My Trip, Talk to
// Tara AI, Refer a friend, with Sign out pinned to the bottom. Signed-out
// visitors never see this — the header's Profile button opens the sign-in
// modal for them instead.
export function ProfileDrawer() {
  const { isOpen, close, dismiss } = useProfileDrawer();
  const { signedIn, member, logout } = useAuth();
  const advisor = useAdvisorHref();
  const tripSummary = useTripSummary();
  const tripDrawer = useTripDrawer();

  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [isOpen]);

  return (
    <>
      <div className={`ta-cart-scrim${entered ? " on" : ""}`} hidden={!mounted} onClick={dismiss} />
      <aside className={`ta-cart ta-profile${entered ? " on" : ""}`} aria-label="Profile" hidden={!mounted || !signedIn}>
        <div className="ta-cart-h">
          <span className="k">Profile</span>
          {member?.name ? <div className="t">{member.name}</div> : null}
          <button className="ta-cart-x" aria-label="Close" onClick={dismiss}>
            ×
          </button>
        </div>
        <nav className="ta-prof-links" aria-label="Profile">
          <Link className="ta-prof-link" to="/portal" onClick={close}>
            My Year
          </Link>
          <button
            type="button"
            className="ta-prof-link"
            onClick={() => {
              close();
              tripDrawer.open();
            }}
          >
            My Trip
            <span className="ct" hidden={!tripSummary}>
              {tripSummary?.count ?? 0}
            </span>
          </button>
          <a
            className="ta-prof-link"
            href={advisor.href}
            target={advisor.external ? "_blank" : undefined}
            rel={advisor.external ? "noopener" : undefined}
            onClick={close}
          >
            <span>
              Talk to <TaraAI />
            </span>
          </a>
          <Link className="ta-prof-link" to="/refer" onClick={close}>
            Refer a friend
          </Link>
        </nav>
        <div className="ta-prof-foot">
          <button
            type="button"
            className="ta-prof-link ta-prof-out"
            onClick={async () => {
              close();
              await logout();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
