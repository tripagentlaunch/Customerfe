import { useEffect } from "react";
import { Link } from "react-router-dom";
import fitData from "../data/first-international-trip.generated.json";
import type { FirstInternationalTripPageData } from "../types/first-international-trip";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./first-international-trip-page.module.css";

const data = fitData as unknown as FirstInternationalTripPageData;

export default function FirstInternationalTripPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, calm, flights, stays, signature, visa, when, cta } = data;

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
        <div className={styles.dpMeta}>
          <div className="k">{hero.metaK}</div>
          <div className="t">{hero.metaT}</div>
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

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch", marginBottom: "clamp(28px,3.4vw,46px)" }}>
            <div className="eyebrow">{calm.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.6vw,52px)" }}>{calm.heading}</h2>
          </div>
          <div className={`${styles.calm} reveal d1`}>
            {calm.cards.map((c, i) => (
              <div className="c" key={i}>
                <div className="k">{c.k}</div>
                <h4>{c.heading}</h4>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "32ch" }}>
            <div className="eyebrow">{flights.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{flights.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {flights.lede}
            </p>
          </div>
          <ol className={`${styles.idx} reveal d1`}>
            {flights.items.map((it, i) => (
              <li key={i}>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "36ch", marginBottom: 34 }}>
            <div className="eyebrow">{stays.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{stays.heading}</h2>
          </div>
          <div className="grid-2" style={{ alignItems: "start" }}>
            <div className="reveal">
              <img className="ov-img" src={stays.image ?? undefined} alt={stays.imageAlt ?? ""} loading="lazy" />
            </div>
            <div className={`reveal d1 ${styles.ovCard}`}>
              {stays.cards.map((c, i) => (
                <div className={styles.stay} key={i}>
                  <div className={styles.place}>{c.place}</div>
                  <h4>{c.heading}</h4>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{signature.by}</div>
          <p className={`${styles.pull} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.pullHtml ?? "" }} />
        </div>
      </section>

      <section className="band tight" id={visa.id ?? undefined} style={{ background: "var(--bone)" }}>
        <div className={`wrap ${styles.vrow}`}>
          <div className="reveal d1">
            <img className="ov-img" style={{ height: "clamp(300px,42vw,520px)" }} src={visa.image ?? undefined} alt={visa.imageAlt ?? ""} loading="lazy" />
          </div>
          <div className="reveal">
            <div className="eyebrow">{visa.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{visa.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {visa.lede}
            </p>
            <ul className={styles.cpLines}>
              {visa.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{when.eyebrow}</div>
          <div className="rule center reveal d1" />
          <p className={`${styles.when} reveal d1`} style={{ margin: "18px auto 0" }}>
            {when.text}
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
