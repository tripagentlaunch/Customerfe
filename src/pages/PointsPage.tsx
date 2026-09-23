import { useEffect } from "react";
import { Link } from "react-router-dom";
import pointsData from "../data/points.generated.json";
import type { PointsPageData } from "../types/points";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./points-page.module.css";

const data = pointsData as unknown as PointsPageData;

export default function PointsPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, howItWorks, worked, whatWorks, transparency, faq, cta } = data;

  return (
    <main>
      <header className="hero hero-ed" style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "55% 50%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 className="display" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 24 }}>
              {hero.lede}
            </p>
          </div>
        </div>
        <div className={styles.heroMeta}>
          <span className="k">{hero.metaK}</span>
          <span className="t">{hero.metaT}</span>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className="band">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{howItWorks.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,3.6vw,54px)" }} dangerouslySetInnerHTML={{ __html: howItWorks.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 18 }}>
              {howItWorks.lede}
            </p>
          </div>
          <div className="reveal d2">
            <div className="steps">
              {howItWorks.steps.map((s, i) => (
                <div className="step" key={i}>
                  <div className="si">{s.n}</div>
                  <div>
                    <h4>{s.heading}</h4>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{worked.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }} dangerouslySetInnerHTML={{ __html: worked.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 18 }}>
              {worked.lede}
            </p>
            <div className={styles.ptsSplit} aria-hidden="true">
              <i className={styles.spPts} style={{ width: worked.splitPtsWidth }} />
              <i className={styles.spCard} style={{ width: worked.splitCardWidth }} />
            </div>
            <div className={styles.ptsKey}>
              <span className={styles.kPts}>{worked.keyPts}</span>
              <span className={styles.kCard}>{worked.keyCard}</span>
            </div>
          </div>
          <div className="reveal d2">
            <div className={styles.exCard}>
              <div className={styles.exTag}>{worked.tag}</div>
              <div className={styles.exRoute}>{worked.route}</div>
              <div className={styles.exFare}>{worked.fare}</div>
              <ul className={styles.exRows}>
                {worked.rows.map((r, i) => (
                  <li className={r.total ? styles.tot : undefined} key={i}>
                    <span className="lbl">{r.label}</span>
                    <span className={styles.val}>{r.value}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.exNote}>{worked.note}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "24px 40px", marginBottom: 48 }}>
            <div style={{ maxWidth: "30ch" }}>
              <div className="eyebrow">{whatWorks.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ maxWidth: "18ch" }}>{whatWorks.heading}</h2>
            </div>
            <p className="lede" style={{ maxWidth: "42ch" }}>
              {whatWorks.lede}
            </p>
          </div>
          <div className={`${styles.works} reveal d2`}>
            {whatWorks.tiles.map((t, i) => (
              <div className={styles.workTile} key={i}>
                <div className={styles.wtH}>{t.heading}</div>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
          <p className="muted reveal" style={{ fontSize: 13, textAlign: "center", marginTop: 26, maxWidth: "60ch", marginLeft: "auto", marginRight: "auto" }}>
            {whatWorks.note}
          </p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 48 }}>
            <div className="eyebrow reveal">{transparency.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: transparency.headingHtml ?? "" }} />
          </div>
          <div className={styles.trustGrid}>
            {transparency.columns.map((col, i) => (
              <ul className={`incl reveal ${i === 0 ? "d2" : "d3"}`} style={{ margin: 0, maxWidth: "none" }} key={i}>
                {col.map((item, j) => (
                  <li key={j}>
                    <span className="ck">✦</span>
                    <span dangerouslySetInnerHTML={{ __html: item ?? "" }} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="center" style={{ marginBottom: 40 }}>
            <div className="eyebrow reveal">{faq.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1">{faq.heading}</h2>
          </div>
          <div className="faq reveal d2">
            {faq.items.map((it, i) => (
              <details key={i} open={it.open || undefined}>
                <summary>{it.summary}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
        <div className="wrap">
          <h2 className="reveal d1" style={{ fontSize: "clamp(34px,5vw,68px)" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ margin: "18px auto 30px", maxWidth: "48ch" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d3">
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold on-dark" : "btn btn-ghost on-dark"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
