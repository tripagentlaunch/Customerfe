import { useState } from "react";
import { Link } from "react-router-dom";
import compareData from "../data/compare.generated.json";
import type { ComparePageData } from "../types/compare";
import { useNavVariant } from "../lib/navVariant";
import { TaraAI } from "../components/TaraAI";
import styles from "./compare-page.module.css";

const data = compareData as unknown as ComparePageData;

// The picker (3 destination selects + month/who context) is static and
// portable, but choosing destinations triggers a real weighted scoring
// engine (season/flight/visa/who/budget/safety) reading
// data/city-decision.json — the same real app as where-to-go.html, not
// dead code. Per the shell-only-defer-logic decision, the selects hold
// real state, but the comparison output itself is deferred.
export default function ComparePage() {
  useNavVariant("solid");
  const [picks, setPicks] = useState(["", "", ""]);
  const anyPicked = picks.some(Boolean);

  function setPick(i: number, value: string) {
    setPicks((prev) => prev.map((p, j) => (j === i ? value : p)));
  }

  return (
    <>
      <header className={styles.cmpHero}>
        <div className="wrap">
          <div className="eyebrow">{data.hero.eyebrow}</div>
          <h1 dangerouslySetInnerHTML={{ __html: data.hero.headingHtml ?? "" }} />
          <p>{data.hero.lede}</p>
        </div>
      </header>
      <main>
        <div className={styles.cmpWrap}>
          <div className={styles.cmpPick}>
            {[data.placeholders.c0, data.placeholders.c1, data.placeholders.c2].map((placeholder, i) => (
              <select
                key={i}
                id={`c${i}`}
                aria-label={`${i === 2 ? "Third" : i === 1 ? "Second" : "First"} destination to compare`}
                value={picks[i]}
                onChange={(e) => setPick(i, e.target.value)}
              >
                <option value="">{placeholder}</option>
                {data.cityOptions.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ))}
          </div>

          {anyPicked && (
            <div className={styles.cmpCtx}>
              <span className={styles.cmpCtxLab}>{data.ctx.label}</span>
              <div className={styles.cmpCtxGrp}>
                <label htmlFor="cmpMonth" className={styles.cmpCtxLab} style={{ letterSpacing: ".04em", textTransform: "none", fontWeight: 500, color: "var(--ink-soft)" }}>
                  {data.ctx.monthLabel}
                </label>
                <select id="cmpMonth" aria-label="Which month you're travelling" defaultValue="0">
                  {data.ctx.monthOptions.map((o) => (
                    <option value={o.value} key={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.cmpCtxGrp}>
                <label htmlFor="cmpWho" className={styles.cmpCtxLab} style={{ letterSpacing: ".04em", textTransform: "none", fontWeight: 500, color: "var(--ink-soft)" }}>
                  {data.ctx.whoLabel}
                </label>
                <select id="cmpWho" aria-label="Who's travelling" defaultValue="">
                  {data.ctx.whoOptions.map((o) => (
                    <option value={o.value} key={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {anyPicked && (
            <div className={styles.cmpNotlive}>
              <p>Side-by-side comparison is on its way. Meanwhile, tell your advisor the places you're weighing and they'll compare them with you.</p>
              <Link to="/enquire">
                Talk to <TaraAI />
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
