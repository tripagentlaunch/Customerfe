import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import WorldMap from "./WorldMap";
import PhoneWorldMap from "./PhoneWorldMap";
import { useIsMobile } from "../hooks/useIsMobile";
import mapTabsData from "../data/map-tabs.generated.json";
import type { MapTabsData } from "../types/mapTabs";
import styles from "./StickyWorldMap.module.css";

const { world: WORLD_TAB } = mapTabsData as MapTabsData;

// Fixed pin offset from the viewport top — was measured off the site
// header's own height, but that left a visible gap above the section once
// pinned.
// Fallback for the pin offset; the real value is the site header's height,
// measured on mount, because the header now stays on screen while the map
// is pinned (2026-10-14) and the map pins just below it.
const STICKY_TOP = 64;

// Extra scroll on World right after the section sticks, before the
// scroll-driven region cycle takes over — expressed as a fraction of the
// viewport height so it scales with screen size the same way each
// region's own 1-viewport-height segment does.
const WORLD_DWELL_VH = 0.5;

// Same west→east geographic order WorldMap.tsx's own entrance animation
// uses (REGION_POP_ORDER there) — canonical left-to-right order for this
// component's scroll-driven cycle.
const LEFT_TO_RIGHT_ORDER = [
  "north-america",
  "south-america",
  "western-europe",
  "southern-europe",
  "africa",
  "middle-east",
  "india",
  "east-asia",
  "southeast-asia",
  "oceania",
];

// The phone map's regions (src/data/worldmap-mobile/map-tabs.json), same
// west-to-east order.
const PHONE_LEFT_TO_RIGHT_ORDER = ["americas", "europe", "africa", "middle-east", "india", "east-asia", "southeast-asia", "oceania"];

