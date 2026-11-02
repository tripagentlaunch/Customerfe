import { useEffect, useRef, useState } from "react";
// import { useIsMobile } from "../hooks/useIsMobile"; // phones now use the pinned version too
import { HOW_IT_WORKS_STAGES as STAGES } from "../data/how-it-works-stages";
import styles from "./HowItWorksTabs.module.css";

const LAST = STAGES.length - 1;

// The horizontal line + dot/label track visually reuses the "Our Promise"
// timeline's design language (site.css's .lh-track/.lh-node/.lh-seal —
// see the homepage's signature/"Our Promise" section) but isn't built on
// those classes directly: that component's .lit/.on states are driven by a
// one-time IntersectionObserver scroll reveal, not a live, continuously
// cycling active tab, so reusing the JS would fight itself. This is a
// fresh, purpose-built implementation matching the same visual vocabulary
// (line, dot, label/sublabel below, a distinct treatment for the final
// stop) instead.
// Milliseconds of stillness before the page scrolls itself on: to the next
// stage, and from the last stage (Home) on to the next section of the page.
const AUTO_ADVANCE_MS = 4500;
// How long the page's own glide from one stage to the next takes (the same for every move).
const SCROLL_MS = 700;

export default function HowItWorksTabs() {
  // Desktop: the section is pinned (a tall wrapper with a sticky 100svh stage
  // inside) and scrolling through the wrapper moves a continuous progress `q`
  // (0..1) along the track. Stage i sits at q = i / LAST, so the line's fill, the
  // dots, the image and the copy all follow the scroll. If the visitor stops
  // scrolling for AUTO_ADVANCE_MS the page scrolls itself on to the next stage,
  // and clicking any stage scrolls smoothly (forward or back) to it. Both go
  // through goTo(), so the line fills the same way as for a manual scroll.
  // Phones used to keep a simple version (the step followed where the section was on
  // screen, a click set it directly, no pinning); they now use this one too.
  // 2026-11-02 (direct request): phones get the same pinned, scroll-driven section with auto-advance. Was:
  // const isMobile = useIsMobile(); const pinnedMode = !isMobile; (phones: not pinned, the step followed where the
  // section sat on screen, no auto-advance). That phone branch below is kept but no longer runs.
  const pinnedMode = true;
  const wrapRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  // ---- desktop (pinned) ----
  const [q, setQ] = useState(0);
  const qRef = useRef(0);
  const idleRef = useRef(0);
  const autoTargetRef = useRef<number | null>(null); // scrollY we are scrolling to, while our own scroll runs
  const animRef = useRef(0); // the animation frame of our own scroll
  const lastArmYRef = useRef(-1); // where the page was when the wait was last started

  // ---- phone ----
  const [activeM, setActiveM] = useState(0);

  const geometry = () => {
    const wrap = wrapRef.current;
    const sticky = stickyRef.current;
    if (!wrap || !sticky) return null;
    return { top: wrap.getBoundingClientRect().top + window.scrollY, range: Math.max(1, wrap.offsetHeight - sticky.offsetHeight) };
  };
  const stageY = (i: number) => {
    const g = geometry();
    return g ? g.top + (i / LAST) * g.range : 0;
  };
  const isPinned = () => {
    const wrap = wrapRef.current;
    if (!wrap) return false;
    const r = wrap.getBoundingClientRect();
    return r.top <= 1 && r.bottom >= window.innerHeight - 1;
  };
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scrolls smoothly to stage i (click, or the auto-advance).
  const goTo = (i: number) => goToY(stageY(Math.max(0, Math.min(LAST, i))));
  // Scrolls to a page position with our own fixed-length glide (not the browser's smooth scroll, whose length and end
  // point vary by browser and distance, and on a phone could stop a pixel short and leave the wait waiting for it).
  // The glide always takes SCROLL_MS, and the wait starts the moment it ends, so the wait is exactly AUTO_ADVANCE_MS.
  // `autoTargetRef` marks the scroll as ours while it runs.
  const goToY = (target: number) => {
    window.clearTimeout(idleRef.current);
    window.cancelAnimationFrame(animRef.current);
    const from = window.scrollY;
    const dist = target - from;
    if (reduceMotion() || Math.abs(dist) < 2) {
      autoTargetRef.current = null;
      window.scrollTo(0, target);
      lastArmYRef.current = window.scrollY;
      armIdle();
      return;
    }
    autoTargetRef.current = target;
    const t0 = performance.now();
    const step = (now: number) => {
      if (autoTargetRef.current !== target) return; // the visitor took over
      const p = Math.min(1, (now - t0) / SCROLL_MS);
      window.scrollTo(0, from + dist * (1 - Math.pow(1 - p, 3))); // ease out
      if (p < 1) {
        animRef.current = window.requestAnimationFrame(step);
      } else {
        autoTargetRef.current = null;
        lastArmYRef.current = window.scrollY;
        armIdle(); // the wait starts here
      }
    };
    animRef.current = window.requestAnimationFrame(step);
  };
  // After AUTO_ADVANCE_MS with no scrolling, move on to the next stage ahead, or
  // from the last stage on to the next section.
  const armIdle = () => {
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      if (!isPinned()) return;
      if (qRef.current >= 0.999) {
        // On Home: carry on to the section after this one (its top at the top of the screen).
        const wrap = wrapRef.current;
        if (wrap) goToY(wrap.getBoundingClientRect().top + window.scrollY + wrap.offsetHeight);
        return;
      }
      goTo(Math.floor(qRef.current * LAST + 1e-6) + 1);
    }, AUTO_ADVANCE_MS);
  };

  useEffect(() => {
    if (!pinnedMode) return;
    let raf = 0;
    let arm = false; // set by a scroll event, not by a resize
    const measure = () => {
      raf = 0;
      const wrap = wrapRef.current;
      const g = geometry();
      if (!wrap || !g) return;
      const scrolled = -wrap.getBoundingClientRect().top;
      const nq = Math.min(1, Math.max(0, scrolled / g.range));
      qRef.current = nq;
      setQ(nq);
      const wasScroll = arm;
      arm = false;
      // Our own glide is not "activity" (it starts the wait itself when it ends). The visitor scrolling is: the wait
      // starts again each time the page really moves. A resize (a phone's address bar showing or hiding) or a scroll event
      // that moved nothing is not.
      if (autoTargetRef.current === null && wasScroll && Math.abs(window.scrollY - lastArmYRef.current) >= 1) {
        lastArmYRef.current = window.scrollY;
        armIdle();
      }
    };
    const onScroll = () => {
      arm = true;
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const onResize = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    // The visitor taking over: a wheel / touch / key press ends our own scroll.
    const onUser = () => {
      if (autoTargetRef.current === null) return;
      autoTargetRef.current = null;
      window.cancelAnimationFrame(animRef.current);
      armIdle(); // the visitor stopped our glide: the wait starts again from now, even if they then do not scroll
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", onUser, { passive: true });
    window.addEventListener("touchstart", onUser, { passive: true });
    window.addEventListener("keydown", onUser);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onUser);
      window.removeEventListener("touchstart", onUser);
      window.removeEventListener("keydown", onUser);
      window.clearTimeout(idleRef.current);
      window.cancelAnimationFrame(animRef.current);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedMode]);

  // Phone: as the section passes the middle of the screen, each fifth of it is
  // one step. Applied only when the scroll position crosses into a different
  // step, so a clicked step stays until the visitor scrolls on.
  useEffect(() => {
    if (pinnedMode) return;
    let raf = 0;
    let lastScrollStep = -1;
    const measure = () => {
      raf = 0;
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(0.999, Math.max(0, (window.innerHeight * 0.55 - r.top) / r.height));
      const step = Math.floor(p * STAGES.length);
      if (step !== lastScrollStep) {
        lastScrollStep = step;
        setActiveM(step);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pinnedMode]);

  // The stage nearest the scroll position (desktop) / the step in view (phone).
  const active = pinnedMode ? Math.round(q * LAST) : activeM;
  // How far along the track the line is filled, 0..1.
  const progress = pinnedMode ? q : activeM / LAST;
  const onNodeClick = (i: number) => (pinnedMode ? goTo(i) : setActiveM(i));

  const current = STAGES[active];

  return (
    <section
      ref={wrapRef}
      className={`band-dark how-it-works-band ${styles.section}${pinnedMode ? ` ${styles.pinned}` : ""}`}
      // Desktop: tall enough to scroll through all five stages while the stage below stays pinned.
      style={pinnedMode ? { height: `calc(100svh + var(--hiw-step) * ${LAST})` } : undefined}
    >
      <div ref={stickyRef} className={styles.sticky}>
      <div className="wrap">
        <div className={styles.track}>
          <div className={styles.line}>
            <div className={styles.lineFill} style={{ width: `${progress * 100}%` }} />
          </div>
          {STAGES.map((s, i) => {
            const isHome = i === LAST;
            return (
              <button
                key={s.key}
                type="button"
                className={`${styles.node} ${progress * LAST >= i - 0.02 ? styles.on : ""} ${i === active ? styles.current : ""} ${isHome ? styles.seal : ""}`}
                style={{ left: `calc(var(--inset) + (100% - 2 * var(--inset)) * ${i / LAST})` }}
                onClick={() => onNodeClick(i)}
                aria-current={i === active}
              >
                <span className={styles.dot}>
                  {isHome && (
                    <svg width="16" height="16" viewBox="0 0 420 420" fill="none" aria-hidden="true">
                      <g stroke="currentColor" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M140,150 L280,150" />
                        <path d="M210,150 L210,212" />
                        <path d="M140,300 L210,212 L280,300" />
                        <path d="M174,256 L246,256" />
                      </g>
                    </svg>
                  )}
                </span>
                <span className={styles.lab}>
                  <b>{s.label}</b>
                  {/* Captions under the stage names commented out (not deleted); restore to bring them back.
                  <i>{s.sublabel}</i>
                  */}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`grid-2 ${styles.body}`}>
          <div className={styles.illustration}>
            {STAGES.map((s, i) => (
              <img
                key={s.key}
                src={s.image}
                alt={`${s.label}: ${s.heading}`}
                className={`${styles.illustrationImg} ${i === active ? styles.illustrationImgActive : ""}`}
              />
            ))}
          </div>
          <div className={styles.copy} key={active}>
            <div className="eyebrow on-dark">
              {String(active + 1).padStart(2, "0")}: {current.label}
            </div>
            <h2 className={styles.heading} style={{ marginTop: 14 }}>
              {current.heading}
            </h2>
            <p className={`lede on-dark ${styles.lede}`} style={{ marginTop: 14 }}>
              {current.lede}
            </p>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
