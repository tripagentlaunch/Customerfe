import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Scroll position per history entry (2026-10-09, direct request): Back and
// Forward return to where the visitor was on that page; following a link
// to a new page starts it at the top. Layout used to scroll to the top on
// every URL change, so Back always landed at the top of the previous page.
//
// Positions are keyed by React Router's location.key (unique per history
// entry, so two visits to the same page keep separate positions) and kept
// in sessionStorage, so they survive a reload of the tab. Every full page
// load (a plain <a href> link, a reload) starts on an entry whose key is
// the shared placeholder "default"; those are keyed by their URL instead,
// or every fully loaded page would read and overwrite the same position.

const STORAGE_KEY = "ta_scroll_positions";
// Long pages (home, city pages) grow as their content and images load; keep
// re-applying the saved position until the page is tall enough, for at most
// this long, and stop as soon as the visitor scrolls themselves.
const RESTORE_WINDOW_MS = 4000;
const STOP_EVENTS = ["wheel", "touchstart", "mousedown", "keydown"] as const;

function readPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePositions(positions: Record<string, number>) {
  try {
    // Only the latest 50 entries: older history entries won't be revisited.
    const keys = Object.keys(positions);
    for (const k of keys.slice(0, Math.max(0, keys.length - 50))) delete positions[k];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // storage unavailable (private mode, quota): positions just aren't kept
  }
}

// site.css sets html{scroll-behavior:smooth}; "instant" is what jumps
// without animating, like a normal page load.
function jumpTo(y: number) {
  window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
}

// How this document was loaded. React Router reports POP for the first
// page of every full load, even one reached by clicking a link, so for that
// first page only Back/Forward and reload restore a saved position.
function documentLoadWasHistory(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return !!nav && (nav.type === "back_forward" || nav.type === "reload");
  } catch {
    return false;
  }
}

function entryKey(location: { key: string; pathname: string; search: string }): string {
  return location.key === "default" ? `url:${location.pathname}${location.search}` : location.key;
}

export function useScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Record<string, number>>(readPositions());
  const key = entryKey(location);
  const currentKey = useRef(key);
  const firstEntry = useRef(true);

  // The browser's own restoration fights a client-side router; this hook
  // owns it instead.
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  // Record the position of the page being viewed as the visitor scrolls,
  // so it's already saved by the time they navigate away.
  useEffect(() => {
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        positions.current[currentKey.current] = window.scrollY;
        writePositions(positions.current);
      });
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
    };
  }, []);

  useLayoutEffect(() => {
    currentKey.current = key;
    const saved = positions.current[key];
    const isFirstEntry = firstEntry.current;
    firstEntry.current = false;

    // PUSH/REPLACE (a link, a redirect), a fresh full page load, or an
    // entry with nothing saved: start at the top.
    if (navigationType !== "POP" || saved === undefined || (isFirstEntry && !documentLoadWasHistory())) {
      jumpTo(0);
      return;
    }

    // POP (Back/Forward/reload): go back to where they were. Re-apply on
    // every size change for the whole window, not just until it first
    // matches: content that loads in above the viewport afterwards would
    // otherwise move the page, and the browser's scroll anchoring makes
    // that a huge jump (seen on /destinations: 2400 -> 18663), so anchoring
    // is paused meanwhile. Any input from the visitor ends it at once.
    const root = document.documentElement;
    const previousAnchor = root.style.overflowAnchor;
    root.style.overflowAnchor = "none";
    let done = false;
    const reapply = () => {
      if (!done && Math.abs(window.scrollY - saved) >= 1) jumpTo(saved);
    };
    const observer = new ResizeObserver(reapply);
    const stop = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      root.style.overflowAnchor = previousAnchor;
      for (const type of STOP_EVENTS) window.removeEventListener(type, stop);
    };
    const timer = setTimeout(stop, RESTORE_WINDOW_MS);
    for (const type of STOP_EVENTS) window.addEventListener(type, stop, { passive: true });
    observer.observe(document.body);
    jumpTo(saved);
    return stop;
  }, [key, navigationType]);
}