// Pins the map in place while the page scrolls through it. Before the
// section actually sticks (normal scrolling, header still scrolling past
// above it), it stays on World. The moment it sticks — normal scrolling
// stops and the scroll-driven cycle takes over — it jumps straight to a
// randomly-picked region (so the sequence isn't identical on every page
// load), no lingering on World once pinned. From there it steps through
// every remaining region exactly once, always in left-to-right geographic
// order (rotating the order, not shuffling it).
//
// "Exit Map" is the only way to end the experience. Clicking it permanently
// releases the section: it becomes an ordinary static block reset to World
// and never re-pins. Scrolling through to the end does nothing special —
// plain CSS sticky lets go on its own, and scrolling back up into the range
// pins and cycles again, since nothing was released.
export default function StickyWorldMap({ children }: { children?: ReactNode }) {
  // Phone (mobile handoff): the header auto-hides and overlays the page, so
  // the map pins 12px from the top instead of under the header.
  const isMobile = useIsMobile();
  // Always North America first, then west to east (2026-10-14, direct
  // request — it used to start at a random region, e.g. Oceania). Phones
  // step through the phone map's own regions (Americas and Europe are one
  // tab each there; the desktop keys would leave it on World).
  const segments = isMobile ? PHONE_LEFT_TO_RIGHT_ORDER : LEFT_TO_RIGHT_ORDER;

  const [activeIndex, setActiveIndex] = useState(0);
  const stickyTopRef = useRef(STICKY_TOP);
  const [stickyTop, setStickyTop] = useState(STICKY_TOP);
  useEffect(() => {
    const h = isMobile ? 12 : document.querySelector<HTMLElement>(".ta-hd")?.offsetHeight;
    if (h) {
      stickyTopRef.current = h;
      setStickyTop(h);
    }
  }, [isMobile]);
  // Whether the section is actually pinned right now — i.e. the viewport is
  // currently somewhere inside the wrapper's tall span, with room on both
  // sides for the sticky child to hold its position. False for all normal
  // scrolling before/after this section.
  const [stuck, setStuck] = useState(false);
  // True for the first WORLD_DWELL_VH of scroll after sticking — still
  // shows World during that brief window, before the region cycle starts.
  const [dwelling, setDwelling] = useState(true);
  // Bumped each time the World entrance animation should replay — see its
  // own comment on WorldMap's worldRevealKey prop.
  const [worldRevealKey, setWorldRevealKey] = useState(0);
  // Tracks the previous tick's stuck/showingWorld so the effect below can
  // detect the two specific edges that should trigger a replay, rather than
  // firing on every scroll tick while World happens to be showing.
  const prevRef = useRef({ stuck: false, showingWorld: true });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Desktop: while pinned, one continuous line runs under the whole tab row
  // (World -> Oceania) and fills left to right with scroll: it reaches each
  // tab as the map arrives on that region and is full at Oceania, so it's
  // clear the scroll is what moves the map on. Written straight onto the
  // tab bar as CSS variables (--fill-x0/--fill-x/--fill-x1/--fill-y, px)
  // plus a data-scroll-cycle flag on the sticky element — no React
  // re-render per scroll tick. WorldMap.module.css draws the track + fill.
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const setFill = (tabKey: string | null, f = 0) => {
    const s = stickyRef.current;
    const bar = s?.querySelector<HTMLElement>('[role="tablist"]');
    if (!s || !bar) return;
    const btn = tabKey ? bar.querySelector<HTMLElement>(`[data-tab="${tabKey}"]`) : null;
    if (!btn) {
      delete s.dataset.scrollCycle;
      return;
    }
    const tabs = bar.querySelectorAll<HTMLElement>('[role="tab"]');
    const first = tabs[0];
    const last = tabs[tabs.length - 1];
    const next = btn.nextElementSibling as HTMLElement | null;
    const p = Math.min(1, Math.max(0, f));
    // Spans the gap to the next tab too, so the line moves continuously.
    const x = btn.offsetLeft + p * (next ? next.offsetLeft - btn.offsetLeft : btn.offsetWidth);
    bar.style.setProperty("--fill-x0", `${first.offsetLeft}px`);
    bar.style.setProperty("--fill-x1", `${last.offsetLeft + last.offsetWidth}px`);
    bar.style.setProperty("--fill-x", `${x}px`);
    bar.style.setProperty("--fill-y", `${btn.offsetTop + btn.offsetHeight - 1}px`);
    s.dataset.scrollCycle = "";
  };

  // One-way "this is over" flag — once true, the section renders as a plain
  // static block forever (see the render branch below) and the scroll
  // handler stops touching stuck/dwelling/activeIndex. A ref (not just the
  // state) so the rAF-throttled scroll callback — a stale closure from the
  // effect's one-time setup — can bail out immediately without waiting for
  // a re-render.
  const [released, setReleased] = useState(false);
  const releasedRef = useRef(false);
  // Captured once, at the exact moment of release: which tab to freeze on,
  // and how much scroll the tall wrapper had already consumed pinning the
  // map at `top: STICKY_TOP` — see computeFreeze and the layout effect below
  // for how `consumed` is used to avoid a jump without leaving it behind as
  // permanent dead space.
  const [frozen, setFrozen] = useState<{ consumed: number; tab: string } | null>(null);

  // Used by the Exit Map click — the only way out. While stuck, the sticky
  // child sits at exactly `top: STICKY_TOP` in the viewport — i.e. the
  // wrapper's own (never-stuck, always-normal-flow) top edge has scrolled
  // `STICKY_TOP - rect.top` past the viewport top. That distance is pure
  // "consumed scroll range" with no content of its own — once we drop
  // `position: sticky` and collapse the wrapper to its natural size, it
  // needs to come out of `window.scrollY` too (see the layout effect
  // below), or it either reappears as a jump (if left in scrollY) or as
  // permanent dead space above the section (if baked into the layout as a
  // spacer — what an earlier version of this did wrong).
  const computeFreeze = (tab: string) => {
    const el = wrapRef.current;
    if (!el) return null;
    const consumed = Math.max(0, stickyTopRef.current - el.getBoundingClientRect().top);
    return { consumed, tab };
  };

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (releasedRef.current) return;
        const el = wrapRef.current;
        if (!el) return;
        const viewportH = window.innerHeight;
        const rect = el.getBoundingClientRect();
        // Shifted by STICKY_TOP since the sticky child pins at
        // `top: STICKY_TOP`, not `top: 0` — it engages once the wrapper's
        // own top has scrolled up to that offset, not all the way to 0.
        const adjustedTop = rect.top - stickyTopRef.current;
        const isStuck = adjustedTop <= 0 && rect.bottom >= viewportH;
        // Scrolling through to the end does nothing special: plain CSS
        // `position: sticky` lets go on its own once the wrapper's bottom
        // edge arrives, the wrapper never changes size, and nothing needs
        // compensating. Only the Exit Map button releases the section.
        setStuck(isStuck);
        const scrolledSinceStuck = Math.max(0, -adjustedTop);
        const dwellPx = viewportH * WORLD_DWELL_VH;
        const isDwelling = scrolledSinceStuck < dwellPx;
        setDwelling(isDwelling);
        // Replay the World entrance animation on becoming sticky, or on
        // scrolling back into World from a region while still pinned (e.g.
        // scrolling back up within the dwell zone) — not on every tick
        // World happens to be showing, and not for ordinary pre-stick
        // scrolling (showingWorld here only counts while actually stuck).
        const showingWorld = isStuck && isDwelling;
        const justStuck = isStuck && !prevRef.current.stuck;
        const justBackToWorld = isStuck && showingWorld && !prevRef.current.showingWorld;
        if (justStuck || justBackToWorld) setWorldRevealKey((k) => k + 1);
        prevRef.current = { stuck: isStuck, showingWorld };
        // Scrollable distance inside this wrapper before it un-sticks: the
        // wrapper is (segments.length + 1 + WORLD_DWELL_VH) viewport-heights
        // tall, so beyond the dwell this works out to exactly
        // segments.length viewport-heights — one per segment — regardless
        // of how many segments there are.
        const scrollable = el.offsetHeight - viewportH - dwellPx;
        if (scrollable <= 0) return;
        const progress = Math.min(1, Math.max(0, (scrolledSinceStuck - dwellPx) / scrollable));
        const idx = Math.min(segments.length - 1, Math.floor(progress * segments.length));
        setActiveIndex(idx);
        // World fills over the dwell, then each region over its own segment.
        if (!isStuck || isMobile) setFill(null);
        else if (isDwelling) setFill(WORLD_TAB.key, scrolledSinceStuck / dwellPx);
        else setFill(segments[idx], progress * segments.length - idx);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [segments.length, isMobile]);

  // Exit Map stops the scroll handler; drop the fill so the tab bar returns
  // to its normal full underline.
  useEffect(() => {
    if (released) setFill(null);
  }, [released]);

  // Keeps the site header on screen while the map is pinned: scrolling here
  // drives the map, so the header's "hide on scroll down" rule made it
  // vanish for the whole section (2026-10-14). site.css reads this class.
  useEffect(() => {
    // Desktop only: on phones the header has its own auto-hide and the map
    // pins near the top of the screen.
    const pinned = stuck && !released && !isMobile;
    document.documentElement.classList.toggle("ta-map-pinned", pinned);
    return () => document.documentElement.classList.remove("ta-map-pinned");
  }, [stuck, released, isMobile]);

  // Lets the viewer bail out of the sticky/cycling experience early,
  // instead of scrolling through however many regions are left. Freezes in
  // place — the scroll position doesn't change visibly, and the map itself
  // resets to World.
  const handleExitMap = () => {
    const freeze = computeFreeze(WORLD_TAB.key);
    if (!freeze) return;
    releasedRef.current = true;
    setFrozen(freeze);
    setReleased(true);
  };

  // Fires once, the instant `released` flips true — synchronously, before
  // the browser paints the collapsed layout, so this correction is never
  // visible as a separate jump. Collapsing the tall wrapper down to the
  // static section's natural height removes `frozen.consumed` px of
  // document height from above the viewport's current content; scrolling
  // up by that same amount keeps every pixel already on screen exactly
  // where it is, instead of either jumping down (if left uncorrected) or
  // leaving that height behind as a dead spacer (see computeFreeze above).
  // `behavior: "instant"` is not optional here — site.css sets
  // `html { scroll-behavior: smooth }` globally, so a bare `scrollBy` would
  // inherit that and visibly animate this correction over several hundred
  // ms instead of applying before paint, turning the fix into exactly the
  // "shorten then visibly scroll back" jump it exists to prevent.
  useLayoutEffect(() => {
    if (!released || !frozen) return;
    if (frozen.consumed > 0) {
      window.scrollBy({ top: -frozen.consumed, behavior: "instant" });
    }
    // Then carry on past the map to the next section — "Exit Map" should
    // leave the map, not leave the visitor parked on it (2026-10-13).
    const raf = requestAnimationFrame(() => {
      const el = wrapRef.current;
      if (el) window.scrollBy({ top: el.getBoundingClientRect().bottom, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [released]);

  // One render tree for both states — NOT a separate early-return branch.
  // `children` (the heading/stats block) carries a one-shot, imperatively
  // applied `.in` class from the page's scroll-reveal IntersectionObserver
  // (see useScrollReveal) once it's been scrolled into view. An earlier
  // version of this component used two structurally different returns (one
  // wrapped in the tall `.wrap` div, one starting directly at `.sticky`) —
  // React sees that as a different tree shape at the same position and
  // unmounts+remounts the whole subtree on release, silently destroying
  // that DOM node (and its `.in` class) along with it; the reveal observer
  // had already fired-and-forgotten on the old node, so the fresh one never
  // gets re-observed and stays permanently invisible. Keeping one unchanging
  // tree shape here — only style/prop values differ — means React just
  // patches attributes in place, so `children`'s own DOM node (and its
  // already-applied `.in` class) survives the transition untouched.
  const isReleased = released && frozen !== null;
  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      // The tall inline height is this wrapper's only job (giving
      // `position: sticky` room to scroll-hijack) — once released, dropping
      // it lets the div collapse to its child's own natural height, with no
      // spacer/dead-space math needed here (see the layout effect above for
      // how the resulting height change avoids a jump).
      style={isReleased ? undefined : { height: `${(segments.length + 1 + WORLD_DWELL_VH) * 100}vh` }}
    >
      <div
        ref={stickyRef}
        className={styles.sticky}
        style={
          isReleased
            ? { position: "static", height: `calc(100svh - ${stickyTop}px)` }
            : { top: stickyTop, height: `calc(100svh - ${stickyTop}px)` }
        }
      >
        {children}
        {/* Only while the map is pinned and cycling. Part of the map itself
            (absolute within .sticky), not fixed to the window — it used to
            sit beside the theme toggle and read as a site-wide control
            stuck on screen (2026-10-13). */}
        {!isReleased && stuck && !dwelling && (
          <button type="button" className={styles.exitMapButton} onClick={handleExitMap}>
            <span className={styles.exitMapLabel}>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path
                  d="M2 2L14 14M14 2L2 14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              Exit map
            </span>
          </button>
        )}
        {(() => {
          const tab = isReleased ? frozen.tab : stuck && !dwelling ? segments[activeIndex] : WORLD_TAB.key;
          return isMobile ? (
            <PhoneWorldMap activeTabOverride={tab} worldRevealKey={worldRevealKey} scrollFriendly={!isReleased} />
          ) : (
            <WorldMap activeTabOverride={tab} worldRevealKey={worldRevealKey} />
          );
        })()}
      </div>
    </div>
  );
}
