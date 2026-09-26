import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useAdvisorHref } from "../../lib/advisor";
import { useTripSummary } from "../../lib/tripState";
import { useTripDrawer } from "../../lib/tripDrawer";
import { useSignInModal } from "../../lib/signInModal";
import { useNavMenu } from "../../lib/navMenu";
import { DiscoverMega, PlanMega } from "./HeaderMegaMenus";

// Ported from js/shell.js's header build (~line 60-80) — the real,
// currently-live header. The previous Header.tsx had extracted the empty
// pre-shell.js <nav> skeleton from index.html's source, which shell.js
// replaces at runtime on every page that loads it (416/436 static pages);
// that markup was dead code, never actually seen by a visitor. This is the
// structure real visitors get today. css/site.css's .ta-hd rules (added
// 2026-07-07) apply with zero new CSS.
const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="11" cy="11" r="7" />
    <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
  </svg>
);

export function Header() {
  const { signedIn, authError, clearAuthError } = useAuth();
  const advisor = useAdvisorHref();
  const tripSummary = useTripSummary();
  const tripDrawer = useTripDrawer();
  const signInModal = useSignInModal();
  const { menuOpen, openRoom, toggleMenu, toggleRoom } = useNavMenu();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const headerRef = useRef<HTMLElement>(null);

  // Auto-hiding header: peeks open on page load, then slides away; after
  // that it only reappears on hover from the top edge (or while a mega
  // menu / the mobile menu is open, so interacting with it never gets cut
  // off mid-use).
  const [initialPeek, setInitialPeek] = useState(true);
  const [hovering, setHovering] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setInitialPeek(false), 1500);
    return () => clearTimeout(t);
  }, []);
  const headerVisible = initialPeek || hovering || menuOpen || openRoom !== null;

  // A magic-link click can complete a Supabase session with no linked
  // site_members row (see auth.tsx's hydrate()) — that happens on a full
  // page load with no modal open to show an inline error in, so surface it
  // here by reopening the sign-in modal with the same copy the typed-code
  // path shows inline.
  useEffect(() => {
    if (authError === "not_invited") {
      signInModal.open("This email isn't on the invitation list — please speak to your advisor.");
      clearAuthError();
    }
  }, [authError, clearAuthError, signInModal]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (headerRef.current && !headerRef.current.contains(e.target)) toggleRoom(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        toggleRoom(null);
        tripDrawer.close();
      }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tripDrawer, toggleRoom]);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <>
      <div className="ta-hd-edge" onMouseEnter={() => setHovering(true)} />
      <header
        ref={headerRef}
        className={`ta-hd${headerVisible ? " ta-hd-visible" : ""}${menuOpen ? " menu-open" : ""}`}
        data-shell
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
      <div className="ta-hd-top">
        <Link className="ta-hd-brand" to="/">
          <svg className="mk" width="24" height="24" viewBox="0 0 420 420" fill="none">
            <g strokeWidth={26} strokeLinecap="round" strokeLinejoin="round">
              <path d="M140,150 L280,150" />
              <path d="M210,150 L210,212" />
              <path d="M140,300 L210,212 L280,300" />
              <path d="M174,256 L246,256" />
            </g>
          </svg>
          <span>TripAgent</span>
        </Link>

        <form className="ta-hd-search" role="search" onSubmit={submitSearch}>
          {SEARCH_ICON}
          <input
            type="search"
            name="q"
            className="ta-hd-q"
            placeholder="Search a city, a hotel, a month…"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="ta-hd-cluster">
          {signedIn ? (
            <Link className="ta-hd-year" to="/portal">
              My Year
            </Link>
          ) : (
            <button
              type="button"
              className="ta-hd-year"
              style={{ background: "none", border: 0, padding: 0, fontFamily: "inherit", cursor: "pointer" }}
              onClick={() => signInModal.open("Sign in to your year.")}
            >
              Sign in
            </button>
          )}
          {signedIn ? (
            // Same gating ReferPage.tsx itself already enforces (a
            // signed-out visitor lands there and just gets its own inline
            // "Sign in to refer a friend" prompt) — this is a discoverable
            // entry point for members who are already signed in, not a
            // second auth check. .ta-hd-refer (site.css) gives it its own
            // small premium outlined-pill treatment (burgundy signature
            // accent, fills on hover) instead of reusing .ta-hd-year's
            // plain text-link look, including that class's own
            // mobile-hide rule — see the note on MobileTabbar.tsx below
            // for why that's a real gap.
            <Link className="ta-hd-refer" to="/refer">
              Refer a friend
            </Link>
          ) : (
            // Signed-out visitors get the same pill, different label —
            // still routes to /refer, which itself shows the sign-in
            // prompt. This makes the feature discoverable before signing
            // in, instead of only appearing once already signed in.
            <Link className="ta-hd-refer" to="/refer">
              Invite a Friend
            </Link>
          )}
          <button className="ta-hd-trip" type="button" onClick={() => tripDrawer.open()}>
            <span className="dia">◆</span> <span className="lbl">My Trip</span>{" "}
            <span className="ct" hidden={!tripSummary}>
              {tripSummary?.count ?? 0}
            </span>
          </button>
          <a className="ta-hd-adv" href={advisor.href} target={advisor.external ? "_blank" : undefined} rel={advisor.external ? "noopener" : undefined}>
            Talk to your advisor
          </a>
        </div>

        <button
          type="button"
          className="ta-hd-burger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className="ta-hd-nav" aria-label="Sections">
        <div className={`ta-room ta-room-rich${openRoom === "discover" ? " pin" : ""}`}>
          <button type="button" className="ta-room-t" onClick={() => toggleRoom("discover")}>
            Discover <span className="car" />
          </button>
          <DiscoverMega />
        </div>
        <div className={`ta-room ta-room-rich${openRoom === "plan" ? " pin" : ""}`}>
          <button type="button" className="ta-room-t" onClick={() => toggleRoom("plan")}>
            Plan <span className="car" />
          </button>
          <PlanMega />
        </div>
      </nav>
      </header>
    </>
  );
}
