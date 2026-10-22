import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useTripDrawer } from "../../lib/tripDrawer";
import { useProfileDrawer } from "../../lib/profileDrawer";
import { useSignInModal } from "../../lib/signInModal";
import { useNavMenu } from "../../lib/navMenu";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ExploreMega } from "./HeaderMegaMenus";
import { loadSearchIndex, matches, type SearchEntry } from "../../lib/searchIndex";
import SearchResultRow from "../SearchResultRow";

// Ported from js/shell.js's header build (~line 60-80) — the real,
// currently-live header. The previous Header.tsx had extracted the empty
// pre-shell.js <nav> skeleton from index.html's source, which shell.js
// replaces at runtime on every page that loads it (416/436 static pages);
// that markup was dead code, never actually seen by a visitor. This is the
// structure real visitors get today. css/site.css's .ta-hd rules (added
// 2026-07-07) apply with zero new CSS.
const SUGGESTIONS_SHOWN = 8;

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="11" cy="11" r="7" />
    <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
  </svg>
);

export function Header() {
  const { signedIn, loading: authLoading, authError, clearAuthError } = useAuth();
  const tripDrawer = useTripDrawer();
  const profileDrawer = useProfileDrawer();
  const signInModal = useSignInModal();
  const { menuOpen, openRoom, toggleRoom } = useNavMenu();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);

  // Auto-hiding header: peeks open on page load; after that see the
  // activity rules below (and it stays open while hovered or while a mega
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
  // Shown whenever the visitor is doing something (2026-10-13, direct
  // request — it used to come back only from the top 84px, so most people
  // never found it and pages looked header-less): at the top of the page,
  // on any mouse movement, and when scrolling up. It tucks away after a
  // short idle, or on scrolling down, so it stays out of the way of reading.
  const [atTop, setAtTop] = useState(true);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let idle = 0;
    let lastY = window.scrollY;
    let raf = 0;
    const wake = () => {
      setActive(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setActive(false), 2500);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setAtTop(y < 80);
        if (y < lastY - 4) wake();
        else if (y > lastY + 4) {
          window.clearTimeout(idle);
          setActive(false);
        }
        lastY = y;
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") wake();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.clearTimeout(idle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  const desktopVisible = atTop || active || initialPeek || sidebarPeek || hovering || menuOpen || openRoom !== null;

  // Phone: no hover. Standard direction-based bar — always visible near the
  // top of the page, hides as soon as the page is scrolled DOWN, and comes
  // straight back on the next scroll UP (it stays until the next scroll
  // down). Stays put while the Explore panel is open or search has focus.
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const [phoneShown, setPhoneShown] = useState(true);
  const [focusWithin, setFocusWithin] = useState(false);
  // Phone: search suggests right under the bar as you type, on the same
  // screen, instead of jumping to /search (desktop still does).
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchEntry[] | null>(null);
  const q = query.trim();
  useEffect(() => {
    if (isMobile && searchOpen && !searchIndex) loadSearchIndex().then(setSearchIndex);
  }, [isMobile, searchOpen, searchIndex]);
  const suggestions = useMemo(() => (searchIndex && q ? matches(searchIndex, q) : []), [searchIndex, q]);
  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);
  // A page change closes the Explore panel (it used to stay open over the new
  // page after tapping one of its links).
  useEffect(() => {
    toggleRoom(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!isMobile) return;
    const TOP_ZONE = 80; // px from the top where the bar is always shown
    const MIN_DELTA = 6; // px of travel before a direction counts
    // City pages and the home page: hidden on arrival (the hero gets the whole screen), shown only
    // by scrolling up. Every other page: shown at the top.
    const hiddenAtTop = pathname.startsWith("/city-") || pathname === "/";
    setPhoneShown(!hiddenAtTop);
    let lastY = window.scrollY;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY);
      if (y < TOP_ZONE && !hiddenAtTop) {
        lastY = y;
        setPhoneShown(true);
        return;
      }
      const dy = y - lastY;
      if (Math.abs(dy) < MIN_DELTA) return;
      lastY = y;
      setPhoneShown(dy < 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    // Where the header starts hidden, a tap on the page (not on a link, button or field)
    // brings it down — it's also the way to the search bar.
    const onTap = (e: MouseEvent) => {
      if (!hiddenAtTop || !(e.target instanceof Element)) return;
      if (e.target.closest("a,button,input,select,textarea,summary,label,[role=button],[role=tab],header.ta-hd")) return;
      setPhoneShown(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onTap);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onTap);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile, pathname]);
  const headerVisible = isMobile
    ? phoneShown || sidebarPeek || menuOpen || openRoom !== null || focusWithin
    : desktopVisible;

  // A magic-link click can complete a Supabase session with no linked
  // site_members row (see auth.tsx's hydrate()) — that happens on a full
  // page load with no modal open to show an inline error in, so surface it
  // here by reopening the sign-in modal with the same copy the typed-code
  // path shows inline.
  useEffect(() => {
    if (authError === "not_invited") {
      signInModal.open("This email isn't on the invitation list: please speak to your advisor.");
      clearAuthError();
    }
  }, [authError, clearAuthError, signInModal]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        toggleRoom(null);
        setSearchOpen(false);
      }
      // Tapping a link inside the Explore panel closes it — including a link to the
      // page you're already on, where the route (and so the effect above) doesn't change.
      else if (e.target instanceof Element && e.target.closest(".ta-room a")) toggleRoom(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        toggleRoom(null);
        setSearchOpen(false);
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

  // Publishes the header's height (--ta-hd-h) and where the search row starts
  // (--ta-hd-search-top), which anchors the phone Explore panel over it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => {
      const root = document.documentElement.style;
      root.setProperty("--ta-hd-h", `${el.offsetHeight}px`);
      const search = searchRef.current;
      if (search) root.setProperty("--ta-hd-search-top", `${search.getBoundingClientRect().top - el.getBoundingClientRect().top}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    if (searchRef.current) ro.observe(searchRef.current);
    return () => ro.disconnect();
  }, []);

  // Phone: the Explore panel is modal-ish — page behind it is dimmed and doesn't scroll.
  const exploreOpenOnPhone = isMobile && openRoom === "explore";
  useEffect(() => {
    document.documentElement.style.overflow = menuOpen || exploreOpenOnPhone ? "hidden" : "";
  }, [menuOpen, exploreOpenOnPhone]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <>
      {exploreOpenOnPhone && <div className="ta-hd-scrim" aria-hidden="true" onClick={() => toggleRoom(null)} />}
      <div ref={edgeRef} className="ta-hd-edge" onMouseEnter={() => setHovering(true)} onMouseLeave={onAreaLeave} />
      <header
        ref={headerRef}
        className={`ta-hd${headerVisible ? " ta-hd-visible" : ""}${menuOpen ? " menu-open" : ""}`}
        data-shell
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={onAreaLeave}
        // Only typing in search holds the phone header open — a tapped button
        // (Explore, Profile) keeps focus and used to pin it open for good.
        onFocus={(e) => setFocusWithin(e.target instanceof HTMLInputElement)}
        onBlur={() => setFocusWithin(false)}
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
            <ExploreMega onClose={() => toggleRoom(null)} />
          </div>
        </nav>

        <form ref={searchRef} className="ta-hd-search" role="search" onSubmit={submitSearch}>
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
            onFocus={() => (isMobile ? setSearchOpen(true) : navigate("/search"))}
          />
        </form>

        {isMobile && searchOpen && q && (
          <div className="ta-hd-suggest" aria-live="polite">
            {!searchIndex ? null : suggestions.length === 0 ? (
              <div className="sp-empty">
                <p>Nothing in the library matched “{q}”.</p>
                <p>
                  Your advisor can still find it: {" "}
                  <Link to={`/enquire?about=${encodeURIComponent(q)}`}>tell them what you have in mind →</Link>
                </p>
              </div>
            ) : (
              <>
                <div className="sp-rows">
                  {suggestions.slice(0, SUGGESTIONS_SHOWN).map((e, i) => (
                    <SearchResultRow entry={e} key={e.u + i} />
                  ))}
                </div>
                {suggestions.length > SUGGESTIONS_SHOWN && (
                  <Link className="ta-hd-suggest-all" to={`/search?q=${encodeURIComponent(q)}`}>
                    See all results →
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        <div className="ta-hd-cluster">
          {/* Not shown as "Sign in" until the session check has answered —
              it used to flash "Sign in" at members (2026-10-13). */}
          <button
            className="ta-hd-trip ta-hd-profile"
            type="button"
            style={!isMobile && !signedIn && authLoading ? { visibility: "hidden" } : undefined}
            aria-label={signedIn ? "Profile" : "Sign in"}
            onClick={() => (signedIn ? profileDrawer.open() : signInModal.open("Sign in to your year."))}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
            </svg>
            <span className="lbl">{signedIn ? "Profile" : "Sign in"}</span>
          </button>
        </div>
      </div>

      </header>
    </>
  );
}
