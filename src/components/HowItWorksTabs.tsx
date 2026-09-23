import { useEffect, useState } from "react";
import { HOW_IT_WORKS_STAGES as STAGES } from "../data/how-it-works-stages";
import styles from "./HowItWorksTabs.module.css";

const INTERVAL_MS = 6000;
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
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % STAGES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  const current = STAGES[active];

  return (
    <section className={`band-dark band how-it-works-band ${styles.section}`}>
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
                style={{ left: `${(i / LAST) * 100}%` }}
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
          <div className={styles.copy}>
            <div className="eyebrow on-dark">
              {String(active + 1).padStart(2, "0")} — {current.label}
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
