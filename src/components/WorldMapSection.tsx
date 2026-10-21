import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import WorldMap from "./WorldMap";
import StickyWorldMap from "./StickyWorldMap";
import PhoneWorldMap from "./PhoneWorldMap";
import { useIsMobile } from "../hooks/useIsMobile";
import styles from "./WorldMapSection.module.css";
import { useScrollReveal } from "../lib/useScrollReveal";

// The "Where we go" world-map section — heading, stats and the interactive
// map — shared by the homepage (sticky scroll-cycling) and the Destinations
// page (plain, no pinning). One definition, so changes land on both.
function Intro() {
  return (
    <div className="wrap">
      <div className={styles.mapIntro}>
        <div>
          <div className="eyebrow reveal">Where we go</div>
          <div className="rule" />
          <h2 className={`reveal d1 ${styles.mapHeading}`}>
            The world, within <em>reach.</em>
          </h2>
          <p className={`reveal d1 ${styles.mapSub}`}>
            Explore extraordinary destinations and start planning your next journey with our expert advisors.
          </p>
        </div>
        <dl className={`reveal d2 ${styles.mapStats}`}>
          <div>
            <dt>110+</dt>
            <dd>Destinations</dd>
          </div>
          <div>
            <dt>50+</dt>
            <dd>Expert advisors</dd>
          </div>
          <div>
            <dt>24/7</dt>
            <dd>Personal support</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// The map runs full page width (not inside a `.wrap`) — `.band`/`.tight`
// only add vertical padding, so a direct child already spans edge-to-edge.
export default function WorldMapSection({ sticky = false }: { sticky?: boolean }) {
  const isMobile = useIsMobile();
  // Phone: the map can open full screen — own screen, no page scrolling in the way.
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [fullscreen]);
  useEffect(() => {
    if (!isMobile) setFullscreen(false);
  }, [isMobile]);
  // Its own reveal pass: on /destinations it mounts after the page's (it
  // loads on demand), so the page-level pass never saw its elements.
  useScrollReveal([]);
  return (
    <section className="band tight" style={isMobile ? { paddingBottom: 8 } : undefined}>
      <div className={styles.worldMapWrap}>
        {sticky && !isMobile ? (
          <StickyWorldMap>
            <Intro />
          </StickyWorldMap>
        ) : (
          <>
            <Intro />
            {isMobile ? (
              // The phone map fills its parent's height, so give it one. Phones
              // never pin/cycle (that was ~9 screens of scrolling): the map rests
              // on World, region chips and map taps still switch regions, and a
              // one-finger vertical drag scrolls the page past it.
              <>
              <div style={{ position: "relative", height: "clamp(460px, 70svh, 620px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <PhoneWorldMap activeTabOverride="world" scrollFriendly />
                <button type="button" className={styles.expandBtn} onClick={() => setFullscreen(true)} aria-label="Open the map full screen">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                  </svg>
                </button>
              </div>
              {fullscreen &&
                createPortal(
                  <div className={styles.fullscreen} role="dialog" aria-modal="true" aria-label="World map">
                    <div className={styles.fullscreenBar}>
                      <span>Where we go</span>
                      <button type="button" className={styles.fullscreenClose} onClick={() => setFullscreen(false)} aria-label="Close the map">
                        ×
                      </button>
                    </div>
                    <div className={styles.fullscreenMap}>
                      <PhoneWorldMap activeTabOverride="world" />
                    </div>
                  </div>,
                  document.body
                )}
              </>
            ) : (
              <WorldMap />
            )}
          </>
        )}
      </div>
    </section>
  );
}
