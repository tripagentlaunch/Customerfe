import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useTripDrawer } from "../../lib/tripDrawer";
import { useProfileDrawer } from "../../lib/profileDrawer";
import { useSignInModal } from "../../lib/signInModal";
import { useNavMenu } from "../../lib/navMenu";
import { ExploreMega } from "./HeaderMegaMenus";

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
  const tripDrawer = useTripDrawer();
  const profileDrawer = useProfileDrawer();
  const signInModal = useSignInModal();
  const { menuOpen, openRoom, toggleMenu, toggleRoom } = useNavMenu();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);

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
  // Momentary re-reveal after backing out of the Profile sidebar (cross or
  // click outside) — same duration as the page-load peek above.
  const [sidebarPeek, setSidebarPeek] = useState(false);
  useEffect(() => {
    if (!profileDrawer.peekTick) return;
    setSidebarPeek(true);
    const t = setTimeout(() => setSidebarPeek(false), 1500);
    return () => clearTimeout(t);
  }, [profileDrawer.peekTick]);
  // The invisible reveal strip (.ta-hd-edge, 84px) is taller than the
  // header (64px), so the two together are the "navbar area": hide only
  // once the pointer has left both (the open Explore panel is a DOM child
  // of the header, so it counts as inside). Leaving either one onto the
  // other must not hide it, and leaving the strip must hide it — otherwise
  // it stays frozen open after being revealed.
  const onAreaLeave = (e: React.MouseEvent) => {
    const to = e.relatedTarget;
    if (to instanceof Node && (headerRef.current?.contains(to) || edgeRef.current?.contains(to))) return;
    setHovering(false);
  };
  const headerVisible = initialPeek || sidebarPeek || hovering || menuOpen || openRoom !== null;

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
        profileDrawer.close();
      }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tripDrawer, profileDrawer, toggleRoom]);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <>
      <div ref={edgeRef} className="ta-hd-edge" onMouseEnter={() => setHovering(true)} onMouseLeave={onAreaLeave} />
      <header
        ref={headerRef}
        className={`ta-hd${headerVisible ? " ta-hd-visible" : ""}${menuOpen ? " menu-open" : ""}`}
        data-shell
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={onAreaLeave}
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

        <nav className="ta-hd-nav" aria-label="Sections">
          <div className={`ta-room ta-room-rich${openRoom === "explore" ? " pin" : ""}`}>
            <button type="button" className="ta-room-t" onClick={() => toggleRoom("explore")}>
              Explore <span className="car" />
            </button>
            <ExploreMega />
          </div>
        </nav>

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
          <button className="ta-hd-trip ta-hd-profile" type="button" aria-label={signedIn ? "Profile" : "Sign in"} onClick={() => (signedIn ? profileDrawer.open() : signInModal.open("Sign in to your year."))}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
            </svg>
            <span className="lbl">{signedIn ? "Profile" : "Sign in"}</span>
          </button>
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

      </header>
    </>
  );
}
