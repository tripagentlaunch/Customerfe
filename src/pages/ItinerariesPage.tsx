import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import itinerariesData from "../data/itineraries.generated.json";
import type { ItinerariesPageData } from "../types/itineraries";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./itineraries-page.module.css";

const data = itinerariesData as unknown as ItinerariesPageData;

export default function ItinerariesPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, journeys, quote, reassurance, cta } = data;

  return (
    <>
      <header
        className="hero hero-ed"
        style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "55% 40%" }}
      >
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

      <main>
        {journeys.map((j, i) => (
          <Fragment key={i}>
            <section
              className={`band ${styles.jrn}`}
              style={j.bone ? { background: "var(--bone)" } : undefined}
            >
              <div className="wrap grid-2" style={j.imageFirst ? { direction: "rtl" } : undefined}>
                <div className={`reveal d2 ${styles.picCol}`} style={j.imageFirst ? { direction: "ltr" } : undefined}>
                  <div className="pic" style={{ backgroundImage: `url('${j.image}')` }} />
                </div>
                <div className="reveal" style={j.imageFirst ? { direction: "ltr" } : undefined}>
                  <div className="eyebrow">{j.eyebrow}</div>
                  <div className="rule" />
                  <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }} dangerouslySetInnerHTML={{ __html: j.headingHtml ?? "" }} />
                  <p className={styles.jrnMood}>{j.mood}</p>
                  <ul className={styles.handles}>
                    {j.handles.map((h, k) => (
                      <li key={k}>
                        <span className={styles.hl}>{h.label}</span>
                        <span className={styles.ht} dangerouslySetInnerHTML={{ __html: h.html ?? "" }} />
                      </li>
                    ))}
                  </ul>
                  <div className={styles.note}>
                    <span className={styles.nl}>{j.noteLabel}</span>
                    <p>"{j.noteQuote}"</p>
                  </div>
                  <div className={styles.from} dangerouslySetInnerHTML={{ __html: j.fromHtml ?? "" }} />
                </div>
              </div>
            </section>
            {i === 2 && (
              <section className="band tight" key="quote">
                <div className="wrap">
                  <div className="pq reveal">
                    <p>{quote}</p>
                  </div>
                </div>
              </section>
            )}
          </Fragment>
        ))}

        <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${reassurance.image}')` }}>
          <div className="wrap">
            <div className="eyebrow on-dark reveal">{reassurance.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ maxWidth: "24ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: reassurance.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
              {reassurance.lede}
            </p>
          </div>
        </section>

        <section className="band">
          <div className="wrap grid-2" style={{ alignItems: "center" }}>
            <div className="reveal">
              <div className="eyebrow">{cta.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(32px,4.2vw,62px)", maxWidth: "14ch" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
            </div>
            <div className="reveal d1">
              <p className="lede" style={{ maxWidth: "42ch" }}>
                {cta.lede}
              </p>
              <div className="btn-row" style={{ marginTop: 28 }}>
                {cta.buttons.map((b, i) => (
                  <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} to={toRoute(b.href)} key={i}>
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
