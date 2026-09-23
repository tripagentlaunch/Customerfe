import { useEffect } from "react";
import { Link } from "react-router-dom";
import cabinGuideData from "../data/cabin-guide.generated.json";
import type { CabinGuidePageData } from "../types/cabin-guide";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./cabin-guide-page.module.css";

const data = cabinGuideData as unknown as CabinGuidePageData;

export default function CabinGuidePage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, glossary, vrow, signature, traps, ask, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.dpHero}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "60% 50%" }}>
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

      <section className="band tight" style={{ background: "var(--bone)" }} id={glossary.id}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch", marginBottom: 30 }}>
            <div className="eyebrow">{glossary.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,56px)" }}>{glossary.heading}</h2>
          </div>
          <div className={`${styles.gloss} reveal d1`}>
            {glossary.cards.map((c, i) => (
              <div className={styles.gcard} key={i}>
                <div className={styles.term}>{c.term}</div>
                <h3>{c.heading}</h3>
                <div dangerouslySetInnerHTML={{ __html: c.bodyHtml ?? "" }} />
              </div>
            ))}
          </div>
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
            <img className="ov-img" src={vrow.image ?? undefined} alt={vrow.imageAlt ?? ""} loading="lazy" />
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{signature.by}</div>
          <p className={`${styles.pull} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.pullHtml ?? "" }} />
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "32ch" }}>
            <div className="eyebrow">{traps.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{traps.heading}</h2>
          </div>
          <ol className={`${styles.idx} reveal d1`}>
            {traps.items.map((it, i) => (
              <li key={i}>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{ask.eyebrow}</div>
          <div className="rule center reveal d1" />
          <p className={`${styles.when} reveal d1`} style={{ margin: "18px auto 0" }}>
            {ask.text}
          </p>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "24ch", margin: "0 auto" }}>
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
