import { useEffect } from "react";
import { Link } from "react-router-dom";
import villaData from "../data/villa-or-hotel.generated.json";
import type { VillaOrHotelPageData } from "../types/villa-or-hotel";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./villa-or-hotel-page.module.css";

const data = villaData as unknown as VillaOrHotelPageData;

export default function VillaOrHotelPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, compare, signature, vrow, line, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.dpHero}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "55% 50%" }}>
        <div className="wrap hero-inner">
          <div className={styles.dpCopy}>
            <Link className="cta on-dark reveal" to={toRoute(hero.back.href)} style={{ marginBottom: 20 }}>
              ← {hero.back.label}
            </Link>
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className={`${styles.dpCta} reveal d2`}>
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaGold.href)}>
                {hero.ctaGold.label}
              </Link>
              <a className="cta on-dark" href={hero.ctaText.href}>
                {hero.ctaText.label}
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="band">
        <div className="wrap editorial">
          <div className="ed-grid">
            <div className="ed-meta reveal">
              <div className="eyebrow">{intro.eyebrow}</div>
              <p className="ed-note">{intro.note}</p>
            </div>
            <div className="reveal d1">
              <p className="ed-statement">{intro.statement}</p>
              <p className="lede" style={{ marginTop: 22 }}>
                {intro.lede}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }} id={compare.id}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch" }}>
            <div className="eyebrow">{compare.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{compare.heading}</h2>
          </div>
          <div className={`${styles.cmp} reveal d1`}>
            {compare.cols.map((c, i) => (
              <div className={styles.col} key={i}>
                <div className={styles.kch}>{c.kch}</div>
                <h3>{c.heading}</h3>
                <ul>
                  {c.items.map((it, j) => (
                    <li key={j}>
                      <span className="ck">✦</span>
                      <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{signature.by}</div>
          <p className={`${styles.pull} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.pullHtml ?? "" }} />
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.vrow}`}>
          <div className="reveal">
            <div className="eyebrow">{vrow.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{vrow.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {vrow.lede}
            </p>
            <ul className={styles.cpLines}>
              {vrow.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal d1">
            <div className="ov-img" style={{ backgroundImage: `url('${vrow.image}')` }} />
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap center">
          <div className="eyebrow reveal">{line.eyebrow}</div>
          <div className="rule center reveal d1" />
          <p className={`${styles.when} reveal d1`} style={{ margin: "18px auto 0" }}>
            {line.text}
          </p>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }}>
            {cta.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
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
