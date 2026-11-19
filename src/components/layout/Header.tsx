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
// The header's search row goes full-width (and its dropdown joins the header's
// flow) at this width — matches css/site.css's max-width:900px header rules.
const NARROW_HEADER = 900;

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

  // A full load (or refresh) of /search?q=… starts with that query in the bar.
  const [query, setQuery] = useState(() =>
    window.location.pathname === "/search" ? new URLSearchParams(window.location.search).get("q") || "" : ""
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const q = query.trim();
  const headerRef = useRef<HTMLElement>(null);
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
  // The hover zone: the top HOVER_ZONE_PX of the window (80px) plus the navbar
  // itself (its open Explore panel is a DOM child, so it counts). It is tracked
  // from the pointer's position and NOT with an invisible element laid over the
  // page: that element swallowed every click in the top zone (the How it Works
  // stages, breadcrumbs, hero links...). Mouse pointers only; phones have no hover.
  //
  // Timing (2026-11-16, direct request), meant to stop the navbar flicking in and out for someone reaching
  // for the address bar, tabs, fullscreen or reload:
  //  - Show: the pointer must stay in the zone HOVER_ENTER_DELAY_MS (0.5s). Sweeping through toward the
  //    browser bar is quicker than that, and leaving the window during the wait cancels it.
  //  - Hide: HOVER_LEAVE_DELAY_MS (1s) after the pointer leaves, or HOVER_LEAVE_TOP_DELAY_MS (1.5s) if it left
  //    through the top edge (toward the browser bar, where it is likely to come straight back).
  //  - While shown, the "still here" area reaches HOVER_STAY_EXTRA_PX below the navbar, so drifting a little
  //    under it does not count as leaving.
  // Scrolling overrides all of it (scroll up shows now, scroll down hides now: see `active` below).
  const HOVER_ZONE_PX = 80;
  const HOVER_ENTER_DELAY_MS = 500;
  const HOVER_LEAVE_DELAY_MS = 1000;
  const HOVER_LEAVE_TOP_DELAY_MS = 1500;
  const HOVER_STAY_EXTRA_PX = 40;
  const inZoneRef = useRef(false);
  const hoveringRef = useRef(false);
  const hoverTimer = useRef(0);
  useEffect(() => {
    hoveringRef.current = hovering;
  }, [hovering]);
  useEffect(() => {
    const setZone = (inZone: boolean, leaveDelay = HOVER_LEAVE_DELAY_MS) => {
      if (inZone === inZoneRef.current) return;
      inZoneRef.current = inZone;
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = window.setTimeout(
        () => {
          if (inZoneRef.current === inZone) setHovering(inZone);
        },
        inZone ? HOVER_ENTER_DELAY_MS : leaveDelay,
      );
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const overHeader = e.target instanceof Node && !!headerRef.current?.contains(e.target);
      const limit = hoveringRef.current
        ? Math.max(HOVER_ZONE_PX, (headerRef.current?.getBoundingClientRect().bottom ?? 0) + HOVER_STAY_EXTRA_PX)
        : HOVER_ZONE_PX;
      setZone(e.clientY < limit || overHeader);
    };
    const onLeaveWindow = (e: PointerEvent) => setZone(false, e.clientY <= 0 ? HOVER_LEAVE_TOP_DELAY_MS : HOVER_LEAVE_DELAY_MS);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      window.clearTimeout(hoverTimer.current);
    };
  }, []);
  // Desktop: the navbar peeks open on load (initialPeek, 1.5s), then hides and
  // stays hidden. It comes back only when the pointer is over the top edge /
  // navbar area (`hovering`, above) or when the page is scrolled UP toward the
  // top. It hides again on scrolling down, or 1.5s after the last scroll-up
  // movement. (This replaces the 2026-10-13 rule that also showed it at the top
  // of the page and on any mouse movement; that left it on screen almost always.)
  const [active, setActive] = useState(false);
  useEffect(() => {
    let idle = 0;
    let lastY = window.scrollY;
    let raf = 0;
    const wake = () => {
      setActive(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setActive(false), 1500);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < lastY - 4) wake();
        else if (y > lastY + 4) {
          window.clearTimeout(idle);
          setActive(false);
          // Scrolling down hides it now, even with the pointer still in the zone; it only comes back
          // by the pointer leaving the zone and re-entering it (and waiting), or by scrolling up.
          window.clearTimeout(hoverTimer.current);
          setHovering(false);
        }
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Phone: no hover. Standard direction-based bar — always visible near the
  // top of the page, hides as soon as the page is scrolled DOWN, and comes
  // straight back on the next scroll UP (it stays until the next scroll
  // down). Stays put while the Explore panel is open or search has focus.
  const isMobile = useIsMobile();
  const narrow = useIsMobile(NARROW_HEADER);
  const { pathname, search } = useLocation();
  const [phoneShown, setPhoneShown] = useState(true);
  const [focusWithin, setFocusWithin] = useState(false);
  // Search suggests right under the bar as you type, on the same page — on
  // every screen size, never a jump to /search. Closes on a click outside the
  // header, on Escape, and on a page change.
  const [searchIndex, setSearchIndex] = useState<SearchEntry[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (searchOpen && !searchIndex) loadSearchIndex().then(setSearchIndex);
  }, [searchOpen, searchIndex]);
  const suggestions = useMemo(() => (searchIndex && q ? matches(searchIndex, q) : []), [searchIndex, q]);
  useEffect(() => {
    setShowAll(false);
  }, [q]);
  // Opening the Explore panel takes over the space under the bar.
  useEffect(() => {
    if (openRoom !== null) setSearchOpen(false);
  }, [openRoom]);
  // Landing on a new page (a result was picked, a link followed) starts the
  // search bar fresh; on /search the bar mirrors the URL's query instead.
  useEffect(() => {
    setSearchOpen(false);
    if (pathname !== "/search") setQuery("");
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
      // A field in the page (the map's search) moves the page as the keyboard opens and closes: that is
      // not the reader scrolling up, so the bar stays where it is (2026-11-19).
      if (Date.now() < quietUntil) { lastY = y; return; }
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
      if (e.target.closest("a,button,input,select,textarea,summary,label,[role=button],[role=tab],[role=option],[data-map-ctl],[role=dialog],header.ta-hd")) return;
      setPhoneShown(true);
    };
    let quietUntil = 0;
    const onField = (e: Event) => {
      if (e.target instanceof HTMLInputElement && !e.target.closest("header.ta-hd")) {
        quietUntil = Date.now() + 1500;
        setPhoneShown(false);
      }
    };
    document.addEventListener("focusin", onField);
    document.addEventListener("focusout", onField);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onTap);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onTap);
      document.removeEventListener("focusin", onField);
      document.removeEventListener("focusout", onField);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile, pathname]);
  // Desktop home page (2026-11-19, direct request): the header is there on the first view and stays until
  // the visitor first scrolls; from then on it comes and goes as on every other page.
  const [untouched, setUntouched] = useState(true);
  useEffect(() => {
    setUntouched(true);
    if (pathname !== "/") return;
    const start = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) > 4) {
        setUntouched(false);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  const desktopVisible = (pathname === "/" && untouched) || active || initialPeek || sidebarPeek || hovering || menuOpen || openRoom !== null || (searchOpen && !!q);
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

  // The header bar is the site's only search box (2026-10-22): on /search it
  // drives the results as you type, Enter included; landing on /search?q=
  // shows that query in the bar.
  const onSearchPage = pathname === "/search";
  const urlQuery = onSearchPage ? new URLSearchParams(search).get("q") || "" : "";
  // Only when the URL's query changes (a link, Back): arriving on /search
  // must not wipe what is already being typed.
  const lastUrlQuery = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery === lastUrlQuery.current) return;
    lastUrlQuery.current = urlQuery;
    if (onSearchPage) setQuery((cur) => (cur.trim() === urlQuery.trim() ? cur : urlQuery));
  }, [onSearchPage, urlQuery]);

  function searchUrl(value: string) {
    const v = value.trim();
    return `/search${v ? `?q=${encodeURIComponent(v)}` : ""}`;
  }

  function onSearchChange(value: string) {
    setQuery(value);
    setSearchOpen(true);
    if (onSearchPage) navigate(searchUrl(value), { replace: true });
  }

  // On /search Enter refreshes that page's results in place; anywhere else the
  // results are already open under the bar and the visitor stays put.
  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (onSearchPage) navigate(searchUrl(query), { replace: true });
    else if (q) setSearchOpen(true);
  }

  const shownSuggestions = showAll ? suggestions : suggestions.slice(0, SUGGESTIONS_SHOWN);
  const suggestBox =
    searchOpen && q && !onSearchPage ? (
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
              {shownSuggestions.map((e, i) => (
                <SearchResultRow entry={e} key={e.u + i} />
              ))}
            </div>
            {!showAll && suggestions.length > SUGGESTIONS_SHOWN && (
              <button type="button" className="ta-hd-suggest-all" onClick={() => setShowAll(true)}>
                Show {suggestions.length - SUGGESTIONS_SHOWN} more →
              </button>
            )}
          </>
        )}
      </div>
    ) : null;

  return (
    <>
      {exploreOpenOnPhone && <div className="ta-hd-scrim" aria-hidden="true" onClick={() => toggleRoom(null)} />}
      <header
        ref={headerRef}
        className={`ta-hd${headerVisible ? " ta-hd-visible" : ""}${menuOpen ? " menu-open" : ""}`}
        data-shell
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
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchOpen(true)}
          />
          {!narrow && suggestBox}
        </form>

        {narrow && suggestBox}

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
