import { useEffect, useRef, useState } from "react";
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
export default function HowItWorksTabs() {
  // One `active` step drives the track highlight, the image and the copy
  // together. It changes only on scroll or click — no timer (2026-10-14,
  // direct request: a 6s auto-advance, plus copy that switched instantly
  // while the image and dots were still fading, left the highlight and the
  // text on different steps).
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);

  // Scrolling through the section steps through the stages: as the section
  // passes the middle of the screen, each fifth of it is one step. Applied
  // only when the scroll position crosses into a different step, so a
  // clicked step stays until the visitor scrolls on.
  useEffect(() => {
    let raf = 0;
    let lastScrollStep = -1;
    const measure = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(0.999, Math.max(0, (window.innerHeight * 0.55 - r.top) / r.height));
      const step = Math.floor(p * STAGES.length);
      if (step !== lastScrollStep) {
        lastScrollStep = step;
        setActive(step);
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
  }, []);

  const current = STAGES[active];

  return (
    <section ref={sectionRef} className={`band-dark band how-it-works-band ${styles.section}`}>
      <div className="wrap">
        <div className={styles.track}>
          <div className={styles.line}>
            <div className={styles.lineFill} style={{ width: `${(active / LAST) * 100}%` }} />
          </div>
          {STAGES.map((s, i) => {
            const isHome = i === LAST;
            return (
              <button
                key={s.key}
                type="button"
                className={`${styles.node} ${i <= active ? styles.on : ""} ${i === active ? styles.current : ""} ${isHome ? styles.seal : ""}`}
                style={{ left: `calc(var(--inset) + (100% - 2 * var(--inset)) * ${i / LAST})` }}
                onClick={() => setActive(i)}
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
                  <i>{s.sublabel}</i>
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
    </section>
  );
}
