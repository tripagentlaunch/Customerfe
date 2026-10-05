import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import WorldMap from "./WorldMap";
import mapTabsData from "../data/map-tabs.generated.json";
import type { MapTabsData } from "../types/mapTabs";
import styles from "./StickyWorldMap.module.css";

const { world: WORLD_TAB } = mapTabsData as MapTabsData;

// Fixed pin offset from the viewport top — was measured off the site
// header's own height, but that left a visible gap above the section once
// pinned.
const STICKY_TOP = 30;

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
  const segments = useMemo(() => {
    const startIdx = Math.floor(Math.random() * LEFT_TO_RIGHT_ORDER.length);
    return [...LEFT_TO_RIGHT_ORDER.slice(startIdx), ...LEFT_TO_RIGHT_ORDER.slice(0, startIdx)];
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
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
    const consumed = Math.max(0, STICKY_TOP - el.getBoundingClientRect().top);
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
        const adjustedTop = rect.top - STICKY_TOP;
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
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [segments.length]);

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

  // Fixed alongside the site's own theme toggle (.ta-theme, a separate
  // always-on-screen element this component doesn't render) — same bottom
  // offset, positioned a small gap to its right. Measured off its actual
  // rendered position rather than a guessed pixel offset, so it stays
  // correctly placed if that button's own width ever changes.
  const [exitBtnLeft, setExitBtnLeft] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const themeEl = document.querySelector<HTMLElement>(".ta-theme");
      if (themeEl) setExitBtnLeft(themeEl.getBoundingClientRect().right + 12);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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
    if (released && frozen && frozen.consumed > 0) {
      window.scrollBy({ top: -frozen.consumed, behavior: "instant" });
    }
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
        className={styles.sticky}
        style={
          isReleased
            ? { position: "static", height: `calc(100vh - ${STICKY_TOP}px)` }
            : { top: STICKY_TOP, height: `calc(100vh - ${STICKY_TOP}px)` }
        }
      >
        {children}
        {/* Only while actually pinned — before that, scrolling already
            works normally; once released (whether by finishing the cycle or
            by this button), there's nothing left to exit. Fixed (not
            absolute within .sticky) since it sits alongside the theme
            toggle at the very bottom of the viewport, not anchored to the
            map itself. */}
        {!isReleased && stuck && exitBtnLeft !== null && (
          <button
            type="button"
            className={styles.exitMapButton}
            style={{ left: exitBtnLeft }}
            onClick={handleExitMap}
          >
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
              Exit Map
            </span>
          </button>
        )}
        <WorldMap
          activeTabOverride={isReleased ? frozen.tab : stuck && !dwelling ? segments[activeIndex] : WORLD_TAB.key}
          worldRevealKey={worldRevealKey}
        />
      </div>
    </div>
  );
}
