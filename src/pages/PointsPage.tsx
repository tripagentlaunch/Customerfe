import { useEffect } from "react";
import pointsData from "../data/points.generated.json";
import type { PointsPageData } from "../types/points";
import { useScrollReveal } from "../lib/useScrollReveal";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./points-page.module.css";

const data = pointsData as unknown as PointsPageData;

// Design refresh (2026-11-13, direct request): same treatment as the other service pages (shared rf-* styles).
export default function PointsPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, howItWorks, worked, whatWorks, transparency, faq, cta } = data;

  return (
    <main>
      <header className="rf-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,6,5,.82) 0%, rgba(8,6,5,.6) 45%, rgba(8,6,5,.4) 100%), url('${hero.image}')` }}>
        <div className="wrap">
          <div className="rf-hero-copy">
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className="btn-row rf-hero-btns reveal d3">
              <PrimaryInverseButton to="destinations.html">Find my trip</PrimaryInverseButton>
              <SecondaryInverseButton to="concierge.html">Chat with us</SecondaryInverseButton>
            </div>
          </div>
        </div>
      </header>

      <section className="band">
        <div className="wrap">
          <div className="rf-head reveal">
            <div className="eyebrow">{howItWorks.eyebrow}</div>
            <div className="rule" />
            <h2 dangerouslySetInnerHTML={{ __html: howItWorks.headingHtml ?? "" }} />
            <p className="lede">{howItWorks.lede}</p>
          </div>
          <div className="rf-steps reveal d1">
            {howItWorks.steps.map((st, i) => (
              <div className="rf-step" key={i}>
                <div className="rf-step-n">{st.n}</div>
                <h4>{st.heading}</h4>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap rf-split rev">
          <div className="reveal">
            <div className="eyebrow">{worked.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,44px)" }} dangerouslySetInnerHTML={{ __html: worked.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 16 }}>
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
          <div className="reveal d1">
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
          <div className="rf-head reveal">
            <div className="eyebrow">{whatWorks.eyebrow}</div>
            <div className="rule" />
            <h2>{whatWorks.heading}</h2>
            <p className="lede">{whatWorks.lede}</p>
          </div>
          <div className="rf-tiles reveal d1">
            {whatWorks.tiles.map((t, i) => (
              <div className="rf-tile" key={i}>
                <h3>{t.heading}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
          <p className="rf-note reveal">{whatWorks.note}</p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="rf-head reveal">
            <div className="eyebrow">{transparency.eyebrow}</div>
            <div className="rule" />
            <h2 dangerouslySetInnerHTML={{ __html: transparency.headingHtml ?? "" }} />
          </div>
          <div className="rf-tiles reveal d1" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {transparency.columns.map((col, i) => (
              <div className="rf-tile" key={i}>
                <ul className="rf-checks" style={{ margin: 0 }}>
                  {col.map((item, j) => (
                    <li key={j}>
                      <span aria-hidden="true">✓</span>
                      <span dangerouslySetInnerHTML={{ __html: item ?? "" }} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="rf-head reveal">
            <div className="eyebrow">{faq.eyebrow}</div>
            <div className="rule" />
            <h2>{faq.heading}</h2>
          </div>
          <div className="rf-faq faq reveal d1">
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
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0", maxWidth: "48ch" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d3" style={{ marginTop: 28 }}>
            <PrimaryInverseButton to="concierge.html">Plan a trip</PrimaryInverseButton>
          </div>
        </div>
      </section>
    </main>
  );
}
