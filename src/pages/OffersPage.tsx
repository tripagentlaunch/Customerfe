import { useEffect } from "react";
import { Link } from "react-router-dom";
import offersData from "../data/offers.generated.json";
import type { OffersPageData } from "../types/offers";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./offers-page.module.css";

const data = offersData as unknown as OffersPageData;

export default function OffersPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, features, value, cta } = data;

  return (
    <>
      <header
        className="hero hero-ed"
        style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "60% 50%" }}
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
        <section className="band center tight">
          <div className="wrap">
            <p className="lede reveal" style={{ maxWidth: "60ch", margin: "0 auto" }}>
              {intro}
            </p>
          </div>
        </section>

        {features.map((f, i) => (
          <section
            className={`band${i === 1 ? " tight" : ""}`}
            style={i === 1 ? { background: "var(--bone)" } : undefined}
            id={f.id ?? undefined}
            key={f.id ?? i}
          >
            <div className="wrap grid-2" style={f.imageFirst ? { direction: "rtl" } : undefined}>
              <div className="reveal" style={f.imageFirst ? { direction: "ltr" } : undefined}>
                <div className="eyebrow">{f.eyebrow}</div>
                <div className="rule" />
                <h2 style={{ fontSize: "clamp(30px,3.6vw,54px)" }} dangerouslySetInnerHTML={{ __html: f.headingHtml ?? "" }} />
                <p className="lede" style={{ marginTop: 18 }}>
                  {f.lede}
                </p>
                <ul className="incl" style={{ marginTop: 24, maxWidth: "none" }}>
                  {f.items.map((it, j) => (
                    <li key={j}>
                      <span className="ck">✦</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="reveal d2" style={f.imageFirst ? { direction: "ltr" } : undefined}>
                <img className="of-img" src={f.image ?? undefined} alt={f.imageAlt ?? ""} loading="lazy" />
              </div>
            </div>
          </section>
        ))}

        <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${value.image}')` }}>
          <div className="wrap">
            <div className="eyebrow on-dark reveal">{value.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ maxWidth: "24ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: value.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0", maxWidth: "56ch" }}>
              {value.lede}
            </p>
          </div>
        </section>

        <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
          <div className="wrap">
            <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ fontSize: "clamp(34px,5vw,72px)" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
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
    </>
  );
}
